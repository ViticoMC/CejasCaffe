import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Bebida,
  BebidaIngrediente,
  Ingrediente,
  Inversion,
  MovimientoInventario,
  Servicio,
  ServicioMaterial,
  Venta,
} from '../domain/tipos';

export const ESCHEMA_RESPALDO = 'misventas';
export const VERSION_RESPALDO = 2;

export type FilaBebidaRespaldo = Omit<Bebida, 'activo'> & { activo: 0 | 1 };
export type FilaServicioRespaldo = Omit<Servicio, 'activo'> & { activo: 0 | 1 };

export interface RespaldoDatos {
  ingredientes: Ingrediente[];
  bebidas: FilaBebidaRespaldo[];
  bebida_ingredientes: BebidaIngrediente[];
  servicios: FilaServicioRespaldo[];
  servicio_materiales: ServicioMaterial[];
  ventas: Venta[];
  inversiones: Inversion[];
  movimientos_inventario: MovimientoInventario[];
}

export interface RespaldoCompleto {
  esquema: typeof ESCHEMA_RESPALDO;
  tipo: 'respaldo';
  version: number;
  creado_en: string;
  datos: RespaldoDatos;
}

export interface ResumenRestauracion {
  ingredientes: number;
  bebidas: number;
  servicios: number;
  ventas: number;
  inversiones: number;
  movimientos_inventario: number;
}

const TABLAS_RESPALDO: (keyof RespaldoDatos)[] = [
  'ingredientes',
  'bebidas',
  'bebida_ingredientes',
  'servicios',
  'servicio_materiales',
  'ventas',
  'inversiones',
  'movimientos_inventario',
];

export async function exportarRespaldo(db: SQLiteDatabase): Promise<string> {
  const [ingredientes, bebidas, bebida_ingredientes, servicios, servicio_materiales, ventas, inversiones, movimientos_inventario] =
    await Promise.all([
      db.getAllAsync<Ingrediente>('SELECT * FROM ingredientes'),
      db.getAllAsync<FilaBebidaRespaldo>('SELECT * FROM bebidas'),
      db.getAllAsync<BebidaIngrediente>('SELECT * FROM bebida_ingredientes'),
      db.getAllAsync<FilaServicioRespaldo>('SELECT * FROM servicios'),
      db.getAllAsync<ServicioMaterial>('SELECT * FROM servicio_materiales'),
      db.getAllAsync<Venta>('SELECT * FROM ventas'),
      db.getAllAsync<Inversion>('SELECT * FROM inversiones'),
      db.getAllAsync<MovimientoInventario>('SELECT * FROM movimientos_inventario'),
    ]);

  const respaldo: RespaldoCompleto = {
    esquema: ESCHEMA_RESPALDO,
    tipo: 'respaldo',
    version: VERSION_RESPALDO,
    creado_en: new Date().toISOString(),
    datos: {
      ingredientes,
      bebidas,
      bebida_ingredientes,
      servicios,
      servicio_materiales,
      ventas,
      inversiones,
      movimientos_inventario,
    },
  };

  return JSON.stringify(respaldo, null, 2);
}

