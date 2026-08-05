import { Feather } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  actualizarBebida,
  cambiarActivoBebida,
  crearBebida,
  eliminarBebida,
  listarBebidas,
  obtenerReceta,
} from '../db/repos/bebidas';
import { listarIngredientes } from '../db/repos/ingredientes';
import { calcularResumenBebida, type ResumenBebida } from '../domain/calculos';
import type { Bebida, Ingrediente, NuevaBebida } from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PriceTag } from '../ui/PriceTag';
import { Stepper } from '../ui/Stepper';

type BebidaEnLista = Bebida & { resumen: ResumenBebida };

interface LineaReceta {
  ingrediente_id: number;
  nombre_ingrediente: string;
  unidad: string;
  precio_unitario: number;
  cantidad: number;
}

function parsearNumero(texto: string): number {
  const normalizado = texto.trim().replace(',', '.');
  const valor = parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : NaN;
}

interface SelectorProps {
  visible: boolean;
  disponibles: Ingrediente[];
  onElegir: (ingrediente: Ingrediente) => void;
  onClose: () => void;
}

function SelectorIngredientes({ visible, disponibles, onElegir, onClose }: SelectorProps) {
  const { height } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      titulo="Agregar ingrediente"
      subtitulo="Toca un ingrediente para añadirlo a la receta."
      onClose={onClose}
    >
      {disponibles.length === 0 ? (
        <Text style={[tipografia.small, estilos.sinOpciones]}>
          No quedan ingredientes sin agregar. Crea más en la pestaña Ingredientes.
        </Text>
      ) : (
        <FlatList
          data={disponibles}
          keyExtractor={(item) => String(item.id)}
          style={{ maxHeight: height * 0.45 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Agregar ${item.nombre}`}
              onPress={() => onElegir(item)}
              style={({ pressed }) => [
                estilos.opcionIngrediente,
                pressed && estilos.presionado,
              ]}
            >
              <View style={estilos.infoOpcion}>
                <Text style={tipografia.small} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text style={tipografia.micro}>
                  {item.unidad} · {formatearDinero(item.precio_unitario)}
                </Text>
              </View>
              <View style={estilos.iconoMas}>
                <Feather name="plus" size={16} color={colores.brand.primary} />
              </View>
            </Pressable>
          )}
        />
      )}
    </Modal>
  );
}

interface FormularioProps {
  visible: boolean;
  inicial: Bebida | null;
  onGuardar: (dato: NuevaBebida) => Promise<void>;
  onCancelar: () => void;
}

function FormularioBebida({ visible, inicial, onGuardar, onCancelar }: FormularioProps) {
  const db = useSQLiteContext();
  const { height } = useWindowDimensions();
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [porcentaje, setPorcentaje] = useState(
    inicial != null ? String(inicial.porcentaje_ganancia) : '40'
  );
  const [lineas, setLineas] = useState<LineaReceta[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [cargandoReceta, setCargandoReceta] = useState(inicial != null);
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [errorPorcentaje, setErrorPorcentaje] = useState<string | undefined>();
  const [errorReceta, setErrorReceta] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarIngredientes(db).then((lista) => {
      if (vigente) setIngredientes(lista);
    });
    if (inicial != null) {
      obtenerReceta(db, inicial.id).then((receta) => {
        if (!vigente) return;
        setLineas(
          receta.map((r) => ({
            ingrediente_id: r.ingrediente_id,
            nombre_ingrediente: r.nombre_ingrediente,
            unidad: r.unidad,
            precio_unitario: r.precio_unitario,
            cantidad: r.cantidad,
          }))
        );
        setCargandoReceta(false);
      });
    }
    return () => {
      vigente = false;
    };
  }, [db, inicial]);

  const porcentajeNumero = parsearNumero(porcentaje);
  const resumen = useMemo(
    () =>
      calcularResumenBebida(lineas, Number.isFinite(porcentajeNumero) ? porcentajeNumero : 0),
    [lineas, porcentajeNumero]
  );

  const disponibles = useMemo(
    () => ingredientes.filter((ing) => !lineas.some((l) => l.ingrediente_id === ing.id)),
    [ingredientes, lineas]
  );

  const agregarIngrediente = (ing: Ingrediente) => {
    setLineas((prev) => [
      ...prev,
      {
        ingrediente_id: ing.id,
        nombre_ingrediente: ing.nombre,
        unidad: ing.unidad,
        precio_unitario: ing.precio_unitario,
        cantidad: 1,
      },
    ]);
    setSelectorAbierto(false);
    setErrorReceta(undefined);
  };

  const cambiarCantidad = (ingredienteId: number, cantidad: number) => {
    setLineas((prev) =>
      prev.map((l) => (l.ingrediente_id === ingredienteId ? { ...l, cantidad } : l))
    );
  };

  const quitarIngrediente = (ingredienteId: number) => {
    setLineas((prev) => prev.filter((l) => l.ingrediente_id !== ingredienteId));
  };

  const validar = (): boolean => {
    let ok = true;
    setErrorNombre(nombre.trim().length === 0 ? 'Escribe un nombre para la bebida.' : undefined);
    if (nombre.trim().length === 0) ok = false;
    if (Number.isNaN(porcentajeNumero) || porcentajeNumero < 0) {
      setErrorPorcentaje('El porcentaje debe ser un número mayor o igual a 0.');
      ok = false;
    } else {
      setErrorPorcentaje(undefined);
    }
    if (lineas.length === 0) {
      setErrorReceta('Agrega al menos un ingrediente a la receta.');
      ok = false;
    } else {
      setErrorReceta(undefined);
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
        porcentaje_ganancia: porcentajeNumero,
        receta: lineas.map((l) => ({ ingrediente_id: l.ingrediente_id, cantidad: l.cantidad })),
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        titulo={inicial != null ? 'Editar bebida' : 'Nueva bebida'}
        subtitulo={
          inicial != null
            ? 'Ajusta los datos y la receta, luego guarda.'
            : 'Nombre, ganancia y los ingredientes que la componen.'
        }
        onClose={onCancelar}
        scrollable
        maxAlturaCuerpo={height * 0.55}
        footer={
          <>
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={onCancelar}
              disabled={guardando}
              style={estilos.botonMitad}
            />
            <Button
              label={inicial != null ? 'Guardar cambios' : 'Agregar bebida'}
              icon="check"
              onPress={guardar}
              disabled={guardando}
              style={estilos.botonMitad}
            />
          </>
        }
      >
        <Input
          label="Nombre"
          value={nombre}
          onChangeText={setNombre}
          placeholder="p. ej. Café de olla"
          error={errorNombre}
        />
        <Input
          label="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Opcional"
        />
        <Input
          label="Porcentaje de ganancia"
          value={porcentaje}
          onChangeText={setPorcentaje}
          placeholder="40"
          keyboardType="decimal-pad"
          error={errorPorcentaje}
        />

        <Card style={estilos.resumen}>
          <View style={estilos.filaResumen}>
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Costo producción</Text>
              <Text style={[tipografia.body, estilos.valorResumen]}>
                {formatearDinero(resumen.costoProduccion)}
              </Text>
            </View>
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Ganancia</Text>
              <Text style={[tipografia.body, estilos.valorResumen]}>
                {Number.isFinite(porcentajeNumero) ? porcentajeNumero : 0}%
              </Text>
            </View>
          </View>
          <View style={estilos.separadorResumen} />
          <View style={estilos.filaPrecio}>
            <View>
              <Text style={tipografia.micro}>Precio sugerido</Text>
              <Text style={tipografia.precio}>{formatearDinero(resumen.precioVenta)}</Text>
            </View>
            <Text style={tipografia.micro}>
              Ganancia por venta {formatearDinero(resumen.gananciaPorVenta)}
            </Text>
          </View>
        </Card>

        <View style={estilos.tituloSeccion}>
          <Text style={tipografia.headline}>Receta</Text>
          {lineas.length > 0 && (
            <Text style={tipografia.micro}>{lineas.length} ingredientes</Text>
          )}
        </View>

        {cargandoReceta ? (
          <ActivityIndicator color={colores.brand.secondary} />
        ) : (
          <>
            {lineas.map((linea) => (
              <View key={linea.ingrediente_id} style={estilos.lineaIngrediente}>
                <View style={estilos.filaNombreLinea}>
                  <View style={estilos.infoLinea}>
                    <Text style={tipografia.small} numberOfLines={1}>
                      {linea.nombre_ingrediente}
                    </Text>
                    <Text style={tipografia.micro}>
                      {linea.unidad} · {formatearDinero(linea.precio_unitario)}/{linea.unidad}
                    </Text>
                  </View>
                  <Text style={[tipografia.small, estilos.subtotalLinea]}>
                    {formatearDinero(linea.cantidad * linea.precio_unitario)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${linea.nombre_ingrediente}`}
                    onPress={() => quitarIngrediente(linea.ingrediente_id)}
                    style={estilos.botonQuitar}
                  >
                    <Feather name="x" size={18} color={colores.texto.muted} />
                  </Pressable>
                </View>
                <View style={estilos.filaStepper}>
                  <Text style={tipografia.micro}>Cantidad</Text>
                  <Stepper
                    valor={linea.cantidad}
                    onChange={(cantidad) => cambiarCantidad(linea.ingrediente_id, cantidad)}
                  />
                </View>
              </View>
            ))}

            <Button
              label="Agregar ingrediente"
              icon="plus"
              variant="secondary"
              onPress={() => setSelectorAbierto(true)}
            />
            {errorReceta != null && (
              <Text style={[tipografia.micro, estilos.errorReceta]}>{errorReceta}</Text>
            )}
          </>
        )}
      </Modal>

      <SelectorIngredientes
        visible={selectorAbierto}
        disponibles={disponibles}
        onElegir={agregarIngrediente}
        onClose={() => setSelectorAbierto(false)}
      />
    </>
  );
}

