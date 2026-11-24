import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  EstadisticaProducto,
  FiltroVentas,
  GranularidadTendencia,
  PuntoTendencia,
  ResumenEstadisticas,
} from '../../domain/tipos';

function construirFiltro(filtro: FiltroVentas = {}) {
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
  return { where, parametros };
}

export async function obtenerResumenEstadisticas(
  db: SQLiteDatabase,
  filtro: FiltroVentas = {}
): Promise<ResumenEstadisticas> {
  const { where, parametros } = construirFiltro(filtro);

  const fila = await db.getFirstAsync<{
    ingresos: number | null;
    costo: number | null;
    ganancia: number | null;
    unidades: number | null;
    numeroVentas: number;
    diasConVentas: number;
  }>(
    `SELECT
      COALESCE(ROUND(SUM(v.cantidad * v.precio_unitario), 2), 0) AS ingresos,
      COALESCE(ROUND(SUM(v.cantidad * v.costo_unitario), 2), 0) AS costo,
      COALESCE(ROUND(SUM(v.cantidad * (v.precio_unitario - v.costo_unitario)), 2), 0) AS ganancia,
      COALESCE(SUM(v.cantidad), 0) AS unidades,
      COUNT(*) AS numeroVentas,
      COUNT(DISTINCT date(v.creado_en)) AS diasConVentas
     FROM ventas v
     ${where}`,
    ...parametros
  );

  const ingresos = fila?.ingresos ?? 0;
  const costo = fila?.costo ?? 0;
  const ganancia = fila?.ganancia ?? 0;
  const unidades = fila?.unidades ?? 0;
  const numeroVentas = fila?.numeroVentas ?? 0;

  // Sumar salarios de trabajadores en el mismo período
  const salariosParams: (string | number)[] = [];
  const salariosWhereParts: string[] = [];
  if (filtro.desde != null) {
    salariosWhereParts.push('pt.creado_en >= ?');
    salariosParams.push(filtro.desde);
  }
  if (filtro.hasta != null) {
    salariosWhereParts.push('pt.creado_en <= ?');
    salariosParams.push(filtro.hasta);
  }
  const salariosWhere =
    salariosWhereParts.length > 0
      ? `WHERE ${salariosWhereParts.join(' AND ')}`
      : '';

  const salariosFila = await db.getFirstAsync<{
    produccion: number | null;
    propina: number | null;
  }>(
    `SELECT
      COALESCE(ROUND(SUM(CASE WHEN tipo = 'produccion' THEN monto ELSE 0 END), 2), 0) AS produccion,
      COALESCE(ROUND(SUM(CASE WHEN tipo = 'propina' THEN monto ELSE 0 END), 2), 0) AS propina
     FROM pagos_trabajador pt
     ${salariosWhere}`,
    ...salariosParams
  );

  const salariosProduccion = salariosFila?.produccion ?? 0;
  const salariosPropina = salariosFila?.propina ?? 0;

  // Ganancia neta: ganancia bruta menos salarios pagados desde producción
  const gananciaNeta = ganancia - salariosProduccion;
  const margenNeto = ingresos > 0 ? (gananciaNeta / ingresos) * 100 : 0;

  return {
    ingresos,
    costo,
    ganancia,
    gananciaNeta,
    margen: ingresos > 0 ? (ganancia / ingresos) * 100 : 0,
    margenNeto,
    unidades,
    numeroVentas,
    ticketPromedio: numeroVentas > 0 ? ingresos / numeroVentas : 0,
    diasConVentas: fila?.diasConVentas ?? 0,
    salariosProduccion,
    salariosPropina,
  };
}

export async function obtenerVentasPorProducto(
  db: SQLiteDatabase,
  filtro: FiltroVentas = {}
): Promise<EstadisticaProducto[]> {
  const { where, parametros } = construirFiltro(filtro);

  return db.getAllAsync<EstadisticaProducto>(
    `SELECT
      COALESCE('b' || v.bebida_id, 's' || v.servicio_id) AS clave,
      MAX(v.nombre_producto) AS nombre,
      CASE WHEN MAX(v.bebida_id) IS NOT NULL THEN 'bebida' ELSE 'servicio' END AS tipo,
      SUM(v.cantidad) AS cantidadVendida,
      ROUND(SUM(v.cantidad * v.precio_unitario), 2) AS ingresos,
      ROUND(SUM(v.cantidad * (v.precio_unitario - v.costo_unitario)), 2) AS ganancia
     FROM ventas v
     ${where}
     GROUP BY clave
     ORDER BY cantidadVendida DESC`,
    ...parametros
  );
}

const EXPRESION_BUCKET: Record<GranularidadTendencia, string> = {
  hora: "strftime('%Y-%m-%dT%H:00:00', v.creado_en)",
  dia: 'date(v.creado_en)',
  semana: "date(v.creado_en, 'weekday 0', '-6 days')",
  mes: "strftime('%Y-%m', v.creado_en)",
};

export async function obtenerTendencia(
  db: SQLiteDatabase,
  filtro: FiltroVentas = {},
  granularidad: GranularidadTendencia = 'dia'
): Promise<PuntoTendencia[]> {
  const { where, parametros } = construirFiltro(filtro);

  const filas = await db.getAllAsync<PuntoTendencia>(
    `SELECT
      ${EXPRESION_BUCKET[granularidad]} AS fecha,
      ROUND(SUM(v.cantidad * v.precio_unitario), 2) AS ventas,
      ROUND(SUM(v.cantidad * (v.precio_unitario - v.costo_unitario)), 2) AS ganancia,
      SUM(v.cantidad) AS cantidad
     FROM ventas v
     ${where}
     GROUP BY fecha
     ORDER BY fecha ASC`,
    ...parametros
  );

  return rellenarTendencia(filas, filtro, granularidad);
}

