import { Feather } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  crearPaquete,
  eliminarPaquete,
  listarPaquetes,
  actualizarPaquete,
} from '../db/repos/paquetes';
import { precioUnitarioDePaquete } from '../domain/calculos';
import type { Ingrediente, NuevoIngrediente, NuevoPaquete, Paquete } from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { useBottomSafe } from '../hooks/useBottomSafe';
import { formatearDinero, tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { FormularioPaquete } from '../ui/FormularioPaquete';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PriceTag } from '../ui/PriceTag';

function parsearPrecio(texto: string): number {
  const normalizado = texto.trim().replace(',', '.');
  const valor = parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : NaN;
}

function formatearCantidad(valor: number): string {
  return valor.toLocaleString('es-MX', { maximumFractionDigits: 3 });
}

interface FormularioProps {
  inicial: Ingrediente | null;
  onGuardar: (dato: NuevoIngrediente) => Promise<void>;
  onCancelar: () => void;
}

function FormularioIngrediente({ inicial, onGuardar, onCancelar }: FormularioProps) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [unidad, setUnidad] = useState(inicial?.unidad ?? '');
  const [stockMinimo, setStockMinimo] = useState(
    inicial != null && inicial.stock_minimo > 0 ? String(inicial.stock_minimo) : ''
  );
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  const validar = (): boolean => {
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length === 0) {
      setErrorNombre('Escribe un nombre para el material.');
      return false;
    }
    setErrorNombre(undefined);
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const minimo = parsearPrecio(stockMinimo);
      await onGuardar({
        nombre: nombre.trim(),
        unidad: unidad.trim(),
        stock_minimo: Number.isFinite(minimo) && minimo > 0 ? minimo : 0,
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
        label="Stock mínimo (alerta)"
        value={stockMinimo}
        onChangeText={setStockMinimo}
        placeholder="Opcional · 0"
        keyboardType="decimal-pad"
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
  const paddingBottom = useBottomSafe();
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<Ingrediente | null>(null);
  const [eliminando, setEliminando] = useState<Ingrediente | null>(null);
  const [usoEliminando, setUsoEliminando] = useState({ bebidas: 0, servicios: 0 });
  const [materialPaquetes, setMaterialPaquetes] = useState<Ingrediente | null>(null);
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [cargandoPaquetes, setCargandoPaquetes] = useState(false);
  const [formPaquete, setFormPaquete] = useState<{ inicial: Paquete | null } | null>(null);
  const [estimadoAbierto, setEstimadoAbierto] = useState<Ingrediente | null>(null);
  const [paquetesEstimado, setPaquetesEstimado] = useState<Paquete[]>([]);
  const [cargandoEstimado, setCargandoEstimado] = useState(false);

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

  const abrirPaquetes = async (ingrediente: Ingrediente) => {
    setMaterialPaquetes(ingrediente);
    setFormPaquete(null);
    setCargandoPaquetes(true);
    try {
      setPaquetes(await listarPaquetes(db, ingrediente.id));
    } finally {
      setCargandoPaquetes(false);
    }
  };

  const cerrarPaquetes = () => {
    setMaterialPaquetes(null);
    setFormPaquete(null);
    setPaquetes([]);
  };

  const refrescarPaquetes = async () => {
    if (materialPaquetes == null) return;
    setPaquetes(await listarPaquetes(db, materialPaquetes.id));
  };

  const guardarPaquete = async (dato: NuevoPaquete) => {
    if (materialPaquetes == null) return;
    if (formPaquete?.inicial != null) {
      await actualizarPaquete(db, formPaquete.inicial.id, dato);
    } else {
      await crearPaquete(db, materialPaquetes.id, dato);
    }
    setFormPaquete(null);
    await refrescarPaquetes();
  };

  const preguntarEliminarPaquete = (paquete: Paquete) => {
    Alert.alert(
      '¿Eliminar paquete?',
      `${paquete.nombre} dejará de estar disponible en el almacén.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarPaquete(db, paquete.id);
            await refrescarPaquetes();
          },
        },
      ]
    );
  };

  const abrirEstimado = async (ingrediente: Ingrediente) => {
    setEstimadoAbierto(ingrediente);
    setCargandoEstimado(true);
    try {
      setPaquetesEstimado(await listarPaquetes(db, ingrediente.id));
    } finally {
      setCargandoEstimado(false);
    }
  };

  const cerrarEstimado = () => {
    setEstimadoAbierto(null);
    setPaquetesEstimado([]);
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
        <View style={estilos.stockGrupo}>
          <Text style={tipografia.micro}>
            Stock {formatearCantidad(item.stock)} {item.unidad.trim()}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver estimado por paquete de ${item.nombre}`}
            onPress={() => void abrirEstimado(item)}
            style={estilos.botonEstimado}
          >
            <Feather name="chevron-down" size={14} color={colores.brand.secondary} />
          </Pressable>
        </View>
        <View style={estilos.botonesAccion}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Paquetes de ${item.nombre}`}
            onPress={() => void abrirPaquetes(item)}
            style={estilos.botonAccion}
          >
            <Feather name="package" size={18} color={colores.brand.primary} />
          </Pressable>
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
          <Text style={tipografia.title}>Materiales</Text>
          <Text style={tipografia.small}>
            {cargando
              ? 'Cargando…'
              : `${ingredientes.length} ${ingredientes.length === 1 ? 'material' : 'materiales'} en el sistema`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir material"
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
          contentContainerStyle={[estilos.lista, { paddingBottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              titulo="Aún no hay materiales"
              texto="El bambú crece con paciencia: añade tu primer material para empezar a construir las recetas."
              accion={{ label: 'Añadir material', onPress: abrirNuevo }}
            />
          }
        />
      )}

      <Modal
        visible={formularioAbierto}
        titulo={editando != null ? 'Editar material' : 'Nuevo material'}
        subtitulo={
          editando != null
            ? 'Actualiza los datos y guarda los cambios.'
            : 'Nombre, unidad de medida y stock mínimo.'
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
        visible={materialPaquetes != null}
        titulo={
          formPaquete == null
            ? 'Paquetes'
            : formPaquete.inicial != null
              ? 'Editar paquete'
              : 'Nuevo paquete'
        }
        subtitulo={
          materialPaquetes != null
            ? formPaquete == null
              ? `${materialPaquetes.nombre} · se usan al registrar entradas en el almacén.`
              : materialPaquetes.nombre
            : undefined
        }
        onClose={cerrarPaquetes}
        scrollable
        footer={
          formPaquete == null ? (
            <Button
              label="Nuevo paquete"
              icon="plus"
              onPress={() => setFormPaquete({ inicial: null })}
              style={estilos.botonMitad}
            />
          ) : undefined
        }
      >
        {formPaquete != null ? (
          <FormularioPaquete
            key={formPaquete.inicial?.id ?? 'nuevo'}
            material={{
              nombre: materialPaquetes?.nombre ?? '',
              unidad: materialPaquetes?.unidad ?? '',
            }}
            inicial={formPaquete.inicial}
            onGuardar={guardarPaquete}
            onCancelar={() => setFormPaquete(null)}
          />
        ) : cargandoPaquetes ? (
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        ) : paquetes.length === 0 ? (
          <EmptyState
            titulo="Aún no hay paquetes"
            texto="Crea paquetes como «Paquete 230 g en $1000» para registrar compras de un solo toque y mantener el precio unitario al día."
            accion={{ label: 'Nuevo paquete', onPress: () => setFormPaquete({ inicial: null }) }}
          />
        ) : (
          paquetes.map((paquete, indice) => {
            const unidad = (materialPaquetes?.unidad ?? '').trim();
            return (
              <View
                key={paquete.id}
                style={[estilos.filaPaquete, indice > 0 && estilos.filaPaqueteDividida]}
              >
                <View style={estilos.infoPaquete}>
                  <Text style={tipografia.small} numberOfLines={1}>
                    {paquete.nombre}
                  </Text>
                  <Text style={tipografia.micro}>
                    {formatearCantidad(paquete.cantidad)} {unidad} ·{' '}
                    {formatearDinero(precioUnitarioDePaquete(paquete))}
                    {unidad !== '' && ` por ${unidad}`}
                  </Text>
                </View>
                <PriceTag precio={paquete.precio} />
                <View style={estilos.botonesAccion}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${paquete.nombre}`}
                    onPress={() => setFormPaquete({ inicial: paquete })}
                    style={estilos.botonAccion}
                  >
                    <Feather name="edit-2" size={18} color={colores.brand.secondary} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar ${paquete.nombre}`}
                    onPress={() => preguntarEliminarPaquete(paquete)}
                    style={estilos.botonAccion}
                  >
                    <Feather name="trash-2" size={18} color={colores.funcional.error} />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </Modal>

      <Modal
        visible={estimadoAbierto != null}
        titulo="Estimado por paquete"
        subtitulo={estimadoAbierto?.nombre}
        onClose={cerrarEstimado}
      >
        {cargandoEstimado ? (
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        ) : paquetesEstimado.length === 0 ? (
          <EmptyState
            titulo="Sin paquetes definidos"
            texto="Agrega paquetes a este material para ver el estimado de cuántos caben en el stock actual."
          />
        ) : (
          paquetesEstimado.map((paquete, indice) => {
            const unidad = (estimadoAbierto?.unidad ?? '').trim();
            const estimado =
              paquete.cantidad > 0
                ? estimadoAbierto!.stock / paquete.cantidad
                : 0;
            return (
              <View
                key={paquete.id}
                style={[estilos.filaEstimado, indice > 0 && estilos.filaEstimadoDividida]}
              >
                <View style={estilos.infoEstimado}>
                  <Text style={tipografia.small} numberOfLines={1}>
                    {paquete.nombre}
                  </Text>
                  <Text style={tipografia.micro}>
                    {formatearCantidad(paquete.cantidad)} {unidad} por paquete
                  </Text>
                </View>
                <View style={estilos.estimadoValor}>
                  <Text style={tipografia.headline}>
                    {estimado.toLocaleString('es-MX', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                  <Text style={tipografia.micro}>
                    {estimado >= 1
                      ? `${Math.floor(estimado)} ${Math.floor(estimado) === 1 ? 'paquete completo' : 'paquetes completos'}`
                      : 'menos de 1 paquete'}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </Modal>

      <Modal
        visible={eliminando != null}
        titulo={
          usoEliminando.bebidas > 0 || usoEliminando.servicios > 0
            ? 'Material en uso'
            : '¿Eliminar material?'
        }
        subtitulo={eliminando?.nombre}
        onClose={() => setEliminando(null)}
      >
        {usoEliminando.bebidas > 0 || usoEliminando.servicios > 0 ? (
          <>
            <Text style={tipografia.small}>
              No se puede eliminar: este material está asociado a{' '}
              {[
                usoEliminando.bebidas > 0
                  ? `${usoEliminando.bebidas} ${usoEliminando.bebidas === 1 ? 'bebida' : 'bebidas'}`
                  : null,
                usoEliminando.servicios > 0
                  ? `${usoEliminando.servicios} ${usoEliminando.servicios === 1 ? 'servicio' : 'servicios'}`
                  : null,
              ]
                .filter(Boolean)
                .join(' y ')}
              . Quítalo de sus recetas antes de poder borrarlo.
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
              Este material dejará de estar disponible para nuevas recetas. Esta acción no se
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
  stockGrupo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
  },
  botonEstimado: {
    width: 24,
    height: 24,
    borderRadius: radio.sm,
    backgroundColor: colores.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaEstimado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  filaEstimadoDividida: {
    borderTopWidth: 1,
    borderTopColor: colores.borde.default,
  },
  infoEstimado: {
    flex: 1,
    gap: espaciado.xs,
  },
  estimadoValor: {
    alignItems: 'flex-end',
    gap: espaciado.xs,
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
  filaPaquete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  filaPaqueteDividida: {
    borderTopWidth: 1,
    borderTopColor: colores.borde.default,
  },
  infoPaquete: {
    flex: 1,
    gap: espaciado.xs,
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