export function BebidasScreen() {
  const db = useSQLiteContext();
  const [bebidas, setBebidas] = useState<BebidaEnLista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<Bebida | null>(null);
  const [eliminando, setEliminando] = useState<BebidaEnLista | null>(null);
  const [sesionFormulario, setSesionFormulario] = useState(0);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await listarBebidas(db);
      const conResumen = await Promise.all(
        lista.map(async (bebida) => {
          const receta = await obtenerReceta(db, bebida.id);
          return {
            ...bebida,
            resumen: calcularResumenBebida(receta, bebida.porcentaje_ganancia),
          };
        })
      );
      setBebidas(conResumen);
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const abrirNuevo = () => {
    setEditando(null);
    setSesionFormulario((s) => s + 1);
    setFormularioAbierto(true);
  };

  const abrirEdicion = (bebida: Bebida) => {
    setEditando(bebida);
    setSesionFormulario((s) => s + 1);
    setFormularioAbierto(true);
  };

  const guardar = async (dato: NuevaBebida) => {
    if (editando != null) {
      await actualizarBebida(db, editando.id, dato);
    } else {
      await crearBebida(db, dato);
    }
    setFormularioAbierto(false);
    setEditando(null);
    await recargar();
  };

  const confirmarEliminar = async () => {
    if (eliminando == null) return;
    await eliminarBebida(db, eliminando.id);
    setEliminando(null);
    await recargar();
  };

  const alternarActivo = async (bebida: BebidaEnLista) => {
    await cambiarActivoBebida(db, bebida.id, !bebida.activo);
    await recargar();
  };

  const renderItem = ({ item }: { item: BebidaEnLista }) => (
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
        <PriceTag
          precio={item.resumen.precioVenta}
          costo={item.resumen.costoProduccion}
          ganancia={item.resumen.gananciaPorVenta}
        />
      </View>
      <View style={estilos.filaAcciones}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.activo ? 'Marcar como inactiva' : 'Marcar como activa'}
          onPress={() => alternarActivo(item)}
        >
          <Badge label={item.activo ? 'Activa' : 'Inactiva'} tone={item.activo ? 'success' : 'muted'} />
        </Pressable>
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
          <Text style={tipografia.title}>Bebidas</Text>
          <Text style={tipografia.small}>
            {cargando
              ? 'Cargando…'
              : `${bebidas.length} ${bebidas.length === 1 ? 'bebida' : 'bebidas'} en el sistema`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nueva bebida"
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
          data={bebidas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              titulo="Aún no hay bebidas"
              texto="El bambú crece con paciencia: crea tu primera bebida y añade los ingredientes de su receta."
              accion={{ label: 'Nueva bebida', onPress: abrirNuevo }}
            />
          }
        />
      )}

      <FormularioBebida
        key={`${sesionFormulario}-${editando?.id ?? 'nueva'}`}
        visible={formularioAbierto}
        inicial={editando}
        onGuardar={guardar}
        onCancelar={() => {
          setFormularioAbierto(false);
          setEditando(null);
        }}
      />

      <Modal
        visible={eliminando != null}
        titulo="¿Eliminar bebida?"
        subtitulo={eliminando?.nombre}
        onClose={() => setEliminando(null)}
      >
        <Text style={tipografia.small}>
          Esta bebida y su receta se eliminarán. Esta acción no se puede deshacer.
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
  resumen: {
    backgroundColor: colores.bg.surfaceElevated,
    gap: espaciado.md,
  },
  filaResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  celdaResumen: {
    gap: espaciado.xs,
  },
  valorResumen: {
    fontVariant: ['tabular-nums'],
    color: colores.texto.primary,
  },
  separadorResumen: {
    height: 1,
    backgroundColor: colores.borde.default,
  },
  filaPrecio: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tituloSeccion: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: espaciado.xs,
  },
  lineaIngrediente: {
    backgroundColor: colores.bg.subtle,
    borderRadius: radio.md,
    padding: espaciado.md,
    gap: espaciado.md,
  },
  filaNombreLinea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  infoLinea: {
    flex: 1,
    gap: espaciado.xs,
  },
  subtotalLinea: {
    fontFamily: 'Fraunces_600SemiBold',
    fontVariant: ['tabular-nums'],
    color: colores.brand.secondary,
  },
  botonQuitar: {
    width: 32,
    height: 32,
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorReceta: {
    color: colores.funcional.error,
    textAlign: 'center',
  },
  sinOpciones: {
    textAlign: 'center',
  },
  opcionIngrediente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde.default,
  },
  infoOpcion: {
    flex: 1,
    gap: espaciado.xs,
  },
  iconoMas: {
    width: 32,
    height: 32,
    borderRadius: radio.pill,
    backgroundColor: 'rgba(90, 122, 76, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presionado: {
    opacity: 0.55,
  },
  footerModal: {
    flexDirection: 'row',
    gap: espaciado.md,
  },
  botonMitad: {
    flex: 1,
  },
});
