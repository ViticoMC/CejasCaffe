import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { calcularResumenReceta } from '../domain/calculos';

export const DATABASE_NAME = 'misventas.db';
export const DATABASE_VERSION = 8;

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

  if (currentVersion === 3) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS servicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  porcentaje_ganancia REAL NOT NULL DEFAULT 0 CHECK (porcentaje_ganancia >= 0),
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS servicio_materiales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  servicio_id INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  cantidad REAL NOT NULL CHECK (cantidad > 0),
  UNIQUE (servicio_id, ingrediente_id)
);

CREATE INDEX IF NOT EXISTS idx_servicio_materiales_servicio ON servicio_materiales(servicio_id);
CREATE INDEX IF NOT EXISTS idx_servicio_materiales_ingrediente ON servicio_materiales(ingrediente_id);

CREATE TABLE ventas_nueva (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bebida_id INTEGER REFERENCES bebidas(id) ON DELETE SET NULL,
  servicio_id INTEGER REFERENCES servicios(id) ON DELETE SET NULL,
  nombre_producto TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario REAL NOT NULL CHECK (precio_unitario >= 0),
  costo_unitario REAL NOT NULL CHECK (costo_unitario >= 0),
  creado_en TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S','now','localtime')),
  CHECK (bebida_id IS NOT NULL OR servicio_id IS NOT NULL)
);

INSERT INTO ventas_nueva (id, bebida_id, servicio_id, nombre_producto, cantidad, precio_unitario, costo_unitario, creado_en)
SELECT id, bebida_id, NULL, nombre_bebida, cantidad, precio_unitario, costo_unitario, creado_en FROM ventas;

DROP TABLE ventas;
ALTER TABLE ventas_nueva RENAME TO ventas;

CREATE INDEX IF NOT EXISTS idx_ventas_creado_en ON ventas(creado_en);
CREATE INDEX IF NOT EXISTS idx_ventas_bebida ON ventas(bebida_id);
CREATE INDEX IF NOT EXISTS idx_ventas_servicio ON ventas(servicio_id);
`);
    currentVersion = 4;
  }

  if (currentVersion === 4) {
    await db.execAsync(`
ALTER TABLE ingredientes ADD COLUMN stock REAL NOT NULL DEFAULT 0;
ALTER TABLE ingredientes ADD COLUMN stock_minimo REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  cantidad REAL NOT NULL CHECK (cantidad >= 0),
  motivo TEXT,
  venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
  inversion_id INTEGER REFERENCES inversiones(id) ON DELETE SET NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_movimientos_ingrediente ON movimientos_inventario(ingrediente_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_venta ON movimientos_inventario(venta_id);

ALTER TABLE inversiones ADD COLUMN ingrediente_id INTEGER REFERENCES ingredientes(id) ON DELETE SET NULL;
ALTER TABLE inversiones ADD COLUMN cantidad REAL;
`);
    currentVersion = 5;
  }

  if (currentVersion === 5) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS paquetes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ingrediente_id INTEGER NOT NULL REFERENCES ingredientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  cantidad REAL NOT NULL CHECK (cantidad > 0),
  precio REAL NOT NULL CHECK (precio >= 0),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_paquetes_ingrediente ON paquetes(ingrediente_id);

ALTER TABLE movimientos_inventario ADD COLUMN paquete_id INTEGER REFERENCES paquetes(id) ON DELETE SET NULL;

CREATE TRIGGER trg_precio_por_entrada
AFTER INSERT ON movimientos_inventario
WHEN NEW.tipo = 'entrada' AND NEW.inversion_id IS NOT NULL
BEGIN
  UPDATE ingredientes
  SET precio_unitario = CASE
    WHEN (stock + NEW.cantidad) > 0 THEN
      (stock * precio_unitario +
        (SELECT precio FROM inversiones WHERE id = NEW.inversion_id))
      / (stock + NEW.cantidad)
    ELSE precio_unitario
  END
  WHERE id = NEW.ingrediente_id;
END;
`);
    currentVersion = 6;
  }

  if (currentVersion === 6) {
    await db.execAsync(`
ALTER TABLE bebidas ADD COLUMN costo_produccion REAL NOT NULL DEFAULT 0;
ALTER TABLE bebidas ADD COLUMN precio_venta REAL NOT NULL DEFAULT 0;

CREATE TRIGGER IF NOT EXISTS trg_precio_ingrediente_bebidas
AFTER UPDATE OF precio_unitario ON ingredientes
WHEN OLD.precio_unitario IS NOT NEW.precio_unitario
BEGIN
  UPDATE bebidas
  SET costo_produccion = (
    SELECT COALESCE(ROUND(SUM(bi.cantidad * i.precio_unitario), 2), 0)
    FROM bebida_ingredientes bi
    JOIN ingredientes i ON i.id = bi.ingrediente_id
    WHERE bi.bebida_id = bebidas.id
  ),
  actualizado_en = datetime('now')
  WHERE id IN (SELECT bebida_id FROM bebida_ingredientes WHERE ingrediente_id = NEW.id);
END;
`);
    await rellenarPreciosBebidas(db);
    currentVersion = 7;
  }

  if (currentVersion === 7) {
    await db.execAsync(`
CREATE TABLE IF NOT EXISTS bebida_fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bebida_id INTEGER NOT NULL REFERENCES bebidas(id) ON DELETE CASCADE,
  archivo TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  ancho INTEGER,
  alto INTEGER,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bebida_fotos_bebida ON bebida_fotos(bebida_id);
`);
    currentVersion = 8;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}

async function rellenarPreciosBebidas(db: SQLiteDatabase): Promise<void> {
  const bebidas = await db.getAllAsync<{ id: number; porcentaje_ganancia: number }>(
    'SELECT id, porcentaje_ganancia FROM bebidas'
  );
  for (const bebida of bebidas) {
    const receta = await db.getAllAsync<{ cantidad: number; precio_unitario: number }>(
      `SELECT bi.cantidad, i.precio_unitario
       FROM bebida_ingredientes bi
       JOIN ingredientes i ON i.id = bi.ingrediente_id
       WHERE bi.bebida_id = ?`,
      bebida.id
    );
    const resumen = calcularResumenReceta(receta, bebida.porcentaje_ganancia);
    await db.runAsync(
      'UPDATE bebidas SET costo_produccion = ?, precio_venta = ? WHERE id = ?',
      resumen.costoProduccion,
      resumen.precioVenta,
      bebida.id
    );
  }
}

export async function openDatabase(): Promise<SQLiteDatabase> {
  const db = await openDatabaseAsync(DATABASE_NAME);
  await migrateDbIfNeeded(db);
  return db;
}
