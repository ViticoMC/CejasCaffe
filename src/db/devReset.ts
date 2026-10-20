import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import { limpiarHuerfanos } from '../fotos/almacen';

const TOKEN_RESET = process.env.EXPO_PUBLIC_DB_RESET;

const MARCA = new File(Paths.document, 'db-reset.token');

function leerTokenAplicado(): string {
  try {
    return MARCA.exists ? MARCA.textSync() : '';
  } catch {
    return '';
  }
}

function guardarTokenAplicado(token: string): void {
  try {
    MARCA.create({ overwrite: true, intermediates: true });
    MARCA.write(token);
  } catch (error) {
    console.warn('[devReset] No se pudo guardar el token de reinicio', error);
  }
}

export async function reiniciarDbSiSePidio(db: SQLiteDatabase): Promise<void> {
  if (!__DEV__ || !TOKEN_RESET) {
    return;
  }

  if (leerTokenAplicado() === TOKEN_RESET) {
    return;
  }

  try {
    const tablas = await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'"
    );

    await db.execAsync('PRAGMA foreign_keys = OFF;');
    for (const tabla of tablas) {
      await db.execAsync(`DROP TABLE IF EXISTS "${tabla.name}";`);
    }
    await db.execAsync('PRAGMA user_version = 0;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    limpiarHuerfanos([]);

    guardarTokenAplicado(TOKEN_RESET);
  } catch (error) {
    console.warn('[devReset] No se pudo reiniciar la base de datos', error);
  }
}
