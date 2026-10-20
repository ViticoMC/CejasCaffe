import { Directory, File, Paths } from 'expo-file-system';
import { base64ABytes } from './base64';

const DIRECTORIO = new Directory(Paths.document, 'fotos-bebidas');

function directorioListo(): Directory {
  if (!DIRECTORIO.exists) {
    DIRECTORIO.create({ intermediates: true, idempotent: true });
  }
  return DIRECTORIO;
}

function generarNombre(extension: string): string {
  const limpia = extension.replace(/^\./, '').toLowerCase() || 'jpg';
  const marca = Date.now().toString(36);
  const azar = Math.random().toString(36).slice(2, 8);
  return `foto_${marca}_${azar}.${limpia}`;
}

export function archivoDe(nombre: string): File {
  return new File(directorioListo(), nombre);
}

export function uriDe(nombre: string): string {
  return archivoDe(nombre).uri;
}

export function existeArchivo(nombre: string): boolean {
  return archivoDe(nombre).exists;
}

export function guardarDesdeUri(uriOrigen: string, extension = 'jpg'): string {
  const origen = new File(uriOrigen);
  const nombre = generarNombre(extension);
  const destino = new File(directorioListo(), nombre);
  try {
    origen.move(destino);
  } catch {
    origen.copy(destino);
  }
  return nombre;
}

export function eliminarArchivos(nombres: string[]): void {
  for (const nombre of nombres) {
    try {
      const archivo = archivoDe(nombre);
      if (archivo.exists) archivo.delete();
    } catch {
      // Mejor esfuerzo: un archivo que no se puede borrar no debe romper el flujo.
    }
  }
}

export async function leerBase64(nombre: string): Promise<string> {
  return archivoDe(nombre).base64();
}

export function escribirDesdeBase64(nombre: string, base64: string): void {
  const archivo = new File(directorioListo(), nombre);
  archivo.create({ overwrite: true });
  archivo.write(base64ABytes(base64));
}

export function listarArchivos(): string[] {
  if (!DIRECTORIO.exists) return [];
  return DIRECTORIO.list()
    .filter((item): item is File => item instanceof File)
    .map((item) => item.name);
}

export function limpiarHuerfanos(validos: string[]): void {
  const permitidos = new Set(validos);
  eliminarArchivos(listarArchivos().filter((nombre) => !permitidos.has(nombre)));
}
