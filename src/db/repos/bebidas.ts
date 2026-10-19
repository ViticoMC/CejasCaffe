import type { SQLiteDatabase } from 'expo-sqlite';
import { eliminarArchivos } from '../../fotos/almacen';
import { calcularPrecioVenta } from '../../domain/calculos';
import type { Bebida, ItemReceta, NuevaBebida } from '../../domain/tipos';
import { eliminarFotosDeBebida } from './bebidas_fotos';

type BebidaRow = Omit<Bebida, 'activo'> & { activo: 0 | 1 };

function mapearBebida(row: BebidaRow): Bebida {
  return { ...row, activo: row.activo === 1 };
}

export async function listarBebidas(db: SQLiteDatabase): Promise<Bebida[]> {
  const filas = await db.getAllAsync<BebidaRow>('SELECT * FROM bebidas ORDER BY nombre ASC');
  return filas.map(mapearBebida);
}

export async function obtenerBebida(
  db: SQLiteDatabase,
  id: number
): Promise<Bebida | null> {
  const fila = await db.getFirstAsync<BebidaRow>('SELECT * FROM bebidas WHERE id = ?', id);
  return fila ? mapearBebida(fila) : null;
}

export async function obtenerReceta(
  db: SQLiteDatabase,
  bebidaId: number
): Promise<ItemReceta[]> {
  return db.getAllAsync<ItemReceta>(
    `SELECT bi.id, bi.bebida_id, bi.ingrediente_id, bi.cantidad,
            i.nombre AS nombre_ingrediente, i.unidad, i.precio_unitario
     FROM bebida_ingredientes bi
     JOIN ingredientes i ON i.id = bi.ingrediente_id
     WHERE bi.bebida_id = ?
     ORDER BY i.nombre ASC`,
    bebidaId
  );
}

export async function crearBebida(
  db: SQLiteDatabase,
  dato: NuevaBebida
): Promise<Bebida> {
  let bebidaId = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const resultado = await txn.runAsync(
      'INSERT INTO bebidas (nombre, descripcion, porcentaje_ganancia, activo) VALUES (?, ?, ?, ?)',
      dato.nombre.trim(),
      dato.descripcion?.trim() || null,
      dato.porcentaje_ganancia,
      dato.activo === false ? 0 : 1
    );
    bebidaId = resultado.lastInsertRowId;
    await insertarReceta(txn, bebidaId, dato.receta);
    const costo = await recalcularCostoProduccion(txn, bebidaId);
    await txn.runAsync(
      'UPDATE bebidas SET precio_venta = ? WHERE id = ?',
      calcularPrecioVenta(costo, dato.porcentaje_ganancia),
      bebidaId
    );
  });
  const bebida = await obtenerBebida(db, bebidaId);
  if (!bebida) {
    throw new Error('No se pudo crear la bebida');
  }
  return bebida;
}

export async function actualizarBebida(
  db: SQLiteDatabase,
  id: number,
  dato: NuevaBebida
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "UPDATE bebidas SET nombre = ?, descripcion = ?, porcentaje_ganancia = ?, activo = COALESCE(?, activo), actualizado_en = datetime('now') WHERE id = ?",
      dato.nombre.trim(),
      dato.descripcion?.trim() || null,
      dato.porcentaje_ganancia,
      dato.activo == null ? null : dato.activo ? 1 : 0,
      id
    );
    await txn.runAsync('DELETE FROM bebida_ingredientes WHERE bebida_id = ?', id);
    await insertarReceta(txn, id, dato.receta);
    await recalcularCostoProduccion(txn, id);
  });
}

export async function actualizarPrecioVentaBebida(
  db: SQLiteDatabase,
  id: number
): Promise<void> {
  const fila = await db.getFirstAsync<{
    costo_produccion: number;
    porcentaje_ganancia: number;
  }>('SELECT costo_produccion, porcentaje_ganancia FROM bebidas WHERE id = ?', id);
  if (!fila) return;
  await db.runAsync(
    "UPDATE bebidas SET precio_venta = ?, actualizado_en = datetime('now') WHERE id = ?",
    calcularPrecioVenta(fila.costo_produccion, fila.porcentaje_ganancia),
    id
  );
}

async function recalcularCostoProduccion(
  txn: SQLiteDatabase,
  bebidaId: number
): Promise<number> {
  await txn.runAsync(
    `UPDATE bebidas
     SET costo_produccion = (
       SELECT COALESCE(ROUND(SUM(bi.cantidad * i.precio_unitario), 2), 0)
       FROM bebida_ingredientes bi
       JOIN ingredientes i ON i.id = bi.ingrediente_id
       WHERE bi.bebida_id = ?
     )
     WHERE id = ?`,
    bebidaId,
    bebidaId
  );
  const fila = await txn.getFirstAsync<{ costo_produccion: number }>(
    'SELECT costo_produccion FROM bebidas WHERE id = ?',
    bebidaId
  );
  return fila?.costo_produccion ?? 0;
}

export async function eliminarBebida(db: SQLiteDatabase, id: number): Promise<void> {
  let archivos: string[] = [];
  await db.withExclusiveTransactionAsync(async (txn) => {
    archivos = await eliminarFotosDeBebida(txn, id);
    await txn.runAsync('DELETE FROM bebidas WHERE id = ?', id);
  });
  eliminarArchivos(archivos);
}

export async function cambiarActivoBebida(
  db: SQLiteDatabase,
  id: number,
  activo: boolean
): Promise<void> {
  await db.runAsync(
    "UPDATE bebidas SET activo = ?, actualizado_en = datetime('now') WHERE id = ?",
    activo ? 1 : 0,
    id
  );
}

async function insertarReceta(
  txn: SQLiteDatabase,
  bebidaId: number,
  receta: NuevaBebida['receta']
): Promise<void> {
  for (const item of receta) {
    await txn.runAsync(
      'INSERT INTO bebida_ingredientes (bebida_id, ingrediente_id, cantidad) VALUES (?, ?, ?)',
      bebidaId,
      item.ingrediente_id,
      item.cantidad
    );
  }
}
