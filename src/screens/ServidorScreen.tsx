import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espaciado, radio } from '../theme/tokens';
import { tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  PUERTO_PREDETERMINADO,
  detenerServidor,
  iniciarServidor,
  mensajeErrorServidor,
  servidorActivo,
  urlLan,
} from '../servidor/servidor';

const ESPERA_ARRANQUE_MS = 400;

export function ServidorScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [activo, setActivo] = useState(servidorActivo());
  const [url, setUrl] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const refrescar = useCallback(async () => {
    const encendido = servidorActivo();
    setActivo(encendido);
    setUrl(encendido ? await urlLan() : null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refrescar();
    }, [refrescar])
  );

  const iniciar = async () => {
    setOcupado(true);
    try {
      iniciarServidor(db, PUERTO_PREDETERMINADO);
      await new Promise((resolver) => setTimeout(resolver, ESPERA_ARRANQUE_MS));
      const error = mensajeErrorServidor();
      if (error != null) {
        detenerServidor();
        setActivo(false);
        setUrl(null);
        Alert.alert(
          'No se pudo iniciar el menú',
          'Puede que el puerto esté ocupado. Cierra otras apps que usen red e inténtalo de nuevo.'
        );
        return;
      }
      setActivo(true);
      setUrl(await urlLan());
    } finally {
      setOcupado(false);
    }
  };

  const detener = () => {
    detenerServidor();
    setActivo(false);
    setUrl(null);
  };

  const copiar = async () => {
    if (url == null) return;
    await Clipboard.setStringAsync(url);
    Alert.alert('Enlace copiado', 'Compártelo con tus clientes para que vean el menú.');
  };

  return (
    <SafeAreaView style={estilos.safe}>
      <View style={estilos.encabezado}>
        <View style={estilos.titulos}>
          <Text style={tipografia.title}>Menú digital</Text>
          <Text style={tipografia.small}>
            Comparte el menú de bebidas por WiFi. Tus clientes lo abren en el navegador de su
            teléfono.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={estilos.contenido} showsVerticalScrollIndicator={false}>
        <Card style={estilos.card}>
          <View style={estilos.filaEstado}>
            <View style={estilos.infoEstado}>
              <Text style={tipografia.headline}>Servidor del menú</Text>
              <Text style={tipografia.micro}>
                {activo ? 'Visible en tu red local' : 'Detenido'}
              </Text>
            </View>
            <Badge label={activo ? 'Activo' : 'Detenido'} tone={activo ? 'success' : 'muted'} />
          </View>

          {activo && (
            <View style={estilos.bloqueUrl}>
              <Text style={tipografia.caption}>Enlace para tus clientes</Text>
              <View style={estilos.filaUrl}>
                <Text style={estilos.url} selectable numberOfLines={1}>
                  {url ?? 'Calculando dirección…'}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Copiar enlace"
                  onPress={copiar}
                  disabled={url == null}
                  style={estilos.botonCopiar}
                >
                  <Feather name="copy" size={18} color={colores.brand.secondary} />
                </Pressable>
              </View>
              {url == null && (
                <Text style={tipografia.micro}>
                  Conéctate a una red WiFi para obtener una dirección de red local.
                </Text>
              )}
            </View>
          )}

          {activo ? (
            <Button
              label="Detener menú"
              icon="square"
              variant="secondary"
              onPress={detener}
              disabled={ocupado}
            />
          ) : (
            <Button
              label="Iniciar menú"
              icon="play"
              onPress={iniciar}
              disabled={ocupado}
            />
          )}
        </Card>

        <Button
          label="Vista previa"
          icon="eye"
          variant="secondary"
          onPress={() => router.navigate('/menu-preview')}
        />

        <Card style={estilos.nota}>
          <View style={estilos.filaNota}>
            <Feather name="wifi" size={16} color={colores.brand.accent} />
            <Text style={[tipografia.small, estilos.textoNota]}>
              Tus clientes deben estar conectados a la misma red WiFi que este dispositivo.
            </Text>
          </View>
          <View style={estilos.filaNota}>
            <Feather name="eye" size={16} color={colores.brand.accent} />
            <Text style={[tipografia.small, estilos.textoNota]}>
              Solo aparecen las bebidas marcadas como activas en su edición.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado['4xl'],
    paddingBottom: espaciado.md,
  },
  titulos: {
    flex: 1,
    gap: espaciado.xs,
  },
  contenido: {
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado.sm,
    paddingBottom: 200,
    gap: espaciado.lg,
  },
  card: {
    gap: espaciado.lg,
  },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  infoEstado: {
    flex: 1,
    gap: espaciado.xs,
  },
  bloqueUrl: {
    gap: espaciado.sm,
    backgroundColor: colores.bg.subtle,
    borderRadius: radio.md,
    padding: espaciado.md,
  },
  filaUrl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  botonCopiar: {
    width: 44,
    height: 44,
    borderRadius: radio.md,
    backgroundColor: colores.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  url: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: 15,
    color: colores.brand.primary,
  },
  nota: {
    backgroundColor: colores.bg.surfaceElevated,
    gap: espaciado.md,
  },
  filaNota: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
  },
  textoNota: {
    flex: 1,
  },
});
