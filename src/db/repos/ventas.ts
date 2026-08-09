import type { SQLiteDatabase } from 'expo-sqlite';
import { calcularResumenReceta } from '../../domain/calculos';
import type { FiltroVentas, NuevaVenta, Venta } from '../../domain/tipos';
import { obtenerBebida, obtenerReceta } from './bebidas';
import { obtenerRecetaServicio, obtenerServicio } from './servicios';

export async function registrarVenta(
  db: SQLiteDatabase,
  dato: NuevaVenta
): Promise<Venta> {
  const esServicio = dato.producto.tipo === 'servicio';

  let nombre: string;
  let precioVenta: number;
  let costoProduccion: number;

  if (esServicio) {
    const servicio = await obtenerServicio(db, dato.producto.id);
    if (!servicio) {
      throw new Error('Servicio no encontrado');
    }
    const receta = await obtenerRecetaServicio(db, dato.producto.id);
    const resumen = calcularResumenReceta(receta, servicio.porcentaje_ganancia);
    nombre = servicio.nombre;
    precioVenta = resumen.precioVenta;
    costoProduccion = resumen.costoProduccion;
  } else {
    const bebida = await obtenerBebida(db, dato.producto.id);
    if (!bebida) {
      throw new Error('Bebida no encontrada');
    }
    const receta = await obtenerReceta(db, dato.producto.id);
    const resumen = calcularResumenReceta(receta, bebida.porcentaje_ganancia);
    nombre = bebida.nombre;
    precioVenta = resumen.precioVenta;
    costoProduccion = resumen.costoProduccion;
  }

  const conFecha = dato.fecha != null;
  const columnas = conFecha
    ? '(bebida_id, servicio_id, nombre_producto, cantidad, precio_unitario, costo_unitario, creado_en)'
    : '(bebida_id, servicio_id, nombre_producto, cantidad, precio_unitario, costo_unitario)';

  const valores = [
    esServicio ? null : dato.producto.id,
    esServicio ? dato.producto.id : null,
    nombre.trim(),
    dato.cantidad,
    precioVenta,
    costoProduccion,
  ];

  const resultado = await db.runAsync(
    `INSERT INTO ventas ${columnas}
     VALUES (?, ?, ?, ?, ?, ?${conFecha ? ', ?' : ''})`,
    ...valores,
    ...(dato.fecha ? [dato.fecha] : [])
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
  if (filtro.tipo === 'bebida') {
    condiciones.push('v.bebida_id IS NOT NULL');
  } else if (filtro.tipo === 'servicio') {
    condiciones.push('v.servicio_id IS NOT NULL');
  }
  if (filtro.bebida_id != null) {
    condiciones.push('v.bebida_id = ?');
    parametros.push(filtro.bebida_id);
  }
  if (filtro.servicio_id != null) {
    condiciones.push('v.servicio_id = ?');
    parametros.push(filtro.servicio_id);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

  return db.getAllAsync<Venta>(
    `SELECT v.id, v.bebida_id, v.servicio_id, v.nombre_producto, v.cantidad,
            v.precio_unitario, v.costo_unitario, v.creado_en
     FROM ventas v
     ${where}
     ORDER BY v.creado_en DESC, v.id DESC`,
    ...parametros
  );
}

export async function eliminarVenta(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM ventas WHERE id = ?', id);
}
