import type { SQLiteDatabase } from 'expo-sqlite';
import { eliminarArchivos } from '../../fotos/almacen';
import type { BebidaFoto, EstadoFotosFormulario, FotoEntrada } from '../../domain/tipos';

export const MAX_FOTOS_POR_BEBIDA = 6;

export async function listarFotosBebida(
  db: SQLiteDatabase,
  bebidaId: number
): Promise<BebidaFoto[]> {
  return db.getAllAsync<BebidaFoto>(
    'SELECT * FROM bebida_fotos WHERE bebida_id = ? ORDER BY orden ASC, id ASC',
    bebidaId
  );
}

export async function listarFotosDeTodas(
  db: SQLiteDatabase
): Promise<Record<number, BebidaFoto[]>> {
  const filas = await db.getAllAsync<BebidaFoto>(
    'SELECT * FROM bebida_fotos ORDER BY bebida_id ASC, orden ASC, id ASC'
  );
  const agrupado: Record<number, BebidaFoto[]> = {};
  for (const fila of filas) {
    if (agrupado[fila.bebida_id] == null) {
      agrupado[fila.bebida_id] = [];
    }
    agrupado[fila.bebida_id].push(fila);
  }
  return agrupado;
}

async function siguienteOrden(db: SQLiteDatabase, bebidaId: number): Promise<number> {
  const fila = await db.getFirstAsync<{ maximo: number | null }>(
    'SELECT MAX(orden) AS maximo FROM bebida_fotos WHERE bebida_id = ?',
    bebidaId
  );
  return (fila?.maximo ?? -1) + 1;
}

export async function insertarFoto(
  db: SQLiteDatabase,
  bebidaId: number,
  entrada: FotoEntrada,
  orden?: number
): Promise<number> {
  const ordenFinal = orden ?? (await siguienteOrden(db, bebidaId));
  const resultado = await db.runAsync(
    'INSERT INTO bebida_fotos (bebida_id, archivo, orden, ancho, alto) VALUES (?, ?, ?, ?, ?)',
    bebidaId,
    entrada.archivo,
    ordenFinal,
    entrada.ancho,
    entrada.alto
  );
  return resultado.lastInsertRowId;
}

export async function eliminarFoto(
  db: SQLiteDatabase,
  id: number
): Promise<string | null> {
  const fila = await db.getFirstAsync<{ archivo: string }>(
    'SELECT archivo FROM bebida_fotos WHERE id = ?',
    id
  );
  if (!fila) return null;
  await db.runAsync('DELETE FROM bebida_fotos WHERE id = ?', id);
  return fila.archivo;
}

export async function eliminarFotosDeBebida(
  db: SQLiteDatabase,
  bebidaId: number
): Promise<string[]> {
  const filas = await db.getAllAsync<{ archivo: string }>(
    'SELECT archivo FROM bebida_fotos WHERE bebida_id = ?',
    bebidaId
  );
  await db.runAsync('DELETE FROM bebida_fotos WHERE bebida_id = ?', bebidaId);
  return filas.map((fila) => fila.archivo);
}

export async function reordenarFotos(
  db: SQLiteDatabase,
  ids: number[]
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    for (let i = 0; i < ids.length; i += 1) {
      await txn.runAsync('UPDATE bebida_fotos SET orden = ? WHERE id = ?', i, ids[i]);
    }
  });
}

export async function sincronizarFotos(
  db: SQLiteDatabase,
  bebidaId: number,
  estado: EstadoFotosFormulario
): Promise<void> {
  const archivosBorrar: string[] = [];
  for (const id of estado.eliminadosIds) {
    const archivo = await eliminarFoto(db, id);
    if (archivo) archivosBorrar.push(archivo);
  }
  eliminarArchivos(archivosBorrar);

  const idsOrdenados: number[] = [];
  for (let i = 0; i < estado.fotos.length; i += 1) {
    const foto = estado.fotos[i];
    if (foto.id == null) {
      const nuevoId = await insertarFoto(
        db,
        bebidaId,
        { archivo: foto.archivo, ancho: foto.ancho, alto: foto.alto },
        i
      );
      idsOrdenados.push(nuevoId);
    } else {
      idsOrdenados.push(foto.id);
    }
  }
  await reordenarFotos(db, idsOrdenados);
}
