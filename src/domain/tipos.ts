export interface Ingrediente {
  id: number;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  stock: number;
  stock_minimo: number;
  creado_en: string;
  actualizado_en: string;
}

export interface NuevoIngrediente {
  nombre: string;
  unidad: string;
  stock_minimo?: number;
}

export interface Paquete {
  id: number;
  ingrediente_id: number;
  nombre: string;
  cantidad: number;
  precio: number;
  creado_en: string;
  actualizado_en: string;
}

export interface NuevoPaquete {
  nombre: string;
  cantidad: number;
  precio: number;
}

export type TipoMovimiento = 'entrada' | 'salida' | 'ajuste';

export interface MovimientoInventario {
  id: number;
  ingrediente_id: number;
  tipo: TipoMovimiento;
  cantidad: number;
  motivo: string | null;
  venta_id: number | null;
  inversion_id: number | null;
  paquete_id: number | null;
  creado_en: string;
}

export interface ItemMovimiento extends MovimientoInventario {
  nombre_ingrediente: string;
  unidad: string;
  nombre_paquete: string | null;
}

interface EntradaBase {
  ingrediente_id: number;
  motivo?: string | null;
}

export interface EntradaPorPaquete extends EntradaBase {
  paquete_id: number;
  paquetes: number;
  precioPaquete?: number;
}

export interface EntradaPorCantidad extends EntradaBase {
  cantidad: number;
  costoTotal: number;
}

export type EntradaInventario = EntradaPorPaquete | EntradaPorCantidad;

export interface AjusteInventario {
  ingrediente_id: number;
  cantidadNueva: number;
  motivo?: string | null;
}

export interface Bebida {
  id: number;
  nombre: string;
  descripcion: string | null;
  porcentaje_ganancia: number;
  costo_produccion: number;
  precio_venta: number;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface BebidaIngrediente {
  id: number;
  bebida_id: number;
  ingrediente_id: number;
  cantidad: number;
}

export interface BebidaFoto {
  id: number;
  bebida_id: number;
  archivo: string;
  orden: number;
  ancho: number | null;
  alto: number | null;
  creado_en: string;
}

export interface FotoEntrada {
  archivo: string;
  ancho: number | null;
  alto: number | null;
}

export interface FotoEnFormulario {
  id: number | null;
  archivo: string;
  ancho: number | null;
  alto: number | null;
}

export interface EstadoFotosFormulario {
  fotos: FotoEnFormulario[];
  eliminadosIds: number[];
}

export interface ItemReceta {
  id: number;
  bebida_id: number;
  ingrediente_id: number;
  nombre_ingrediente: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
}

export interface RecetaDato {
  ingrediente_id: number;
  cantidad: number;
}

export interface NuevaBebida {
  nombre: string;
  descripcion?: string | null;
  porcentaje_ganancia: number;
  receta: RecetaDato[];
  activo?: boolean;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string | null;
  porcentaje_ganancia: number;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface ServicioMaterial {
  id: number;
  servicio_id: number;
  ingrediente_id: number;
  cantidad: number;
}

export interface ItemServicioMaterial {
  id: number;
  servicio_id: number;
  ingrediente_id: number;
  nombre_ingrediente: string;
  unidad: string;
  cantidad: number;
  precio_unitario: number;
}

export interface NuevoServicio {
  nombre: string;
  descripcion?: string | null;
  porcentaje_ganancia: number;
  receta: RecetaDato[];
}

export type TipoProducto = 'bebida' | 'servicio';

export interface ProductoVenta {
  tipo: TipoProducto;
  id: number;
}

export interface Venta {
  id: number;
  bebida_id: number | null;
  servicio_id: number | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  creado_en: string;
}

export interface NuevaVenta {
  producto: ProductoVenta;
  cantidad: number;
  fecha?: string;
}

export interface FaltanteStock {
  ingrediente_id: number;
  nombre: string;
  unidad: string;
  disponible: number;
  requerido: number;
}

export interface FiltroVentas {
  desde?: string;
  hasta?: string;
  bebida_id?: number;
  servicio_id?: number;
  tipo?: TipoProducto;
}

export interface ResumenVentas {
  totalVentas: number;
  totalProduccion: number;
  totalGanancia: number;
  numeroVentas: number;
}

export interface Inversion {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  ingrediente_id: number | null;
  cantidad: number | null;
  creado_en: string;
  actualizado_en: string;
}

export interface NuevaInversion {
  nombre: string;
  descripcion?: string | null;
  precio: number;
  ingrediente_id?: number | null;
  cantidad?: number | null;
}
