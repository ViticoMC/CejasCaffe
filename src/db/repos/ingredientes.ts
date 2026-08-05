import type { SQLiteDatabase } from 'expo-sqlite';
import type { Ingrediente, NuevoIngrediente } from '../../domain/tipos';

export async function listarIngredientes(db: SQLiteDatabase): Promise<Ingrediente[]> {
  return db.getAllAsync<Ingrediente>('SELECT * FROM ingredientes ORDER BY nombre ASC');
}

export async function obtenerIngrediente(
  db: SQLiteDatabase,
  id: number
): Promise<Ingrediente | null> {
  return db.getFirstAsync<Ingrediente>('SELECT * FROM ingredientes WHERE id = ?', id);
}

export async function crearIngrediente(
  db: SQLiteDatabase,
  dato: NuevoIngrediente
): Promise<Ingrediente> {
  const resultado = await db.runAsync(
    'INSERT INTO ingredientes (nombre, unidad, precio_unitario) VALUES (?, ?, ?)',
    dato.nombre.trim(),
    dato.unidad.trim(),
    dato.precio_unitario
  );
  const creado = await obtenerIngrediente(db, resultado.lastInsertRowId);
  if (!creado) {
    throw new Error('No se pudo crear el ingrediente');
  }
  return creado;
}

export async function actualizarIngrediente(
  db: SQLiteDatabase,
  id: number,
  dato: NuevoIngrediente
): Promise<void> {
  await db.runAsync(
    "UPDATE ingredientes SET nombre = ?, unidad = ?, precio_unitario = ?, actualizado_en = datetime('now') WHERE id = ?",
    dato.nombre.trim(),
    dato.unidad.trim(),
    dato.precio_unitario,
    id
  );
}

export async function contarUsoIngrediente(
  db: SQLiteDatabase,
  id: number
): Promise<number> {
  const usado = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM bebida_ingredientes WHERE ingrediente_id = ?',
    id
  );
  return usado?.total ?? 0;
}

export async function eliminarIngrediente(db: SQLiteDatabase, id: number): Promise<void> {
  const enUso = await contarUsoIngrediente(db, id);
  if (enUso > 0) {
    throw new Error('INGREDIENTE_EN_USO');
  }
  await db.runAsync('DELETE FROM ingredientes WHERE id = ?', id);
}
