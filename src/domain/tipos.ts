export interface Ingrediente {
  id: number;
  nombre: string;
  unidad: string;
  precio_unitario: number;
  creado_en: string;
  actualizado_en: string;
}

export interface NuevoIngrediente {
  nombre: string;
  unidad: string;
  precio_unitario: number;
}

export interface Bebida {
  id: number;
  nombre: string;
  descripcion: string | null;
  porcentaje_ganancia: number;
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
}

export interface Venta {
  id: number;
  bebida_id: number | null;
  nombre_bebida: string;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  creado_en: string;
}

export interface NuevaVenta {
  bebida_id: number;
  cantidad: number;
}

export interface FiltroVentas {
  desde?: string;
  hasta?: string;
  bebida_id?: number;
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
  creado_en: string;
  actualizado_en: string;
}

export interface NuevaInversion {
  nombre: string;
  descripcion?: string | null;
  precio: number;
}
