import type { SQLiteDatabase } from 'expo-sqlite';
import { calcularResumenReceta } from '../../domain/calculos';
import type {
  FaltanteStock,
  FiltroVentas,
  ItemReceta,
  ItemServicioMaterial,
  NuevaVenta,
  Venta,
} from '../../domain/tipos';
import { obtenerBebida, obtenerReceta } from './bebidas';
import { aplicarSalidaVenta, revertirMovimientosVenta } from './inventario';
import { obtenerRecetaServicio, obtenerServicio } from './servicios';

export async function registrarVenta(
  db: SQLiteDatabase,
  dato: NuevaVenta
): Promise<{ venta: Venta; faltantes: FaltanteStock[] }> {
  const esServicio = dato.producto.tipo === 'servicio';

  let nombre: string;
  let precioVenta: number;
  let costoProduccion: number;
  let receta: (ItemReceta | ItemServicioMaterial)[];

  if (esServicio) {
    const servicio = await obtenerServicio(db, dato.producto.id);
    if (!servicio) {
      throw new Error('Servicio no encontrado');
    }
    receta = await obtenerRecetaServicio(db, dato.producto.id);
    const resumen = calcularResumenReceta(receta, servicio.porcentaje_ganancia);
    nombre = servicio.nombre;
    precioVenta = resumen.precioVenta;
    costoProduccion = resumen.costoProduccion;
  } else {
    const bebida = await obtenerBebida(db, dato.producto.id);
    if (!bebida) {
      throw new Error('Bebida no encontrada');
    }
    receta = await obtenerReceta(db, dato.producto.id);
    nombre = bebida.nombre;
    precioVenta = bebida.precio_venta;
    costoProduccion = bebida.costo_produccion;
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

  const consumos = receta.map((item) => ({
    ingrediente_id: item.ingrediente_id,
    cantidad: item.cantidad * dato.cantidad,
  }));

  const faltantes: FaltanteStock[] = [];
  let ventaId = 0;
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const consumo of consumos) {
      const existen = await txn.getFirstAsync<{ stock: number }>(
        'SELECT stock FROM ingredientes WHERE id = ?',
        consumo.ingrediente_id
      );
      if (existen != null && consumo.cantidad > existen.stock) {
        const item = receta.find((r) => r.ingrediente_id === consumo.ingrediente_id);
        faltantes.push({
          ingrediente_id: consumo.ingrediente_id,
          nombre: item?.nombre_ingrediente ?? 'Material',
          unidad: item?.unidad ?? '',
          disponible: existen.stock,
          requerido: Math.round((consumo.cantidad + Number.EPSILON) * 100) / 100,
        });
      }
    }

    const resultado = await txn.runAsync(
      `INSERT INTO ventas ${columnas}
       VALUES (?, ?, ?, ?, ?, ?${conFecha ? ', ?' : ''})`,
      ...valores,
      ...(dato.fecha ? [dato.fecha] : [])
    );
    ventaId = resultado.lastInsertRowId;
    await aplicarSalidaVenta(txn, ventaId, consumos);
  });

  const venta = await db.getFirstAsync<Venta>('SELECT * FROM ventas WHERE id = ?', ventaId);
  if (!venta) {
    throw new Error('No se pudo registrar la venta');
  }
  return { venta, faltantes };
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
  await db.withExclusiveTransactionAsync(async (txn) => {
    await revertirMovimientosVenta(txn, id);
    await txn.runAsync('DELETE FROM ventas WHERE id = ?', id);
  });
}
