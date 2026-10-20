import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import type { FotoEntrada } from '../domain/tipos';
import { guardarDesdeUri } from './almacen';

const ANCHO_MAXIMO = 1280;
const CALIDAD_JPEG = 0.7;

export async function elegirFotos(limite: number): Promise<FotoEntrada[]> {
  if (limite <= 0) return [];

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limite,
    orderedSelection: true,
    quality: 1,
  });

  if (resultado.canceled) return [];

  const entradas: FotoEntrada[] = [];
  for (const asset of resultado.assets.slice(0, limite)) {
    try {
      const contexto = ImageManipulator.manipulate(asset.uri);
      if ((asset.width ?? 0) > ANCHO_MAXIMO) {
        contexto.resize({ width: ANCHO_MAXIMO });
      }
      const imagen = await contexto.renderAsync();
      const guardada = await imagen.saveAsync({
        compress: CALIDAD_JPEG,
        format: SaveFormat.JPEG,
      });
      const archivo = guardarDesdeUri(guardada.uri, 'jpg');
      entradas.push({ archivo, ancho: guardada.width, alto: guardada.height });
    } catch {
      // Si una foto falla, continuamos con las demás.
    }
  }

  return entradas;
}
