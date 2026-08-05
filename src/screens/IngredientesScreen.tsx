import { Feather } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
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
  actualizarIngrediente,
  contarUsoIngrediente,
  crearIngrediente,
  eliminarIngrediente,
  listarIngredientes,
} from '../db/repos/ingredientes';
import type { Ingrediente, NuevoIngrediente } from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { tipografia } from '../theme/typography';
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
  inicial: Ingrediente | null;
  onGuardar: (dato: NuevoIngrediente) => Promise<void>;
  onCancelar: () => void;
}

function FormularioIngrediente({ inicial, onGuardar, onCancelar }: FormularioProps) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [unidad, setUnidad] = useState(inicial?.unidad ?? '');
  const [precio, setPrecio] = useState(
    inicial != null ? String(inicial.precio_unitario) : ''
  );
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [errorPrecio, setErrorPrecio] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  const validar = (): boolean => {
    const nombreLimpio = nombre.trim();
    const valorPrecio = parsearPrecio(precio);
    let ok = true;
    setErrorNombre(nombreLimpio.length === 0 ? 'Escribe un nombre para el ingrediente.' : undefined);
    if (nombreLimpio.length === 0) ok = false;
    if (Number.isNaN(valorPrecio) || valorPrecio <= 0) {
      setErrorPrecio('El precio unitario debe ser mayor a 0.');
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
        unidad: unidad.trim(),
        precio_unitario: parsearPrecio(precio),
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
        placeholder="p. ej. Café espresso"
        error={errorNombre}
        autoFocus
      />
      <Input
        label="Unidad de medida"
        value={unidad}
        onChangeText={setUnidad}
        placeholder="p. ej. g, ml, pza"
      />
      <Input
        label="Precio unitario"
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

export function IngredientesScreen() {
  const db = useSQLiteContext();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<Ingrediente | null>(null);
  const [eliminando, setEliminando] = useState<Ingrediente | null>(null);
  const [usoEliminando, setUsoEliminando] = useState(0);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setIngredientes(await listarIngredientes(db));
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setFormularioAbierto(true);
  };

  const abrirEdicion = (ingrediente: Ingrediente) => {
    setEditando(ingrediente);
    setFormularioAbierto(true);
  };

  const guardar = async (dato: NuevoIngrediente) => {
    if (editando != null) {
      await actualizarIngrediente(db, editando.id, dato);
    } else {
      await crearIngrediente(db, dato);
    }
    setFormularioAbierto(false);
    setEditando(null);
    await recargar();
  };

  const confirmarEliminar = async () => {
    if (eliminando == null) return;
    await eliminarIngrediente(db, eliminando.id);
    setEliminando(null);
    await recargar();
  };

  const preguntarEliminar = async (ingrediente: Ingrediente) => {
    setUsoEliminando(await contarUsoIngrediente(db, ingrediente.id));
    setEliminando(ingrediente);
  };

  const renderItem = ({ item }: { item: Ingrediente }) => (
    <Card style={estilos.card}>
      <View style={estilos.filaSuperior}>
        <View style={estilos.info}>
          <Text style={tipografia.headline} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Badge label={item.unidad.trim().length > 0 ? item.unidad : 'sin unidad'} tone="info" />
        </View>
        <PriceTag precio={item.precio_unitario} />
      </View>
      <View style={estilos.filaAcciones}>
        <Text style={tipografia.micro}>Precio unitario</Text>
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
            onPress={() => preguntarEliminar(item)}
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
          <Text style={tipografia.title}>Ingredientes</Text>
          <Text style={tipografia.small}>
            {cargando
              ? 'Cargando…'
              : `${ingredientes.length} ${ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'} en el sistema`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir ingrediente"
          onPress={abrirNuevo}
          style={estilos.botonNuevo}
        >
          <Feather name="plus" size={24} color={colores.texto.onBrand} />
        </Pressable>
      </View>

      {cargando ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        </View>
      ) : (
        <FlatList
          data={ingredientes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              titulo="Aún no hay ingredientes"
              texto="El bambú crece con paciencia: añade tu primer ingrediente para empezar a construir las recetas."
              accion={{ label: 'Añadir ingrediente', onPress: abrirNuevo }}
            />
          }
        />
      )}

      <Modal
        visible={formularioAbierto}
        titulo={editando != null ? 'Editar ingrediente' : 'Nuevo ingrediente'}
        subtitulo={
          editando != null
            ? 'Actualiza los datos y guarda los cambios.'
            : 'Nombre, unidad de medida y precio unitario.'
        }
        onClose={() => {
          setFormularioAbierto(false);
          setEditando(null);
        }}
      >
        <FormularioIngrediente
          key={editando?.id ?? 'nuevo'}
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
        titulo={
          usoEliminando > 0 ? 'Ingrediente en uso' : '¿Eliminar ingrediente?'
        }
        subtitulo={eliminando?.nombre}
        onClose={() => setEliminando(null)}
      >
        {usoEliminando > 0 ? (
          <>
            <Text style={tipografia.small}>
              No se puede eliminar: este ingrediente está asociado a{' '}
              {usoEliminando} {usoEliminando === 1 ? 'bebida' : 'bebidas'}. Quítalo de
              sus recetas antes de poder borrarlo.
            </Text>
            <View style={estilos.footerModal}>
              <Button
                label="Entendido"
                onPress={() => setEliminando(null)}
                style={estilos.botonMitad}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={tipografia.small}>
              Este ingrediente dejará de estar disponible para nuevas recetas. Esta acción no se
              puede deshacer.
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
          </>
        )}
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
    alignItems: 'center',
    gap: espaciado.md,
  },
  info: {
    flex: 1,
    gap: espaciado.xs,
    alignItems: 'flex-start',
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
