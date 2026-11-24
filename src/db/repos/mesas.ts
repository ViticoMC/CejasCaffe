import type { SQLiteDatabase } from 'expo-sqlite';
import type { LineaPedido, Mesa } from '../../domain/tipos';

export async function listarMesas(db: SQLiteDatabase): Promise<Mesa[]> {
  return db.getAllAsync<Mesa>('SELECT * FROM mesas ORDER BY nombre ASC');
}

export async function crearMesa(db: SQLiteDatabase, nombre: string): Promise<Mesa> {
  // Verificar si ya existe para dar un error claro
  const existente = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM mesas WHERE nombre = ?',
    nombre
  );
  if (existente) {
    throw new Error('Mesa duplicada');
  }
  const resultado = await db.runAsync(
    'INSERT INTO mesas (nombre) VALUES (?)',
    nombre
  );
  const mesa = await db.getFirstAsync<Mesa>(
    'SELECT * FROM mesas WHERE id = ?',
    resultado.lastInsertRowId
  );
  if (!mesa) {
    throw new Error('No se pudo crear la mesa');
  }
  return mesa;
}

export async function eliminarMesa(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM mesas WHERE id = ?', id);
}

// ---------------------------------------------------------------------------
// Pedidos por mesa (persistidos en SQLite)
// ---------------------------------------------------------------------------

export async function cargarPedidoMesa(db: SQLiteDatabase, mesaId: number): Promise<LineaPedido[]> {
  // Verificar que la tabla existe para evitar crash en instalaciones antiguas
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pedidos_mesa'"
  );
  if (tables.length === 0) {
    return [];
  }

  const rows = await db.getAllAsync<{
    bebida_id: number;
    bebida_nombre: string;
    bebida_precio: number;
    bebida_costo: number;
    cantidad: number;
    entregado: number;
    creado_en: string | null;
    notificado: number;
  }>('SELECT bebida_id, bebida_nombre, bebida_precio, bebida_costo, cantidad, entregado, creado_en, notificado FROM pedidos_mesa WHERE mesa_id = ? ORDER BY id', mesaId);
  return rows.map((r) => ({
    bebida_id: r.bebida_id,
    bebida_nombre: r.bebida_nombre,
    bebida_precio: r.bebida_precio,
    bebida_costo: r.bebida_costo,
    cantidad: r.cantidad,
    entregado: r.entregado === 1,
    creado_en: r.creado_en ?? '',
    notificado: r.notificado === 1,
  }));
}

export async function guardarPedidoMesa(db: SQLiteDatabase, mesaId: number, lineas: LineaPedido[]): Promise<void> {
  // Verificar que la tabla existe
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pedidos_mesa'"
  );
  if (tables.length === 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    // Si no hay creado_en aún, significa que es el primer pedido para esta mesa
    const existing = await db.getFirstAsync<{ creado_en: string | null }>(
      'SELECT creado_en FROM pedidos_mesa WHERE mesa_id = ? LIMIT 1',
      mesaId
    );
    const esNuevoPedido = !existing;
    const creadoEn = esNuevoPedido ? new Date().toISOString().replace('T', ' ').substring(0, 19) : existing.creado_en;

    // Borrar líneas existentes
    await db.runAsync('DELETE FROM pedidos_mesa WHERE mesa_id = ?', mesaId);
    // Insertar las nuevas con creado_en
    for (const l of lineas) {
      await db.runAsync(
        'INSERT INTO pedidos_mesa (mesa_id, bebida_id, bebida_nombre, bebida_precio, bebida_costo, cantidad, entregado, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        mesaId,
        l.bebida_id,
        l.bebida_nombre,
        l.bebida_precio,
        l.bebida_costo,
        l.cantidad,
        l.entregado ? 1 : 0,
        creadoEn,
      );
    }
  });
}

export async function limpiarPedidoMesa(db: SQLiteDatabase, mesaId: number): Promise<void> {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pedidos_mesa'"
  );
  if (tables.length === 0) {
    return;
  }
  await db.runAsync('DELETE FROM pedidos_mesa WHERE mesa_id = ?', mesaId);
}

export async function obtenerMesasConPedidos(db: SQLiteDatabase): Promise<number[]> {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pedidos_mesa'"
  );
  if (tables.length === 0) {
    return [];
  }
  const rows = await db.getAllAsync<{ mesa_id: number }>(
    'SELECT DISTINCT mesa_id FROM pedidos_mesa'
  );
  return rows.map((r) => r.mesa_id);
}

export interface MesaConTiempo {
  mesa_id: number;
  creado_en: string | null;
}

export async function obtenerMesasConPedidosYTiempo(db: SQLiteDatabase): Promise<MesaConTiempo[]> {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pedidos_mesa'"
  );
  if (tables.length === 0) {
    return [];
  }
  const rows = await db.getAllAsync<MesaConTiempo>(
    'SELECT DISTINCT mesa_id, MIN(creado_en) AS creado_en FROM pedidos_mesa WHERE creado_en IS NOT NULL AND creado_en != \'\' GROUP BY mesa_id'
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Pedidos vencidos (para notificaciones)
// ---------------------------------------------------------------------------

export interface MesaPedidoVencido {
  mesa_id: number;
  mesa_nombre: string;
  creado_en: string;
  notificado: number;
}

export async function obtenerMesasConPedidosVencidos(
  db: SQLiteDatabase,
  minutos: number
): Promise<MesaPedidoVencido[]> {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pedidos_mesa'"
  );
  if (tables.length === 0) {
    return [];
  }

  const rows = await db.getAllAsync<MesaPedidoVencido>(`
    SELECT DISTINCT pm.mesa_id, m.nombre AS mesa_nombre, pm.creado_en, pm.notificado
    FROM pedidos_mesa pm
    JOIN mesas m ON m.id = pm.mesa_id
    WHERE pm.creado_en IS NOT NULL
      AND pm.creado_en != ''
      AND pm.notificado = 0
      AND (julianday('now') - julianday(pm.creado_en)) * 24 * 60 > ?
    ORDER BY pm.creado_en ASC
  `,
  minutos
  );
  return rows;
}

export async function marcarPedidoNotificado(db: SQLiteDatabase, mesaId: number): Promise<void> {
  const tables = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='pedidos_mesa'"
  );
  if (tables.length === 0) {
    return;
  }
  await db.runAsync('UPDATE pedidos_mesa SET notificado = 1 WHERE mesa_id = ?', mesaId);
}