function validarRespaldo(contenido: string): RespaldoCompleto {
  let objeto: unknown;
  try {
    objeto = JSON.parse(contenido);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  if (typeof objeto !== 'object' || objeto === null || Array.isArray(objeto)) {
    throw new Error('El archivo no tiene el formato de un respaldo.');
  }

  const candidato = objeto as Partial<RespaldoCompleto>;
  if (candidato.esquema !== ESCHEMA_RESPALDO || candidato.tipo !== 'respaldo') {
    throw new Error('Este archivo no es un respaldo de esta aplicación.');
  }

  const datos = candidato.datos as Partial<RespaldoDatos> | undefined;
  if (typeof datos !== 'object' || datos === null) {
    throw new Error('El respaldo está incompleto (faltan los datos).');
  }

  for (const tabla of TABLAS_RESPALDO) {
    if (!Array.isArray(datos[tabla])) {
      if (tabla === 'movimientos_inventario') {
        (datos as Record<string, unknown>)[tabla] = [];
        continue;
      }
      throw new Error(`El respaldo está incompleto (falta la tabla ${tabla}).`);
    }
  }

  return candidato as unknown as RespaldoCompleto;
}

export function resumenDeContenido(contenido: string): ResumenRestauracion {
  const respaldo = validarRespaldo(contenido);
  return resumenDeRespaldo(respaldo);
}

export function resumenDeRespaldo(respaldo: RespaldoCompleto): ResumenRestauracion {
  const { datos } = respaldo;
  return {
    ingredientes: datos.ingredientes.length,
    bebidas: datos.bebidas.length,
    servicios: datos.servicios.length,
    ventas: datos.ventas.length,
    inversiones: datos.inversiones.length,
    movimientos_inventario: datos.movimientos_inventario.length,
  };
}

export async function restaurarRespaldo(
  db: SQLiteDatabase,
  contenido: string
): Promise<ResumenRestauracion> {
  const respaldo = validarRespaldo(contenido);
  const { datos } = respaldo;

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      DELETE FROM movimientos_inventario;
      DELETE FROM ventas;
      DELETE FROM bebida_ingredientes;
      DELETE FROM servicio_materiales;
      DELETE FROM inversiones;
      DELETE FROM bebidas;
      DELETE FROM servicios;
      DELETE FROM ingredientes;
    `);

    for (const fila of datos.ingredientes) {
      await txn.runAsync(
        `INSERT INTO ingredientes (id, nombre, unidad, precio_unitario, stock, stock_minimo, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.nombre,
        fila.unidad,
        fila.precio_unitario,
        fila.stock ?? 0,
        fila.stock_minimo ?? 0,
        fila.creado_en,
        fila.actualizado_en
      );
    }

    for (const fila of datos.bebidas) {
      await txn.runAsync(
        `INSERT INTO bebidas (id, nombre, descripcion, porcentaje_ganancia, activo, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.nombre,
        fila.descripcion,
        fila.porcentaje_ganancia,
        fila.activo,
        fila.creado_en,
        fila.actualizado_en
      );
    }

    for (const fila of datos.bebida_ingredientes) {
      await txn.runAsync(
        `INSERT INTO bebida_ingredientes (id, bebida_id, ingrediente_id, cantidad)
         VALUES (?, ?, ?, ?)`,
        fila.id,
        fila.bebida_id,
        fila.ingrediente_id,
        fila.cantidad
      );
    }

    for (const fila of datos.servicios) {
      await txn.runAsync(
        `INSERT INTO servicios (id, nombre, descripcion, porcentaje_ganancia, activo, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.nombre,
        fila.descripcion,
        fila.porcentaje_ganancia,
        fila.activo,
        fila.creado_en,
        fila.actualizado_en
      );
    }

    for (const fila of datos.servicio_materiales) {
      await txn.runAsync(
        `INSERT INTO servicio_materiales (id, servicio_id, ingrediente_id, cantidad)
         VALUES (?, ?, ?, ?)`,
        fila.id,
        fila.servicio_id,
        fila.ingrediente_id,
        fila.cantidad
      );
    }

    for (const fila of datos.ventas) {
      await txn.runAsync(
        `INSERT INTO ventas (id, bebida_id, servicio_id, nombre_producto, cantidad, precio_unitario, costo_unitario, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.bebida_id,
        fila.servicio_id,
        fila.nombre_producto,
        fila.cantidad,
        fila.precio_unitario,
        fila.costo_unitario,
        fila.creado_en
      );
    }

    for (const fila of datos.inversiones) {
      await txn.runAsync(
        `INSERT INTO inversiones (id, nombre, descripcion, precio, ingrediente_id, cantidad, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.nombre,
        fila.descripcion,
        fila.precio,
        fila.ingrediente_id ?? null,
        fila.cantidad ?? null,
        fila.creado_en,
        fila.actualizado_en
      );
    }

    for (const fila of datos.movimientos_inventario) {
      await txn.runAsync(
        `INSERT INTO movimientos_inventario (id, ingrediente_id, tipo, cantidad, motivo, venta_id, inversion_id, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.ingrediente_id,
        fila.tipo,
        fila.cantidad,
        fila.motivo,
        fila.venta_id ?? null,
        fila.inversion_id ?? null,
        fila.creado_en
      );
    }
  });

  return resumenDeRespaldo(respaldo);
}