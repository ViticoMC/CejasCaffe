import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { construirMenu } from '../servidor/menu/datos';
import { generarPagina } from '../servidor/menu/pagina';
import { colores, espaciado, radio } from '../theme/tokens';
import { tipografia } from '../theme/typography';

export function VistaPreviaScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [pagina, setPagina] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await construirMenu(db, 'incrustado');
      setPagina(generarPagina(datos));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar la vista previa.');
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <SafeAreaView style={estilos.safe} edges={['top']}>
      <View style={estilos.encabezado}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={estilos.botonIcono}
        >
          <Feather name="arrow-left" size={20} color={colores.brand.primary} />
        </Pressable>
        <View style={estilos.titulos}>
          <Text style={tipografia.headline}>Vista previa</Text>
          <Text style={tipografia.micro}>Así lo verán tus clientes</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Recargar vista previa"
          onPress={() => void cargar()}
          style={estilos.botonIcono}
        >
          <Feather name="refresh-cw" size={18} color={colores.brand.secondary} />
        </Pressable>
      </View>

      <View style={estilos.marco}>
        {cargando ? (
          <View style={estilos.centro}>
            <ActivityIndicator color={colores.brand.secondary} size="large" />
          </View>
        ) : error != null ? (
          <View style={estilos.centro}>
            <Text style={[tipografia.small, estilos.error]}>{error}</Text>
          </View>
        ) : pagina != null ? (
          <WebView
            originWhitelist={['*']}
            source={{ html: pagina }}
            style={estilos.webview}
            containerStyle={estilos.webviewContenedor}
            setSupportMultipleWindows={false}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            renderLoading={() => (
              <View style={estilos.centro}>
                <ActivityIndicator color={colores.brand.secondary} size="large" />
              </View>
            )}
            renderError={(errorDomain, errorCode, errorDesc) => (
              <View style={estilos.centro}>
                <Text style={[tipografia.small, estilos.error]}>
                  No se pudo cargar la vista previa ({errorDomain ?? 'error'} {errorCode}: {errorDesc})
                </Text>
              </View>
            )}
            scalesPageToFit={false}
          />
        ) : null}
      </View>
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
    gap: espaciado.md,
    paddingHorizontal: espaciado.lg,
    paddingBottom: espaciado.md,
  },
  titulos: {
    flex: 1,
    gap: 2,
  },
  botonIcono: {
    width: 44,
    height: 44,
    borderRadius: radio.md,
    backgroundColor: colores.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marco: {
    flex: 1,
    marginHorizontal: espaciado.lg,
    marginBottom: espaciado.lg,
    borderRadius: radio.lg,
    backgroundColor: colores.bg.surface,
    borderWidth: 1,
    borderColor: colores.borde.default,
  },
  webviewContenedor: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
  webview: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaciado['2xl'],
  },
  error: {
    color: colores.funcional.error,
    textAlign: 'center',
  },
});
