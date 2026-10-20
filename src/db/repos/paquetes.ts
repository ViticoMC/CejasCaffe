import type { SQLiteDatabase } from 'expo-sqlite';
import type { NuevoPaquete, Paquete } from '../../domain/tipos';

export async function listarPaquetes(
  db: SQLiteDatabase,
  ingredienteId?: number
): Promise<Paquete[]> {
  if (ingredienteId != null) {
    return db.getAllAsync<Paquete>(
      'SELECT * FROM paquetes WHERE ingrediente_id = ? ORDER BY nombre ASC',
      ingredienteId
    );
  }
  return db.getAllAsync<Paquete>('SELECT * FROM paquetes ORDER BY nombre ASC');
}

export async function obtenerPaquete(db: SQLiteDatabase, id: number): Promise<Paquete | null> {
  return db.getFirstAsync<Paquete>('SELECT * FROM paquetes WHERE id = ?', id);
}

export async function crearPaquete(
  db: SQLiteDatabase,
  ingredienteId: number,
  dato: NuevoPaquete
): Promise<Paquete> {
  const resultado = await db.runAsync(
    'INSERT INTO paquetes (ingrediente_id, nombre, cantidad, precio) VALUES (?, ?, ?, ?)',
    ingredienteId,
    dato.nombre.trim(),
    dato.cantidad,
    dato.precio
  );
  const creado = await obtenerPaquete(db, resultado.lastInsertRowId);
  if (!creado) {
    throw new Error('No se pudo crear el paquete');
  }
  return creado;
}

export async function actualizarPaquete(
  db: SQLiteDatabase,
  id: number,
  dato: NuevoPaquete
): Promise<void> {
  await db.runAsync(
    "UPDATE paquetes SET nombre = ?, cantidad = ?, precio = ?, actualizado_en = datetime('now') WHERE id = ?",
    dato.nombre.trim(),
    dato.cantidad,
    dato.precio,
    id
  );
}

export async function eliminarPaquete(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM paquetes WHERE id = ?', id);
}
