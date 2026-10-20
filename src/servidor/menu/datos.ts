import type { SQLiteDatabase } from 'expo-sqlite';
import { leerBase64 } from '../../fotos/almacen';
import { LEMA_NEGOCIO, NOMBRE_NEGOCIO } from './marca';

export type ModoFoto = 'servidor' | 'incrustado';

export interface FotoMenu {
  id: number;
  src: string;
  ancho: number | null;
  alto: number | null;
}

export interface IngredienteMenu {
  id: number;
  nombre: string;
}

export interface BebidaMenu {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  fotos: FotoMenu[];
  ingredientes: IngredienteMenu[];
}

export interface MenuDatos {
  negocio: string;
  lema: string;
  bebidas: BebidaMenu[];
  ingredientes: IngredienteMenu[];
}

interface BebidaFila {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
}

interface FotoFila {
  id: number;
  bebida_id: number;
  archivo: string;
  ancho: number | null;
  alto: number | null;
}

interface RecetaFila {
  bebida_id: number;
  ingrediente_id: number;
  nombre: string;
}

function mimeDeArchivo(archivo: string): string {
  const extension = archivo.split('.').pop()?.toLowerCase();
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'gif') return 'image/gif';
  return 'image/jpeg';
}

async function srcFoto(foto: FotoFila, modo: ModoFoto): Promise<string | null> {
  if (modo === 'servidor') {
    return `/foto/${foto.id}`;
  }
  try {
    const base64 = await leerBase64(foto.archivo);
    if (!base64) return null;
    return `data:${mimeDeArchivo(foto.archivo)};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function construirMenu(
  db: SQLiteDatabase,
  modo: ModoFoto = 'servidor'
): Promise<MenuDatos> {
  const bebidas = await db.getAllAsync<BebidaFila>(
    'SELECT id, nombre, descripcion, precio_venta AS precio FROM bebidas WHERE activo = 1 ORDER BY nombre ASC'
  );

  if (bebidas.length === 0) {
    return { negocio: NOMBRE_NEGOCIO, lema: LEMA_NEGOCIO, bebidas: [], ingredientes: [] };
  }

  const [fotos, recetas] = await Promise.all([
    db.getAllAsync<FotoFila>(
      'SELECT id, bebida_id, archivo, ancho, alto FROM bebida_fotos ORDER BY orden ASC, id ASC'
    ),
    db.getAllAsync<RecetaFila>(
      `SELECT bi.bebida_id, i.id AS ingrediente_id, i.nombre
       FROM bebida_ingredientes bi
       JOIN ingredientes i ON i.id = bi.ingrediente_id
       ORDER BY i.nombre ASC`
    ),
  ]);

  const fotosPorBebida = new Map<number, FotoFila[]>();
  for (const foto of fotos) {
    const lista = fotosPorBebida.get(foto.bebida_id) ?? [];
    lista.push(foto);
    fotosPorBebida.set(foto.bebida_id, lista);
  }

  const recetaPorBebida = new Map<number, IngredienteMenu[]>();
  const ingredientesUnicos = new Map<number, IngredienteMenu>();
  for (const fila of recetas) {
    const lista = recetaPorBebida.get(fila.bebida_id) ?? [];
    lista.push({ id: fila.ingrediente_id, nombre: fila.nombre });
    recetaPorBebida.set(fila.bebida_id, lista);
    if (!ingredientesUnicos.has(fila.ingrediente_id)) {
      ingredientesUnicos.set(fila.ingrediente_id, { id: fila.ingrediente_id, nombre: fila.nombre });
    }
  }

  const bebidasMenu: BebidaMenu[] = [];
  for (const bebida of bebidas) {
    const filasFoto = fotosPorBebida.get(bebida.id) ?? [];
    const fotosMenu: FotoMenu[] = [];
    for (const fila of filasFoto) {
      const src = await srcFoto(fila, modo);
      if (src == null) continue;
      fotosMenu.push({ id: fila.id, src, ancho: fila.ancho, alto: fila.alto });
    }
    bebidasMenu.push({
      id: bebida.id,
      nombre: bebida.nombre,
      descripcion: bebida.descripcion,
      precio: bebida.precio,
      fotos: fotosMenu,
      ingredientes: recetaPorBebida.get(bebida.id) ?? [],
    });
  }

  const ingredientes = Array.from(ingredientesUnicos.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );

  return {
    negocio: NOMBRE_NEGOCIO,
    lema: LEMA_NEGOCIO,
    bebidas: bebidasMenu,
    ingredientes,
  };
}
