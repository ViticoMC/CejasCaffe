import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'misventas.db';
export const DATABASE_VERSION = 3;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let currentVersion = result?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  if (currentVersion === 0) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS ingredientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  unidad TEXT NOT NULL,
  precio_unitario REAL NOT NULL CHECK (precio_unitario >= 0),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bebidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  porcentaje_ganancia REAL NOT NULL DEFAULT 0 CHECK (porcentaje_ganancia >= 0),
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bebida_ingredientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bebida_id INTEGER NOT NULL REFERENCES bebidas(id) ON DELETE CASCADE,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  cantidad REAL NOT NULL CHECK (cantidad > 0),
  UNIQUE (bebida_id, ingrediente_id)
);

CREATE INDEX IF NOT EXISTS idx_bebida_ingredientes_bebida ON bebida_ingredientes(bebida_id);
CREATE INDEX IF NOT EXISTS idx_bebida_ingredientes_ingrediente ON bebida_ingredientes(ingrediente_id);
`);
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bebida_id INTEGER REFERENCES bebidas(id) ON DELETE SET NULL,
  nombre_bebida TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario REAL NOT NULL CHECK (precio_unitario >= 0),
  costo_unitario REAL NOT NULL CHECK (costo_unitario >= 0),
  creado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now','localtime'))
);

CREATE INDEX IF NOT EXISTS idx_ventas_creado_en ON ventas(creado_en);
CREATE INDEX IF NOT EXISTS idx_ventas_bebida ON ventas(bebida_id);
`);
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS inversiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio REAL NOT NULL CHECK (precio >= 0),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
    currentVersion = 3;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

export async function openDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await migrateDbIfNeeded(db);
  return db;
}
