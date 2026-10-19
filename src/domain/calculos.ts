export interface CostoRecetaItem {
  cantidad: number;
  precio_unitario: number;
}

export function redondearDinero(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function precioUnitarioDePaquete(paquete: {
  cantidad: number;
  precio: number;
}): number {
  if (paquete.cantidad <= 0) return 0;
  return paquete.precio / paquete.cantidad;
}

export function calcularCostoProduccion(receta: CostoRecetaItem[]): number {
  return redondearDinero(
    receta.reduce((total, item) => total + item.cantidad * item.precio_unitario, 0)
  );
}

export function calcularPrecioVenta(costoProduccion: number, porcentajeGanancia: number): number {
  const precioBase = redondearDinero(costoProduccion * (1 + porcentajeGanancia / 100));
  return Math.ceil(precioBase / 10) * 10;
}

export function calcularGananciaPorVenta(costoProduccion: number, precioVenta: number): number {
  return redondearDinero(precioVenta - costoProduccion);
}

export interface ResumenReceta {
  costoProduccion: number;
  precioVenta: number;
  gananciaPorVenta: number;
}

export function calcularResumenReceta(
  receta: CostoRecetaItem[],
  porcentajeGanancia: number
): ResumenReceta {
  const costoProduccion = calcularCostoProduccion(receta);
  const precioVenta = calcularPrecioVenta(costoProduccion, porcentajeGanancia);
  return {
    costoProduccion,
    precioVenta,
    gananciaPorVenta: calcularGananciaPorVenta(costoProduccion, precioVenta),
  };
}
