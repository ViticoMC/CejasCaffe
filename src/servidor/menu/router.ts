import type { SQLiteDatabase } from 'expo-sqlite';
import { Router } from 'react-native-pocket-server';
import { archivoDe } from '../../fotos/almacen';
import { construirMenu } from './datos';
import { generarPagina } from './pagina';

export function crearRouterMenu(db: SQLiteDatabase): Router {
  const router = new Router();

  router.get('/', (req, res) => {
    res.html(generarPagina());
  });

  router.get('/api/menu', async (req, res) => {
    const datos = await construirMenu(db, 'servidor');
    res.json(datos);
  });

  router.get('/foto/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Identificador inválido' });
      return;
    }
    const fila = await db.getFirstAsync<{ archivo: string }>(
      'SELECT archivo FROM bebida_fotos WHERE id = ?',
      id
    );
    if (!fila) {
      res.status(404).json({ error: 'Foto no encontrada' });
      return;
    }
    try {
      const archivo = archivoDe(fila.archivo);
      if (!archivo.exists) {
        res.status(404).json({ error: 'Foto no disponible' });
        return;
      }
      await res.sendFile(archivo);
    } catch {
      res.status(404).json({ error: 'Foto no disponible' });
    }
  });

  return router;
}
