import { Feather } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  actualizarInversion,
  crearInversion,
  eliminarInversion,
  listarInversiones,
} from '../db/repos/inversiones';
import { listarVentas } from '../db/repos/ventas';
import type { Inversion, NuevaInversion } from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PriceTag } from '../ui/PriceTag';

function parsearPrecio(texto: string): number {
  const normalizado = texto.trim().replace(',', '.');
  const valor = parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : NaN;
}

interface FormularioProps {
  inicial: Inversion | null;
  onGuardar: (dato: NuevaInversion) => Promise<void>;
  onCancelar: () => void;
}

function FormularioInversion({ inicial, onGuardar, onCancelar }: FormularioProps) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [precio, setPrecio] = useState(inicial != null ? String(inicial.precio) : '');
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [errorPrecio, setErrorPrecio] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  const validar = (): boolean => {
    const valorPrecio = parsearPrecio(precio);
    let ok = true;
    setErrorNombre(nombre.trim().length === 0 ? 'Escribe un nombre para la inversión.' : undefined);
    if (nombre.trim().length === 0) ok = false;
    if (Number.isNaN(valorPrecio) || valorPrecio <= 0) {
      setErrorPrecio('El precio debe ser mayor a 0.');
      ok = false;
    } else {
      setErrorPrecio(undefined);
    }
    return ok;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        descripcion: descripcion.trim().length > 0 ? descripcion.trim() : null,
        precio: parsearPrecio(precio),
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Input
        label="Nombre"
        value={nombre}
        onChangeText={setNombre}
        placeholder="p. ej. Molinillo de café"
        error={errorNombre}
        autoFocus
      />
      <Input
        label="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Opcional"
      />
      <Input
        label="Precio de la inversión"
        value={precio}
        onChangeText={setPrecio}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errorPrecio}
      />
      <View style={estilos.footerFormulario}>
        <Button
          label="Cancelar"
          variant="secondary"
          onPress={onCancelar}
          disabled={guardando}
          style={estilos.botonMitad}
        />
        <Button
          label={inicial != null ? 'Guardar cambios' : 'Agregar'}
          icon="check"
          onPress={guardar}
          disabled={guardando}
          style={estilos.botonMitad}
        />
      </View>
    </>
  );
}

