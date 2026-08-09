import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import { exportarRespaldo } from './respaldos';

const DIRECTORIO_RESPALDO = new Directory(Paths.document, 'respaldos');
const MIME_JSON = 'application/json';

function dosDigitos(n: number): string {
  return String(n).padStart(2, '0');
}

function nombreDeRespaldo(fecha: Date): string {
  const marcador =
    `${fecha.getFullYear()}${dosDigitos(fecha.getMonth() + 1)}${dosDigitos(fecha.getDate())}` +
    `-${dosDigitos(fecha.getHours())}${dosDigitos(fecha.getMinutes())}${dosDigitos(fecha.getSeconds())}`;
  return `misventas-${marcador}.json`;
}

function directorioListo(): Directory {
  if (!DIRECTORIO_RESPALDO.exists) {
    DIRECTORIO_RESPALDO.create({ intermediates: true, idempotent: true });
  }
  return DIRECTORIO_RESPALDO;
}

export interface RespaldoGuardado {
  nombre: string;
  uri: string;
  creado_en: string;
}

export interface RespaldoCreado {
  nombre: string;
  uri: string;
  creado_en: string;
  contenido: string;
}

export async function listarRespaldos(): Promise<RespaldoGuardado[]> {
  if (!DIRECTORIO_RESPALDO.exists) {
    return [];
  }
  const resultado: RespaldoGuardado[] = [];
  for (const item of DIRECTORIO_RESPALDO.list()) {
    if (!(item instanceof File) || item.extension.toLowerCase() !== '.json') {
      continue;
    }
    let creadoEn = '';
    try {
      const parseado = JSON.parse(await item.text());
      creadoEn = typeof parseado?.creado_en === 'string' ? parseado.creado_en : '';
    } catch {
      creadoEn = '';
    }
    resultado.push({ nombre: item.name, uri: item.uri, creado_en: creadoEn });
  }
  resultado.sort((a, b) => (a.creado_en > b.creado_en ? -1 : a.creado_en < b.creado_en ? 1 : 0));
  return resultado;
}

export async function crearRespaldoEnApp(db: SQLiteDatabase): Promise<RespaldoCreado> {
  const contenido = await exportarRespaldo(db);
  const nombre = nombreDeRespaldo(new Date());
  const archivo = new File(directorioListo(), nombre);
  archivo.create({ overwrite: true });
  archivo.write(contenido);
  const parseado = JSON.parse(contenido) as { creado_en: string };
  return { nombre, uri: archivo.uri, creado_en: parseado.creado_en, contenido };
}

export async function leerRespaldo(uri: string): Promise<string> {
  return new File(uri).text();
}

export async function eliminarRespaldo(uri: string): Promise<void> {
  const archivo = new File(uri);
  if (archivo.exists) {
    archivo.delete();
  }
}

export async function guardarEnCarpetaDelTelefono(
  nombre: string,
  contenido: string
): Promise<boolean> {
  const directorio = (await Directory.pickDirectoryAsync()) as Directory | null;
  if (!directorio) {
    return false;
  }
  const destino = new File(directorio, nombre);
  destino.create({ overwrite: true });
  destino.write(contenido);
  return true;
}

export async function compartirRespaldo(uri: string, nombre: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: MIME_JSON,
    dialogTitle: `Compartir ${nombre}`,
  });
}

export async function elegirRespaldoExterno(): Promise<{ nombre: string; contenido: string } | null> {
  const resultado = await File.pickFileAsync(undefined, MIME_JSON);
  const archivo = (Array.isArray(resultado) ? resultado[0] : resultado) as File;
  if (archivo == null || !archivo.exists) {
    return null;
  }
  const contenido = await archivo.text();
  return { nombre: archivo.name, contenido };
}