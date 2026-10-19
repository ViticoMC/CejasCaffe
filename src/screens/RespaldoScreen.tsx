import { Feather } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecarga } from '../context/recarga';
import {
  compartirRespaldo,
  crearRespaldoEnApp,
  elegirRespaldoExterno,
  eliminarRespaldo,
  guardarEnCarpetaDelTelefono,
  leerRespaldo,
  listarRespaldos,
  type RespaldoGuardado,
} from '../db/respaldos_archivos';
import { restaurarRespaldo, resumenDeContenido, type ResumenRestauracion } from '../db/respaldos';
import { formatearFechaHora } from '../domain/fechas';
import { colores, espaciado, radio } from '../theme/tokens';
import { tipografia } from '../theme/typography';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';

interface PendienteRestaurar {
  nombre: string;
  contenido: string;
  resumen: ResumenRestauracion;
}

function filaResumen(etiqueta: string, valor: number): string {
  return `${etiqueta}: ${valor}`;
}

export function RespaldoScreen() {
  const db = useSQLiteContext();
  const { recargar } = useRecarga();
  const [respaldos, setRespaldos] = useState<RespaldoGuardado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [pendiente, setPendiente] = useState<PendienteRestaurar | null>(null);

  const cargarLista = useCallback(async () => {
    try {
      setRespaldos(await listarRespaldos());
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  const crearRespaldo = async () => {
    setOcupado(true);
    try {
      const respaldo = await crearRespaldoEnApp(db);
      await cargarLista();

      let guardadoExterno = false;
      if (Platform.OS === 'android') {
        try {
          guardadoExterno = await guardarEnCarpetaDelTelefono(
            respaldo.nombre,
            respaldo.contenido
          );
        } catch {
          guardadoExterno = false;
        }
      } else {
        try {
          await compartirRespaldo(respaldo.uri, respaldo.nombre);
          guardadoExterno = true;
        } catch {
          guardadoExterno = false;
        }
      }

      Alert.alert(
        'Respaldo creado',
        guardadoExterno
          ? `Se guardó una copia en la carpeta que elegiste y otra dentro de la app (${respaldo.nombre}).`
          : `El respaldo quedó guardado dentro de la app (${respaldo.nombre}). Puedes compartirlo o exportarlo cuando quieras.`
      );
    } catch (error) {
      Alert.alert('No se pudo crear el respaldo', mensajeDeError(error));
    } finally {
      setOcupado(false);
    }
  };

  const prepararRespaldoGuardado = async (respaldo: RespaldoGuardado) => {
    setOcupado(true);
    try {
      const contenido = await leerRespaldo(respaldo.uri);
      setPendiente({
        nombre: respaldo.nombre,
        contenido,
        resumen: resumenDeContenido(contenido),
      });
    } catch (error) {
      Alert.alert('No se pudo leer el respaldo', mensajeDeError(error));
    } finally {
      setOcupado(false);
    }
  };

  const prepararRespaldoExterno = async () => {
    setOcupado(true);
    try {
      const elegido = await elegirRespaldoExterno();
      if (!elegido) {
        return;
      }
      setPendiente({
        nombre: elegido.nombre,
        contenido: elegido.contenido,
        resumen: resumenDeContenido(elegido.contenido),
      });
    } catch (error) {
      Alert.alert('No se pudo leer el archivo', mensajeDeError(error));
    } finally {
      setOcupado(false);
    }
  };

  const confirmarRestaurar = async () => {
    if (pendiente == null) {
      return;
    }
    const { nombre, contenido, resumen } = pendiente;
    setOcupado(true);
    try {
      await restaurarRespaldo(db, contenido);
      setPendiente(null);
      recargar();
      Alert.alert(
        'Datos restaurados',
        `Se restauraron ${resumen.ventas} ventas, ${resumen.bebidas} bebidas, ` +
          `${resumen.fotos} fotos, ${resumen.servicios} servicios, ` +
          `${resumen.ingredientes} materiales, ${resumen.paquetes} paquetes, ` +
          `${resumen.inversiones} inversiones y ` +
          `${resumen.movimientos_inventario} movimientos de almacén desde ${nombre}.`
      );
    } catch (error) {
      Alert.alert('No se pudo restaurar', mensajeDeError(error));
    } finally {
      setOcupado(false);
    }
  };

  const eliminar = async (respaldo: RespaldoGuardado) => {
    setOcupado(true);
    try {
      await eliminarRespaldo(respaldo.uri);
      await cargarLista();
    } catch (error) {
      Alert.alert('No se pudo eliminar', mensajeDeError(error));
    } finally {
      setOcupado(false);
    }
  };

  const confirmarEliminar = (respaldo: RespaldoGuardado) => {
    Alert.alert(
      '¿Eliminar respaldo?',
      `Se borrará ${respaldo.nombre} de la app. Los archivos que exportaste a otra carpeta no se ven afectados.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminar(respaldo) },
      ]
    );
  };

  const compartir = async (respaldo: RespaldoGuardado) => {
    setOcupado(true);
    try {
      await compartirRespaldo(respaldo.uri, respaldo.nombre);
    } catch (error) {
      Alert.alert('No se pudo compartir', mensajeDeError(error));
    } finally {
      setOcupado(false);
    }
  };

  const renderItem = ({ item }: { item: RespaldoGuardado }) => (
    <Card style={estilos.card}>
      <View style={estilos.infoRespaldo}>
        <Text style={tipografia.headline} numberOfLines={1}>
          {item.creado_en.length > 0 ? formatearFechaHora(item.creado_en) : item.nombre}
        </Text>
        <Text style={tipografia.micro} numberOfLines={1}>
          {item.nombre}
        </Text>
      </View>
      <View style={estilos.acciones}>
        <Button
          label="Restaurar"
          icon="rotate-ccw"
          onPress={() => prepararRespaldoGuardado(item)}
          disabled={ocupado}
          style={estilos.botonAccion}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Compartir ${item.nombre}`}
          onPress={() => compartir(item)}
          disabled={ocupado}
          style={estilos.botonIcono}
        >
          <Feather name="share-2" size={18} color={colores.brand.secondary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.nombre}`}
          onPress={() => confirmarEliminar(item)}
          disabled={ocupado}
          style={estilos.botonIcono}
        >
          <Feather name="trash-2" size={18} color={colores.funcional.error} />
        </Pressable>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={estilos.safe}>
      <View style={estilos.encabezado}>
        <View style={estilos.titulos}>
          <Text style={tipografia.title}>Respaldos</Text>
          <Text style={tipografia.small}>
            Crea copias de seguridad de tus datos y recupéralos si se pierden.
          </Text>
        </View>
      </View>

      <View style={estilos.accionesPrincipales}>
        <Button
          label="Crear respaldo"
          icon="download"
          onPress={crearRespaldo}
          disabled={ocupado}
        />
        <Button
          label="Restaurar desde archivo"
          icon="upload"
          variant="secondary"
          onPress={prepararRespaldoExterno}
          disabled={ocupado}
        />
      </View>

      {cargando ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        </View>
      ) : (
        <FlatList
          data={respaldos}
          keyExtractor={(item) => item.uri}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            respaldos.length > 0 ? (
              <Text style={estilos.seccion}>Respaldos guardados en la app</Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              titulo="Aún no hay respaldos"
              texto="Crea tu primera copia de seguridad para poder recuperar tus datos en caso de pérdida."
              accion={{ label: 'Crear respaldo', onPress: crearRespaldo }}
            />
          }
        />
      )}

      <Modal
        visible={pendiente != null}
        titulo="Restaurar respaldo"
        subtitulo={pendiente?.nombre}
        onClose={() => setPendiente(null)}
        footer={
          <>
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={() => setPendiente(null)}
              disabled={ocupado}
              style={estilos.botonMitad}
            />
            <Button
              label="Restaurar"
              icon="check"
              onPress={confirmarRestaurar}
              disabled={ocupado}
              style={estilos.botonMitad}
            />
          </>
        }
      >
        <Text style={tipografia.small}>
          Se reemplazarán todos los datos actuales por los del respaldo. Esta acción no se puede
          deshacer.
        </Text>
        {pendiente != null && (
          <Card style={estilos.resumen}>
            <Text style={[tipografia.caption, estilos.resumenTitulo]}>Contendrá:</Text>
            <Text style={tipografia.small}>{filaResumen('Ventas', pendiente.resumen.ventas)}</Text>
            <Text style={tipografia.small}>{filaResumen('Bebidas', pendiente.resumen.bebidas)}</Text>
            <Text style={tipografia.small}>{filaResumen('Fotos', pendiente.resumen.fotos)}</Text>
            <Text style={tipografia.small}>{filaResumen('Servicios', pendiente.resumen.servicios)}</Text>
            <Text style={tipografia.small}>
              {filaResumen('Materiales', pendiente.resumen.ingredientes)}
            </Text>
            <Text style={tipografia.small}>
              {filaResumen('Paquetes', pendiente.resumen.paquetes)}
            </Text>
            <Text style={tipografia.small}>
              {filaResumen('Inversiones', pendiente.resumen.inversiones)}
            </Text>
            <Text style={tipografia.small}>
              {filaResumen('Movimientos de almacén', pendiente.resumen.movimientos_inventario)}
            </Text>
          </Card>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function mensajeDeError(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
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
  accionesPrincipales: {
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado.sm,
    paddingBottom: espaciado.lg,
    gap: espaciado.md,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: {
    paddingHorizontal: espaciado['2xl'],
    paddingBottom: 200,
    gap: espaciado.lg,
  },
  seccion: {
    ...tipografia.caption,
    color: colores.texto.muted,
  },
  card: {
    gap: espaciado.md,
  },
  infoRespaldo: {
    gap: espaciado.xs,
  },
  acciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  botonAccion: {
    flex: 1,
  },
  botonIcono: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    backgroundColor: colores.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumen: {
    backgroundColor: colores.bg.surfaceElevated,
    gap: espaciado.sm,
  },
  resumenTitulo: {
    color: colores.texto.muted,
  },
  botonMitad: {
    flex: 1,
  },
});