function dosDigitos(valor: number): string {
  return String(valor).padStart(2, '0');
}

function claveDeTexto(fecha: string, granularidad: GranularidadTendencia): string {
  if (granularidad === 'hora') {
    return fecha.slice(0, 13);
  }
  if (granularidad === 'mes') {
    return fecha.slice(0, 7);
  }
  return fecha.slice(0, 10);
}

function claveDeFecha(fecha: Date, granularidad: GranularidadTendencia): string {
  const anio = fecha.getFullYear();
  const mes = dosDigitos(fecha.getMonth() + 1);
  const dia = dosDigitos(fecha.getDate());
  if (granularidad === 'hora') {
    return `${anio}-${mes}-${dia}T${dosDigitos(fecha.getHours())}`;
  }
  if (granularidad === 'mes') {
    return `${anio}-${mes}`;
  }
  return `${anio}-${mes}-${dia}`;
}

function formatearBucket(fecha: Date, granularidad: GranularidadTendencia): string {
  const clave = claveDeFecha(fecha, granularidad);
  return granularidad === 'hora' ? `${clave}:00:00` : clave;
}

function parseFechaLocal(valor: string): Date {
  const [fechaParte, horaParte] = valor.split('T');
  const [anio, mes, dia] = fechaParte.split('-').map(Number);
  if (horaParte != null) {
    const [hora, minuto, segundo] = horaParte.split(':').map(Number);
    return new Date(anio, mes - 1, dia ?? 1, hora || 0, minuto || 0, segundo || 0);
  }
  return new Date(anio, mes - 1, dia ?? 1);
}

function inicioDeSemana(fecha: Date): Date {
  const copia = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    12,
    0,
    0,
    0
  );
  const diferencia = (copia.getDay() + 6) % 7;
  copia.setDate(copia.getDate() - diferencia);
  return copia;
}

function inicioDeBucket(fecha: Date, granularidad: GranularidadTendencia): Date {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();
  const dia = fecha.getDate();
  switch (granularidad) {
    case 'hora':
      return new Date(anio, mes, dia, fecha.getHours(), 0, 0, 0);
    case 'semana':
      return inicioDeSemana(fecha);
    case 'mes':
      return new Date(anio, mes, 1, 12, 0, 0, 0);
    case 'dia':
    default:
      return new Date(anio, mes, dia, 12, 0, 0, 0);
  }
}

function finDeBucket(fecha: Date, granularidad: GranularidadTendencia): Date {
  const anio = fecha.getFullYear();
  const mes = fecha.getMonth();
  const dia = fecha.getDate();
  switch (granularidad) {
    case 'hora':
      return new Date(anio, mes, dia, fecha.getHours(), 59, 59, 999);
    case 'semana': {
      const fin = inicioDeSemana(fecha);
      fin.setDate(fin.getDate() + 6);
      fin.setHours(23, 59, 59, 999);
      return fin;
    }
    case 'mes':
      return new Date(anio, mes + 1, 0, 23, 59, 59, 999);
    case 'dia':
    default:
      return new Date(anio, mes, dia, 23, 59, 59, 999);
  }
}

function avanzarBucket(fecha: Date, granularidad: GranularidadTendencia): void {
  switch (granularidad) {
    case 'hora':
      fecha.setHours(fecha.getHours() + 1);
      break;
    case 'semana':
      fecha.setDate(fecha.getDate() + 7);
      break;
    case 'mes':
      fecha.setMonth(fecha.getMonth() + 1);
      break;
    case 'dia':
    default:
      fecha.setDate(fecha.getDate() + 1);
      break;
  }
}

function rellenarTendencia(
  puntos: PuntoTendencia[],
  filtro: FiltroVentas,
  granularidad: GranularidadTendencia
): PuntoTendencia[] {
  if (puntos.length === 0) {
    return puntos;
  }

  const porClave = new Map<string, PuntoTendencia>();
  for (const punto of puntos) {
    porClave.set(claveDeTexto(punto.fecha, granularidad), punto);
  }

  const primero = puntos[0];
  const ultimo = puntos[puntos.length - 1];
  const inicio = filtro.desde
    ? parseFechaLocal(filtro.desde)
    : parseFechaLocal(primero.fecha);
  const fin = filtro.hasta
    ? parseFechaLocal(filtro.hasta)
    : finDeBucket(parseFechaLocal(ultimo.fecha), granularidad);

  if (fin.getTime() < inicio.getTime()) {
    return puntos;
  }

  const cursor = inicioDeBucket(inicio, granularidad);
  const limite = fin.getTime();
  const resultado: PuntoTendencia[] = [];

  while (cursor.getTime() <= limite) {
    const clave = claveDeFecha(cursor, granularidad);
    const existente = porClave.get(clave);
    resultado.push(
      existente ?? {
        fecha: formatearBucket(cursor, granularidad),
        ventas: 0,
        ganancia: 0,
        cantidad: 0,
      }
    );
    avanzarBucket(cursor, granularidad);
  }

  return resultado;
}