export function InversionesScreen() {
  const db = useSQLiteContext();
  const [inversiones, setInversiones] = useState<Inversion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<Inversion | null>(null);
  const [eliminando, setEliminando] = useState<Inversion | null>(null);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [lista, ventas] = await Promise.all([listarInversiones(db), listarVentas(db)]);
      setInversiones(lista);
      setTotalesVentas({
        totalVentas: ventas.reduce((s, v) => s + v.cantidad * v.precio_unitario, 0),
        totalGanancia: ventas.reduce(
          (s, v) => s + v.cantidad * (v.precio_unitario - v.costo_unitario),
          0
        ),
      });
    } finally {
      setCargando(false);
    }
  }, [db]);

  const [totalesVentas, setTotalesVentas] = useState({ totalVentas: 0, totalGanancia: 0 });

  useEffect(() => {
    recargar();
  }, [recargar]);

  const totalInvertido = useMemo(
    () => inversiones.reduce((s, i) => s + i.precio, 0),
    [inversiones]
  );

  const diferencia = totalesVentas.totalGanancia - totalInvertido;

  const abrirNuevo = () => {
    setEditando(null);
    setFormularioAbierto(true);
  };

  const abrirEdicion = (inversion: Inversion) => {
    setEditando(inversion);
    setFormularioAbierto(true);
  };

  const guardar = async (dato: NuevaInversion) => {
    if (editando != null) {
      await actualizarInversion(db, editando.id, dato);
    } else {
      await crearInversion(db, dato);
    }
    setFormularioAbierto(false);
    setEditando(null);
    await recargar();
  };

  const confirmarEliminar = async () => {
    if (eliminando == null) return;
    await eliminarInversion(db, eliminando.id);
    setEliminando(null);
    await recargar();
  };

  const renderItem = ({ item }: { item: Inversion }) => (
    <Card style={estilos.card}>
      <View style={estilos.filaSuperior}>
        <View style={estilos.info}>
          <Text style={tipografia.headline} numberOfLines={1}>
            {item.nombre}
          </Text>
          {item.descripcion != null && item.descripcion.length > 0 && (
            <Text style={tipografia.small} numberOfLines={2}>
              {item.descripcion}
            </Text>
          )}
        </View>
        <PriceTag precio={item.precio} />
      </View>
      <View style={estilos.filaAcciones}>
        <Badge label="Inversión" tone="info" />
        <View style={estilos.botonesAccion}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar ${item.nombre}`}
            onPress={() => abrirEdicion(item)}
            style={estilos.botonAccion}
          >
            <Feather name="edit-2" size={18} color={colores.brand.secondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${item.nombre}`}
            onPress={() => setEliminando(item)}
            style={estilos.botonAccion}
          >
            <Feather name="trash-2" size={18} color={colores.funcional.error} />
          </Pressable>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={estilos.safe}>
      <View style={estilos.encabezado}>
        <View style={estilos.titulos}>
          <Text style={tipografia.title}>Inversiones</Text>
          <Text style={tipografia.small}>
            {cargando
              ? 'Cargando…'
              : `${inversiones.length} ${inversiones.length === 1 ? 'inversión' : 'inversiones'}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nueva inversión"
          onPress={abrirNuevo}
          style={estilos.botonNuevo}
        >
          <Feather name="plus" size={24} color={colores.texto.onBrand} />
        </Pressable>
      </View>

      <View style={estilos.zonaResumen}>
        <Card style={estilos.resumenCard}>
          <View style={estilos.filaResumen}>
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Total invertido</Text>
              <Text style={[estilos.valorResumen, { color: colores.brand.primary }]}>
                {formatearDinero(totalInvertido)}
              </Text>
            </View>
            <View style={estilos.divisorResumen} />
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Ventas</Text>
              <Text style={[estilos.valorResumen, { color: colores.texto.secondary }]}>
                {formatearDinero(totalesVentas.totalVentas)}
              </Text>
            </View>
            <View style={estilos.divisorResumen} />
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Ganancias</Text>
              <Text
                style={[
                  estilos.valorResumen,
                  {
                    color:
                      totalesVentas.totalGanancia >= 0
                        ? colores.funcional.success
                        : colores.funcional.error,
                  },
                ]}
              >
                {formatearDinero(totalesVentas.totalGanancia)}
              </Text>
            </View>
          </View>
          <View style={estilos.separadorResumen} />
          <Text style={[tipografia.micro, estilos.comparacion]}>
            {inversiones.length === 0
              ? 'Registra tus inversiones para compararlas con ventas y ganancias.'
              : diferencia >= 0
                ? `Inversión recuperada · Ganancia sobre lo invertido +${formatearDinero(diferencia)}`
                : `Falta por recuperar ${formatearDinero(Math.abs(diferencia))} de tu inversión`}
          </Text>
        </Card>
      </View>

      {cargando ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        </View>
      ) : (
        <FlatList
          data={inversiones}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              titulo="Aún no hay inversiones"
              texto="El bambú crece con paciencia: registra cada gasto que haces en tu local para saber cuánto has invertido."
              accion={{ label: 'Nueva inversión', onPress: abrirNuevo }}
            />
          }
        />
      )}

      <Modal
        visible={formularioAbierto}
        titulo={editando != null ? 'Editar inversión' : 'Nueva inversión'}
        subtitulo={
          editando != null
            ? 'Actualiza los datos y guarda los cambios.'
            : 'Nombre, descripción y el precio invertido.'
        }
        onClose={() => {
          setFormularioAbierto(false);
          setEditando(null);
        }}
      >
        <FormularioInversion
          key={editando?.id ?? 'nueva'}
          inicial={editando}
          onGuardar={guardar}
          onCancelar={() => {
            setFormularioAbierto(false);
            setEditando(null);
          }}
        />
      </Modal>

      <Modal
        visible={eliminando != null}
        titulo="¿Eliminar inversión?"
        subtitulo={eliminando?.nombre}
        onClose={() => setEliminando(null)}
      >
        <Text style={tipografia.small}>
          Esta inversión dejará de sumar al total invertido. Esta acción no se puede deshacer.
        </Text>
        <View style={estilos.footerModal}>
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={() => setEliminando(null)}
            style={estilos.botonMitad}
          />
          <Button
            label="Eliminar"
            icon="trash-2"
            variant="danger"
            onPress={confirmarEliminar}
            style={estilos.botonMitad}
          />
        </View>
      </Modal>
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
  botonNuevo: {
    width: 48,
    height: 48,
    borderRadius: radio.md,
    backgroundColor: colores.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.md,
  },
  zonaResumen: {
    paddingHorizontal: espaciado['2xl'],
    paddingBottom: espaciado.md,
  },
  resumenCard: {
    gap: espaciado.sm,
  },
  filaResumen: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  celdaResumen: {
    flex: 1,
    gap: espaciado.xs,
    alignItems: 'center',
  },
  divisorResumen: {
    width: 1,
    height: 36,
    backgroundColor: colores.borde.default,
  },
  valorResumen: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  separadorResumen: {
    height: 1,
    backgroundColor: colores.borde.default,
  },
  comparacion: {
    textAlign: 'center',
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
  card: {
    gap: espaciado.lg,
  },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
  },
  info: {
    flex: 1,
    gap: espaciado.xs,
  },
  filaAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colores.borde.default,
    paddingTop: espaciado.md,
  },
  botonesAccion: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  botonAccion: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    backgroundColor: colores.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerFormulario: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginTop: espaciado.xs,
  },
  footerModal: {
    flexDirection: 'row',
    gap: espaciado.md,
  },
  botonMitad: {
    flex: 1,
  },
});
