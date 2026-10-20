import type { SQLiteDatabase } from 'expo-sqlite';
import * as Network from 'expo-network';
import createServer, { type Server } from 'react-native-pocket-server';
import { crearRouterMenu } from './menu/router';

export const PUERTO_PREDETERMINADO = 8080;

let instancia: Server | null = null;
let puertoActual = PUERTO_PREDETERMINADO;
let ultimoError: string | null = null;

export interface ResultadoInicio {
  ok: boolean;
  error?: string;
}

export function servidorActivo(): boolean {
  return instancia != null;
}

export function puertoServidor(): number {
  return puertoActual;
}

export function mensajeErrorServidor(): string | null {
  return ultimoError;
}

export function iniciarServidor(db: SQLiteDatabase, puerto = PUERTO_PREDETERMINADO): ResultadoInicio {
  if (instancia != null) {
    return { ok: true };
  }
  ultimoError = null;
  const servidor = createServer();
  servidor.onLog((mensaje) => {
    if (mensaje.includes('Server error')) {
      ultimoError = mensaje;
    }
    console.log('[menu]', mensaje);
  });
  servidor.use(crearRouterMenu(db));
  try {
    servidor.listen(puerto);
  } catch (error) {
    ultimoError = error instanceof Error ? error.message : String(error);
    return { ok: false, error: ultimoError };
  }
  instancia = servidor;
  puertoActual = puerto;
  return { ok: true };
}

export function detenerServidor(): void {
  if (instancia == null) return;
  try {
    instancia.close();
  } catch {
    // Ignorado: cerrar un servidor ya detenido no debe romper la UI.
  }
  instancia = null;
}

export async function urlLan(): Promise<string | null> {
  try {
    const ip = await Network.getIpAddressAsync();
    if (!ip || ip === '0.0.0.0' || ip.startsWith('127.')) return null;
    return `http://${ip}:${puertoActual}`;
  } catch {
    return null;
  }
}

export function urlLocal(): string {
  return `http://127.0.0.1:${puertoActual}`;
}
