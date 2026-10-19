import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  AjusteInventario,
  EntradaInventario,
  Ingrediente,
  ItemMovimiento,
  MovimientoInventario,
} from '../../domain/tipos';
import { actualizarPaquete, obtenerPaquete } from './paquetes';

export interface ItemInventario extends Ingrediente {
  bajo: boolean;
  valor: number;
}

export async function listarInventario(db: SQLiteDatabase): Promise<ItemInventario[]> {
  const filas = await db.getAllAsync<Ingrediente>(
    'SELECT * FROM ingredientes ORDER BY nombre ASC'
  );
  return filas.map((fila) => ({
    ...fila,
    bajo: fila.stock <= fila.stock_minimo,
    valor: Math.round((fila.stock * fila.precio_unitario + Number.EPSILON) * 100) / 100,
  }));
}

export async function registrarEntrada(
  db: SQLiteDatabase,
  dato: EntradaInventario
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const ingrediente = await txn.getFirstAsync<Ingrediente>(
      'SELECT * FROM ingredientes WHERE id = ?',
      dato.ingrediente_id
    );
    if (!ingrediente) {
      throw new Error('Material no encontrado');
    }

    let cantidad = 0;
    let costoTotal = 0;
    let paqueteId: number | null = null;
    let descripcion: string;
    let nombreEntrada: string;

    if ('paquete_id' in dato) {
      const paquete = await obtenerPaquete(txn, dato.paquete_id);
      if (!paquete || paquete.ingrediente_id !== dato.ingrediente_id) {
        throw new Error('Paquete no encontrado');
      }
      if (!Number.isFinite(dato.paquetes) || dato.paquetes <= 0) {
        throw new Error('La cantidad de paquetes debe ser mayor a 0');
      }
      const precioPaquete = dato.precioPaquete ?? paquete.precio;
      if (precioPaquete !== paquete.precio) {
        await actualizarPaquete(txn, paquete.id, {
          nombre: paquete.nombre,
          cantidad: paquete.cantidad,
          precio: precioPaquete,
        });
      }
      cantidad = dato.paquetes * paquete.cantidad;
      costoTotal = dato.paquetes * precioPaquete;
      paqueteId = paquete.id;
      nombreEntrada = `Compra de ${dato.paquetes} × ${paquete.nombre}`;
      descripcion = `${dato.paquetes} × ${paquete.nombre} = ${cantidad} ${ingrediente.unidad.trim()}`;
    } else {
      cantidad = dato.cantidad;
      costoTotal = dato.costoTotal;
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error('La cantidad debe ser mayor a 0');
      }
      if (!Number.isFinite(costoTotal) || costoTotal <= 0) {
        throw new Error('El costo debe ser mayor a 0');
      }
      nombreEntrada = `Compra de ${ingrediente.nombre}`;
      descripcion = `Entrada de ${cantidad} ${ingrediente.unidad.trim()} de ${ingrediente.nombre}`;
    }

    const motivo = dato.motivo?.trim() || null;
    const nombre = motivo ?? nombreEntrada;

    const resultado = await txn.runAsync(
      `INSERT INTO inversiones (nombre, descripcion, precio, ingrediente_id, cantidad)
       VALUES (?, ?, ?, ?, ?)`,
      nombre,
      descripcion,
      costoTotal,
      dato.ingrediente_id,
      cantidad
    );

    // El INSERT del movimiento debe ir antes del UPDATE de stock:
    // el trigger trg_precio_por_entrada promedia con el stock vigente.
    await txn.runAsync(
      `INSERT INTO movimientos_inventario (ingrediente_id, tipo, cantidad, motivo, inversion_id, paquete_id)
       VALUES (?, 'entrada', ?, ?, ?, ?)`,
      dato.ingrediente_id,
      cantidad,
      motivo,
      resultado.lastInsertRowId,
      paqueteId
    );

    await txn.runAsync(
      "UPDATE ingredientes SET stock = stock + ?, actualizado_en = datetime('now') WHERE id = ?",
      cantidad,
      dato.ingrediente_id
    );
  });
}

