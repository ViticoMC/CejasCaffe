import type { SQLiteDatabase } from 'expo-sqlite';
import type { PagoTrabajador, NuevoPagoTrabajador, TotalesTrabajador } from '../../domain/tipos';

export async function registrarPago(
  db: SQLiteDatabase,
  dato: NuevoPagoTrabajador
): Promise<PagoTrabajador> {
  if (dato.fecha) {
    const resultado = await db.runAsync(
      "INSERT INTO pagos_trabajador (trabajador_id, tipo, monto, creado_en) VALUES (?, ?, ?, ?)",
      dato.trabajador_id,
      dato.tipo,
      dato.monto,
      dato.fecha
    );
    const creado = await obtenerPago(db, resultado.lastInsertRowId);
    if (!creado) {
      throw new Error('No se pudo registrar el pago');
    }
    return creado;
  } else {
    const resultado = await db.runAsync(
      "INSERT INTO pagos_trabajador (trabajador_id, tipo, monto) VALUES (?, ?, ?)",
      dato.trabajador_id,
      dato.tipo,
      dato.monto
    );
    const creado = await obtenerPago(db, resultado.lastInsertRowId);
    if (!creado) {
      throw new Error('No se pudo registrar el pago');
    }
    return creado;
  }
}

export async function obtenerPago(
  db: SQLiteDatabase,
  id: number
): Promise<PagoTrabajador | null> {
  return db.getFirstAsync<PagoTrabajador>('SELECT * FROM pagos_trabajador WHERE id = ?', id);
}

export async function listarPagosPorTrabajador(
  db: SQLiteDatabase,
  trabajadorId: number,
  desde?: string,
  hasta?: string
): Promise<PagoTrabajador[]> {
  if (desde && hasta) {
    return db.getAllAsync<PagoTrabajador>(
      'SELECT * FROM pagos_trabajador WHERE trabajador_id = ? AND creado_en >= ? AND creado_en <= ? ORDER BY creado_en DESC',
      trabajadorId,
      desde,
      hasta
    );
  }
  return db.getAllAsync<PagoTrabajador>(
    'SELECT * FROM pagos_trabajador WHERE trabajador_id = ? ORDER BY creado_en DESC',
    trabajadorId
  );
}

export async function obtenerTotalesPorTrabajador(
  db: SQLiteDatabase,
  trabajadorId: number,
  desde?: string,
  hasta?: string
): Promise<TotalesTrabajador> {
  let query =
    "SELECT COALESCE(SUM(CASE WHEN tipo = 'produccion' THEN monto ELSE 0 END), 0) AS produccion, " +
    "COALESCE(SUM(CASE WHEN tipo = 'propina' THEN monto ELSE 0 END), 0) AS propina " +
    'FROM pagos_trabajador WHERE trabajador_id = ?';
  const params: (number | string)[] = [trabajadorId];

  if (desde && hasta) {
    query += ' AND creado_en >= ? AND creado_en <= ?';
    params.push(desde, hasta);
  }

  const result = await db.getFirstAsync<{ produccion: number; propina: number }>(query, ...params);
  return {
    produccion: result?.produccion ?? 0,
    propina: result?.propina ?? 0,
    total: (result?.produccion ?? 0) + (result?.propina ?? 0),
  };
}

export async function obtenerTotalesSalarios(
  db: SQLiteDatabase,
  desde?: string,
  hasta?: string
): Promise<{ produccion: number; propina: number }> {
  let query =
    "SELECT COALESCE(SUM(CASE WHEN tipo = 'produccion' THEN monto ELSE 0 END), 0) AS produccion, " +
    "COALESCE(SUM(CASE WHEN tipo = 'propina' THEN monto ELSE 0 END), 0) AS propina " +
    'FROM pagos_trabajador';
  const params: string[] = [];

  if (desde && hasta) {
    query += ' WHERE creado_en >= ? AND creado_en <= ?';
    params.push(desde, hasta);
  }

  const result = await db.getFirstAsync<{ produccion: number; propina: number }>(query, ...params);
  return {
    produccion: result?.produccion ?? 0,
    propina: result?.propina ?? 0,
  };
}

export async function eliminarPago(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM pagos_trabajador WHERE id = ?', id);
}

export async function actualizarPago(
  db: SQLiteDatabase,
  id: number,
  tipo: string,
  monto: number,
  creado_en: string
): Promise<PagoTrabajador | null> {
  await db.runAsync(
    'UPDATE pagos_trabajador SET tipo = ?, monto = ?, creado_en = ? WHERE id = ?',
    tipo,
    monto,
    creado_en,
    id
  );
  return obtenerPago(db, id);
}
