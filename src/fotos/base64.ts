const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const INVERSO: Record<string, number> = {};
for (let i = 0; i < ALFABETO.length; i += 1) {
  INVERSO[ALFABETO[i]] = i;
}

export function base64ABytes(base64: string): Uint8Array {
  const limpio = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const longitud = Math.floor((limpio.length * 3) / 4);
  const bytes = new Uint8Array(longitud);
  let posicion = 0;

  for (let i = 0; i < limpio.length; i += 4) {
    const c0 = INVERSO[limpio[i]] ?? 0;
    const c1 = INVERSO[limpio[i + 1]] ?? 0;
    const c2 = INVERSO[limpio[i + 2]] ?? 0;
    const c3 = INVERSO[limpio[i + 3]] ?? 0;
    const bloque = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;

    if (posicion < longitud) bytes[posicion++] = (bloque >> 16) & 0xff;
    if (posicion < longitud) bytes[posicion++] = (bloque >> 8) & 0xff;
    if (posicion < longitud) bytes[posicion++] = bloque & 0xff;
  }

  return bytes;
}
