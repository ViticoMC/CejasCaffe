import type { SQLiteDatabase } from 'expo-sqlite';
import { calcularResumenBebida } from '../../domain/calculos';
import type { FiltroVentas, NuevaVenta, Venta } from '../../domain/tipos';
import { obtenerBebida, obtenerReceta } from './bebidas';

export async function registrarVenta(
  db: SQLiteDatabase,
  dato: NuevaVenta
): Promise<Venta> {
  const bebida = await obtenerBebida(db, dato.bebida_id);
  if (!bebida) {
    throw new Error('Bebida no encontrada');
  }
  const receta = await obtenerReceta(db, dato.bebida_id);
  const resumen = calcularResumenBebida(receta, bebida.porcentaje_ganancia);

  const resultado = await db.runAsync(
    `INSERT INTO ventas (bebida_id, nombre_bebida, cantidad, precio_unitario, costo_unitario)
     VALUES (?, ?, ?, ?, ?)`,
    bebida.id,
    bebida.nombre.trim(),
    dato.cantidad,
    resumen.precioVenta,
    resumen.costoProduccion
  );
  const venta = await db.getFirstAsync<Venta>(
    'SELECT * FROM ventas WHERE id = ?',
    resultado.lastInsertRowId
  );
  if (!venta) {
    throw new Error('No se pudo registrar la venta');
  }
  return venta;
}

export async function listarVentas(
  db: SQLiteDatabase,
  filtro: FiltroVentas = {}
): Promise<Venta[]> {
  const condiciones: string[] = [];
  const parametros: (string | number)[] = [];

  if (filtro.desde != null) {
    condiciones.push('v.creado_en >= ?');
    parametros.push(filtro.desde);
  }
  if (filtro.hasta != null) {
    condiciones.push('v.creado_en <= ?');
    parametros.push(filtro.hasta);
  }
  if (filtro.bebida_id != null) {
    condiciones.push('v.bebida_id = ?');
    parametros.push(filtro.bebida_id);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  return db.getAllAsync<Venta>(
    `SELECT v.id, v.bebida_id, v.nombre_bebida, v.cantidad, v.precio_unitario,
            v.costo_unitario, v.creado_en
     FROM ventas v
     ${where}
     ORDER BY v.creado_en DESC, v.id DESC`,
    ...parametros
  );
}

export async function eliminarVenta(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM ventas WHERE id = ?', id);
}
