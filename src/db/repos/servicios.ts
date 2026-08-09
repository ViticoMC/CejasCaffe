import type { SQLiteDatabase } from 'expo-sqlite';
import type { ItemServicioMaterial, NuevoServicio, Servicio } from '../../domain/tipos';

type ServicioRow = Omit<Servicio, 'activo'> & { activo: 0 | 1 };

function mapearServicio(row: ServicioRow): Servicio {
  return { ...row, activo: row.activo === 1 };
}

export async function listarServicios(db: SQLiteDatabase): Promise<Servicio[]> {
  const filas = await db.getAllAsync<ServicioRow>('SELECT * FROM servicios ORDER BY nombre ASC');
  return filas.map(mapearServicio);
}

export async function obtenerServicio(
  db: SQLiteDatabase,
  id: number
): Promise<Servicio | null> {
  const fila = await db.getFirstAsync<ServicioRow>('SELECT * FROM servicios WHERE id = ?', id);
  return fila ? mapearServicio(fila) : null;
}

export async function obtenerRecetaServicio(
  db: SQLiteDatabase,
  servicioId: number
): Promise<ItemServicioMaterial[]> {
  return db.getAllAsync<ItemServicioMaterial>(
    `SELECT sm.id, sm.servicio_id, sm.ingrediente_id, sm.cantidad,
            i.nombre AS nombre_ingrediente, i.unidad, i.precio_unitario
     FROM servicio_materiales sm
     JOIN ingredientes i ON i.id = sm.ingrediente_id
     WHERE sm.servicio_id = ?
     ORDER BY i.nombre ASC`,
    servicioId
  );
}

export async function crearServicio(
  db: SQLiteDatabase,
  dato: NuevoServicio
): Promise<Servicio> {
  let servicioId = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    const resultado = await txn.runAsync(
      'INSERT INTO servicios (nombre, descripcion, porcentaje_ganancia) VALUES (?, ?, ?)',
      dato.nombre.trim(),
      dato.descripcion?.trim() || null,
      dato.porcentaje_ganancia
    );
    servicioId = resultado.lastInsertRowId;
    await insertarReceta(txn, servicioId, dato.receta);
  });
  const servicio = await obtenerServicio(db, servicioId);
  if (!servicio) {
    throw new Error('No se pudo crear el servicio');
  }
  return servicio;
}

export async function actualizarServicio(
  db: SQLiteDatabase,
  id: number,
  dato: NuevoServicio
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      "UPDATE servicios SET nombre = ?, descripcion = ?, porcentaje_ganancia = ?, actualizado_en = datetime('now') WHERE id = ?",
      dato.nombre.trim(),
      dato.descripcion?.trim() || null,
      dato.porcentaje_ganancia,
      id
    );
    await txn.runAsync('DELETE FROM servicio_materiales WHERE servicio_id = ?', id);
    await insertarReceta(txn, id, dato.receta);
  });
}

export async function eliminarServicio(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM servicios WHERE id = ?', id);
}

export async function cambiarActivoServicio(
  db: SQLiteDatabase,
  id: number,
  activo: boolean
): Promise<void> {
  await db.runAsync(
    "UPDATE servicios SET activo = ?, actualizado_en = datetime('now') WHERE id = ?",
    activo ? 1 : 0,
    id
  );
}

async function insertarReceta(
  txn: SQLiteDatabase,
  servicioId: number,
  receta: NuevoServicio['receta']
): Promise<void> {
  for (const item of receta) {
    await txn.runAsync(
      'INSERT INTO servicio_materiales (servicio_id, ingrediente_id, cantidad) VALUES (?, ?, ?)',
      servicioId,
      item.ingrediente_id,
      item.cantidad
    );
  }
}
