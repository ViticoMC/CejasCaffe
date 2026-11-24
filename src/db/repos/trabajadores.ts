import type { SQLiteDatabase } from 'expo-sqlite';
import type { Trabajador, NuevoTrabajador } from '../../domain/tipos';

export async function listarTrabajadores(db: SQLiteDatabase): Promise<Trabajador[]> {
  return db.getAllAsync<Trabajador>('SELECT * FROM trabajadores ORDER BY nombre ASC');
}

export async function obtenerTrabajador(
  db: SQLiteDatabase,
  id: number
): Promise<Trabajador | null> {
  return db.getFirstAsync<Trabajador>('SELECT * FROM trabajadores WHERE id = ?', id);
}

export async function crearTrabajador(
  db: SQLiteDatabase,
  dato: NuevoTrabajador
): Promise<Trabajador> {
  const resultado = await db.runAsync(
    "INSERT INTO trabajadores (nombre) VALUES (?)",
    dato.nombre.trim()
  );
  const creado = await obtenerTrabajador(db, resultado.lastInsertRowId);
  if (!creado) {
    throw new Error('No se pudo crear el trabajador');
  }
  return creado;
}

export async function actualizarTrabajador(
  db: SQLiteDatabase,
  id: number,
  dato: NuevoTrabajador
): Promise<void> {
  await db.runAsync('UPDATE trabajadores SET nombre = ? WHERE id = ?', dato.nombre.trim(), id);
}

export async function eliminarTrabajador(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM trabajadores WHERE id = ?', id);
}
