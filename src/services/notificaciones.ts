import * as Notifications from 'expo-notifications';
import type { SQLiteDatabase } from 'expo-sqlite';
import { obtenerMesasConPedidosVencidos, marcarPedidoNotificado } from '../db/repos/mesas';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Solicita permisos de notificación y configura el handler.
 * Llamar una vez al iniciar la app.
 */
export async function inicializarNotificaciones() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (finalStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.warn('⚠️ Permisos de notificación denegados');
    return false;
  }
  return true;
}

/**
 * Verifica si hay pedidos de mesa que llevan más de 10 minutos
 * sin notificar y envía una notificación push local por cada uno.
 *
 * @param db - Conexión a la base de datos SQLite.
 */
export async function verificarPedidosVencidos(db: SQLiteDatabase) {
  try {
    const vencidos = await obtenerMesasConPedidosVencidos(db, 10);

    for (const mesa of vencidos) {
      // Calcular cuánto tiempo lleva el pedido usando julianday de SQLite
      // para evitar problemas de parseo de fechas entre entornos
      const creado = new Date(mesa.creado_en.replace(' ', 'T') + 'Z');
      const ahora = new Date();
      const diffMs = ahora.getTime() - creado.getTime();
      const minutos = Math.floor(diffMs / 60000);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Pedido pendiente',
          body: `Mesa ${mesa.mesa_nombre} lleva ${minutos} min con pedido sin finalizar.`,
          sound: true,
        },
        trigger: null, // inmediato
      });

      // Marcar como notificado para no repetir
      await marcarPedidoNotificado(db, mesa.mesa_id);
    }
  } catch (e) {
    console.error('Error verificando pedidos vencidos:', e);
  }
}
