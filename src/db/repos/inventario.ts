import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  AjusteInventario,
  EntradaInventario,
  Ingrediente,
  ItemMovimiento,
  MovimientoInventario,
} from '../../domain/tipos';

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

    const motivo = dato.motivo?.trim() || null;
    const nombre = motivo ?? `Compra de ${ingrediente.nombre}`;
    const descripcion = `Entrada de ${dato.cantidad} ${ingrediente.unidad} de ${ingrediente.nombre}`;

    const resultado = await txn.runAsync(
      `INSERT INTO inversiones (nombre, descripcion, precio, ingrediente_id, cantidad)
       VALUES (?, ?, ?, ?, ?)`,
      nombre,
      descripcion,
      dato.costoTotal,
      dato.ingrediente_id,
      dato.cantidad
    );

    await txn.runAsync(
      `INSERT INTO movimientos_inventario (ingrediente_id, tipo, cantidad, motivo, inversion_id)
       VALUES (?, 'entrada', ?, ?, ?)`,
      dato.ingrediente_id,
      dato.cantidad,
      motivo,
      resultado.lastInsertRowId
    );

    await txn.runAsync(
      "UPDATE ingredientes SET stock = stock + ?, actualizado_en = datetime('now') WHERE id = ?",
      dato.cantidad,
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
            m.venta_id, m.inversion_id, m.creado_en,
            i.nombre AS nombre_ingrediente, i.unidad
     FROM movimientos_inventario m
     JOIN ingredientes i ON i.id = m.ingrediente_id
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