export async function registrarAjuste(
  db: SQLiteDatabase,
  dato: AjusteInventario
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const ingrediente = await txn.getFirstAsync<Ingrediente>(
      'SELECT * FROM ingredientes WHERE id = ?',
      dato.ingrediente_id
    );
    if (!ingrediente) {
      throw new Error('Material no encontrado');
    }

    const delta = Math.round((dato.cantidadNueva - ingrediente.stock + Number.EPSILON) * 100) / 100;
    if (delta === 0) {
      return;
    }

    await txn.runAsync(
      `INSERT INTO movimientos_inventario (ingrediente_id, tipo, cantidad, motivo)
       VALUES (?, 'ajuste', ?, ?)`,
      dato.ingrediente_id,
      Math.abs(delta),
      dato.motivo?.trim() || null
    );

    await txn.runAsync(
      "UPDATE ingredientes SET stock = ?, actualizado_en = datetime('now') WHERE id = ?",
      dato.cantidadNueva,
      dato.ingrediente_id
    );
  });
}

export async function actualizarStockMinimo(
  db: SQLiteDatabase,
  id: number,
  stockMinimo: number
): Promise<void> {
  await db.runAsync(
    "UPDATE ingredientes SET stock_minimo = ?, actualizado_en = datetime('now') WHERE id = ?",
    stockMinimo,
    id
  );
}

export async function listarMovimientos(
  db: SQLiteDatabase,
  ingredienteId?: number
): Promise<ItemMovimiento[]> {
  const where = ingredienteId != null ? 'WHERE m.ingrediente_id = ?' : '';
  const parametros = ingredienteId != null ? [ingredienteId] : [];
  return db.getAllAsync<ItemMovimiento>(
    `SELECT m.id, m.ingrediente_id, m.tipo, m.cantidad, m.motivo,
            m.venta_id, m.inversion_id, m.paquete_id, m.creado_en,
            i.nombre AS nombre_ingrediente, i.unidad,
            p.nombre AS nombre_paquete
     FROM movimientos_inventario m
     JOIN ingredientes i ON i.id = m.ingrediente_id
     LEFT JOIN paquetes p ON p.id = m.paquete_id
     ${where}
     ORDER BY m.creado_en DESC, m.id DESC`,
    ...parametros
  );
}

export async function aplicarSalidaVenta(
  txn: SQLiteDatabase,
  ventaId: number,
  consumos: { ingrediente_id: number; cantidad: number }[]
): Promise<void> {
  for (const consumo of consumos) {
    if (consumo.cantidad <= 0) continue;
    await txn.runAsync(
      `INSERT INTO movimientos_inventario (ingrediente_id, tipo, cantidad, motivo, venta_id)
       VALUES (?, 'salida', ?, 'Venta', ?)`,
      consumo.ingrediente_id,
      consumo.cantidad,
      ventaId
    );
    await txn.runAsync(
      "UPDATE ingredientes SET stock = stock - ?, actualizado_en = datetime('now') WHERE id = ?",
      consumo.cantidad,
      consumo.ingrediente_id
    );
  }
}

export async function revertirMovimientosVenta(
  txn: SQLiteDatabase,
  ventaId: number
): Promise<void> {
  const movimientos = await txn.getAllAsync<MovimientoInventario>(
    "SELECT * FROM movimientos_inventario WHERE venta_id = ? AND tipo = 'salida'",
    ventaId
  );
  for (const movimiento of movimientos) {
    await txn.runAsync(
      "UPDATE ingredientes SET stock = stock + ?, actualizado_en = datetime('now') WHERE id = ?",
      movimiento.cantidad,
      movimiento.ingrediente_id
    );
  }
  await txn.runAsync('DELETE FROM movimientos_inventario WHERE venta_id = ?', ventaId);
}

export async function revertirEntradaPorInversion(
  txn: SQLiteDatabase,
  inversionId: number
): Promise<void> {
  const movimientos = await txn.getAllAsync<MovimientoInventario>(
    "SELECT * FROM movimientos_inventario WHERE inversion_id = ? AND tipo = 'entrada'",
    inversionId
  );
  for (const movimiento of movimientos) {
    await txn.runAsync(
      "UPDATE ingredientes SET stock = stock - ?, actualizado_en = datetime('now') WHERE id = ?",
      movimiento.cantidad,
      movimiento.ingrediente_id
    );
  }
  await txn.runAsync('DELETE FROM movimientos_inventario WHERE inversion_id = ?', inversionId);
}
