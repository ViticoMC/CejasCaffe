import type { SQLiteDatabase } from 'expo-sqlite';
import { calcularPrecioVenta } from '../domain/calculos';
import {
  escribirDesdeBase64,
  existeArchivo,
  leerBase64,
  limpiarHuerfanos,
} from '../fotos/almacen';
import type {
  Bebida,
  BebidaFoto,
  BebidaIngrediente,
  Ingrediente,
  Inversion,
  MovimientoInventario,
  Paquete,
  Servicio,
  ServicioMaterial,
  Venta,
} from '../domain/tipos';

export const ESCHEMA_RESPALDO = 'misventas';
export const VERSION_RESPALDO = 5;

export type FilaBebidaRespaldo = Omit<Bebida, 'activo'> & { activo: 0 | 1 };
export type FilaServicioRespaldo = Omit<Servicio, 'activo'> & { activo: 0 | 1 };
export type FilaFotoRespaldo = BebidaFoto & { base64: string };

export interface RespaldoDatos {
  ingredientes: Ingrediente[];
  paquetes: Paquete[];
  bebidas: FilaBebidaRespaldo[];
  bebida_ingredientes: BebidaIngrediente[];
  bebida_fotos: FilaFotoRespaldo[];
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
  paquetes: number;
  bebidas: number;
  fotos: number;
  servicios: number;
  ventas: number;
  inversiones: number;
  movimientos_inventario: number;
}

const TABLAS_RESPALDO: (keyof RespaldoDatos)[] = [
  'ingredientes',
  'paquetes',
  'bebidas',
  'bebida_ingredientes',
  'bebida_fotos',
  'servicios',
  'servicio_materiales',
  'ventas',
  'inversiones',
  'movimientos_inventario',
];

const TABLAS_OPCIONALES: (keyof RespaldoDatos)[] = [
  'paquetes',
  'movimientos_inventario',
  'bebida_fotos',
];

export async function exportarRespaldo(db: SQLiteDatabase): Promise<string> {
  const [ingredientes, paquetes, bebidas, bebida_ingredientes, servicios, servicio_materiales, ventas, inversiones, movimientos_inventario, fotosFilas] =
    await Promise.all([
      db.getAllAsync<Ingrediente>('SELECT * FROM ingredientes'),
      db.getAllAsync<Paquete>('SELECT * FROM paquetes'),
      db.getAllAsync<FilaBebidaRespaldo>('SELECT * FROM bebidas'),
      db.getAllAsync<BebidaIngrediente>('SELECT * FROM bebida_ingredientes'),
      db.getAllAsync<FilaServicioRespaldo>('SELECT * FROM servicios'),
      db.getAllAsync<ServicioMaterial>('SELECT * FROM servicio_materiales'),
      db.getAllAsync<Venta>('SELECT * FROM ventas'),
      db.getAllAsync<Inversion>('SELECT * FROM inversiones'),
      db.getAllAsync<MovimientoInventario>('SELECT * FROM movimientos_inventario'),
      db.getAllAsync<BebidaFoto>('SELECT * FROM bebida_fotos ORDER BY bebida_id, orden, id'),
    ]);

  const bebida_fotos: FilaFotoRespaldo[] = [];
  for (const fila of fotosFilas) {
    let base64 = '';
    try {
      if (existeArchivo(fila.archivo)) {
        base64 = await leerBase64(fila.archivo);
      }
    } catch {
      base64 = '';
    }
    bebida_fotos.push({ ...fila, base64 });
  }

  const respaldo: RespaldoCompleto = {
    esquema: ESCHEMA_RESPALDO,
    tipo: 'respaldo',
    version: VERSION_RESPALDO,
    creado_en: new Date().toISOString(),
    datos: {
      ingredientes,
      paquetes,
      bebidas,
      bebida_ingredientes,
      bebida_fotos,
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
      if (TABLAS_OPCIONALES.includes(tabla)) {
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
    paquetes: datos.paquetes.length,
    bebidas: datos.bebidas.length,
    fotos: (datos.bebida_fotos ?? []).length,
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
      DELETE FROM bebida_fotos;
      DELETE FROM servicio_materiales;
      DELETE FROM inversiones;
      DELETE FROM bebidas;
      DELETE FROM servicios;
      DELETE FROM paquetes;
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

    for (const fila of datos.paquetes) {
      await txn.runAsync(
        `INSERT INTO paquetes (id, ingrediente_id, nombre, cantidad, precio, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.ingrediente_id,
        fila.nombre,
        fila.cantidad,
        fila.precio,
        fila.creado_en,
        fila.actualizado_en
      );
    }

    for (const fila of datos.bebidas) {
      await txn.runAsync(
        `INSERT INTO bebidas (id, nombre, descripcion, porcentaje_ganancia, precio_venta, activo, creado_en, actualizado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.nombre,
        fila.descripcion,
        fila.porcentaje_ganancia,
        fila.precio_venta ?? 0,
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

    for (const fila of datos.bebida_fotos ?? []) {
      await txn.runAsync(
        `INSERT INTO bebida_fotos (id, bebida_id, archivo, orden, ancho, alto, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.bebida_id,
        fila.archivo,
        fila.orden ?? 0,
        fila.ancho ?? null,
        fila.alto ?? null,
        fila.creado_en
      );
    }

    await txn.runAsync(`
      UPDATE bebidas
      SET costo_produccion = (
        SELECT COALESCE(ROUND(SUM(bi.cantidad * i.precio_unitario), 2), 0)
        FROM bebida_ingredientes bi
        JOIN ingredientes i ON i.id = bi.ingrediente_id
        WHERE bi.bebida_id = bebidas.id
      );
    `);

    for (const fila of datos.bebidas) {
      if (fila.precio_venta == null) {
        const actual = await txn.getFirstAsync<{ costo_produccion: number }>(
          'SELECT costo_produccion FROM bebidas WHERE id = ?',
          fila.id
        );
        await txn.runAsync(
          'UPDATE bebidas SET precio_venta = ? WHERE id = ?',
          calcularPrecioVenta(actual?.costo_produccion ?? 0, fila.porcentaje_ganancia),
          fila.id
        );
      }
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
        `INSERT INTO movimientos_inventario (id, ingrediente_id, tipo, cantidad, motivo, venta_id, inversion_id, paquete_id, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        fila.id,
        fila.ingrediente_id,
        fila.tipo,
        fila.cantidad,
        fila.motivo,
        fila.venta_id ?? null,
        fila.inversion_id ?? null,
        fila.paquete_id ?? null,
        fila.creado_en
      );
    }

    for (const fila of datos.ingredientes) {
      await txn.runAsync('UPDATE ingredientes SET precio_unitario = ? WHERE id = ?', fila.precio_unitario, fila.id);
    }
  });

  const nombresEscritos: string[] = [];
  for (const fila of datos.bebida_fotos ?? []) {
    if (!fila.base64) continue;
    try {
      escribirDesdeBase64(fila.archivo, fila.base64);
      nombresEscritos.push(fila.archivo);
    } catch {
      // Una foto que no se puede escribir no debe abortar toda la restauración.
    }
  }
  limpiarHuerfanos(nombresEscritos);

  return resumenDeRespaldo(respaldo);
}