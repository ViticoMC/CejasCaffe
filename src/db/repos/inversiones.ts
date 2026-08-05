import type { SQLiteDatabase } from 'expo-sqlite';
import type { Inversion, NuevaInversion } from '../../domain/tipos';

export async function listarInversiones(db: SQLiteDatabase): Promise<Inversion[]> {
  return db.getAllAsync<Inversion>('SELECT * FROM inversiones ORDER BY creado_en DESC, id DESC');
}

export async function obtenerInversion(
  db: SQLiteDatabase,
  id: number
): Promise<Inversion | null> {
  return db.getFirstAsync<Inversion>('SELECT * FROM inversiones WHERE id = ?', id);
}

export async function crearInversion(
  db: SQLiteDatabase,
  dato: NuevaInversion
): Promise<Inversion> {
  const resultado = await db.runAsync(
    'INSERT INTO inversiones (nombre, descripcion, precio) VALUES (?, ?, ?)',
    dato.nombre.trim(),
    dato.descripcion?.trim() || null,
    dato.precio
  );
  const creada = await obtenerInversion(db, resultado.lastInsertRowId);
  if (!creada) {
    throw new Error('No se pudo crear la inversión');
  }
  return creada;
}

export async function actualizarInversion(
  db: SQLiteDatabase,
  id: number,
  dato: NuevaInversion
): Promise<void> {
  await db.runAsync(
    "UPDATE inversiones SET nombre = ?, descripcion = ?, precio = ?, actualizado_en = datetime('now') WHERE id = ?",
    dato.nombre.trim(),
    dato.descripcion?.trim() || null,
    dato.precio,
    id
  );
}

export async function eliminarInversion(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM inversiones WHERE id = ?', id);
}
