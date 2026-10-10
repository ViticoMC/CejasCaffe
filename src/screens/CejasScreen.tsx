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
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listarIngredientes } from '../db/repos/ingredientes';
import {
  actualizarServicio,
  cambiarActivoServicio,
  crearServicio,
  eliminarServicio,
  listarServicios,
  obtenerRecetaServicio,
} from '../db/repos/servicios';
import { calcularResumenReceta, type ResumenReceta } from '../domain/calculos';
import type { Ingrediente, NuevoServicio, Servicio } from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { CantidadInput } from '../ui/CantidadInput';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PriceTag } from '../ui/PriceTag';

type ServicioEnLista = Servicio & { resumen: ResumenReceta };

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

function SelectorMateriales({ visible, disponibles, onElegir, onClose }: SelectorProps) {
  const { height } = useWindowDimensions();
  return (
    <Modal
      visible={visible}
      titulo="Agregar material"
      subtitulo="Toca un material para añadirlo a la receta."
      onClose={onClose}
    >
      {disponibles.length === 0 ? (
        <Text style={[tipografia.small, estilos.sinOpciones]}>
          No quedan materiales sin agregar. Crea más en la pestaña Materiales.
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
                estilos.opcionMaterial,
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
  inicial: Servicio | null;
  onGuardar: (dato: NuevoServicio) => Promise<void>;
  onCancelar: () => void;
}

function FormularioServicio({ visible, inicial, onGuardar, onCancelar }: FormularioProps) {
  const db = useSQLiteContext();
  const { height } = useWindowDimensions();
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(inicial?.descripcion ?? '');
  const [porcentaje, setPorcentaje] = useState(
    inicial != null ? String(inicial.porcentaje_ganancia) : '40'
  );
  const [lineas, setLineas] = useState<LineaReceta[]>([]);
  const [materiales, setMateriales] = useState<Ingrediente[]>([]);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [cargandoReceta, setCargandoReceta] = useState(inicial != null);
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [errorPorcentaje, setErrorPorcentaje] = useState<string | undefined>();
  const [errorReceta, setErrorReceta] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    listarIngredientes(db).then((lista) => {
      if (vigente) setMateriales(lista);
    });
    if (inicial != null) {
      obtenerRecetaServicio(db, inicial.id).then((receta) => {
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
      calcularResumenReceta(lineas, Number.isFinite(porcentajeNumero) ? porcentajeNumero : 0),
    [lineas, porcentajeNumero]
  );

  const disponibles = useMemo(
    () => materiales.filter((m) => !lineas.some((l) => l.ingrediente_id === m.id)),
    [materiales, lineas]
  );

  const agregarMaterial = (material: Ingrediente) => {
    setLineas((prev) => [
      ...prev,
      {
        ingrediente_id: material.id,
        nombre_ingrediente: material.nombre,
        unidad: material.unidad,
        precio_unitario: material.precio_unitario,
        cantidad: 1,
      },
    ]);
    setSelectorAbierto(false);
    setErrorReceta(undefined);
  };

  const cambiarCantidad = (materialId: number, cantidad: number) => {
    setLineas((prev) =>
      prev.map((l) => (l.ingrediente_id === materialId ? { ...l, cantidad } : l))
    );
  };

  const quitarMaterial = (materialId: number) => {
    setLineas((prev) => prev.filter((l) => l.ingrediente_id !== materialId));
  };

  const validar = (): boolean => {
    let ok = true;
    setErrorNombre(nombre.trim().length === 0 ? 'Escribe un nombre para el servicio.' : undefined);
    if (nombre.trim().length === 0) ok = false;
    if (Number.isNaN(porcentajeNumero) || porcentajeNumero < 0) {
      setErrorPorcentaje('El porcentaje debe ser un número mayor o igual a 0.');
      ok = false;
    } else {
      setErrorPorcentaje(undefined);
    }
    if (lineas.length === 0) {
      setErrorReceta('Agrega al menos un material a la receta.');
      ok = false;
    } else if (lineas.some((l) => !(l.cantidad > 0))) {
      setErrorReceta('Cada material debe llevar una cantidad mayor a 0.');
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
        titulo={inicial != null ? 'Editar servicio' : 'Nuevo servicio'}
        subtitulo={
          inicial != null
            ? 'Ajusta los datos y la receta, luego guarda.'
            : 'Nombre, ganancia y los materiales que lo componen.'
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
              label={inicial != null ? 'Guardar cambios' : 'Agregar servicio'}
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
          placeholder="p. ej. Laminado de cejas"
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
          <Text style={tipografia.headline}>Materiales</Text>
          {lineas.length > 0 && (
            <Text style={tipografia.micro}>{lineas.length} materiales</Text>
          )}
        </View>

        {cargandoReceta ? (
          <ActivityIndicator color={colores.brand.secondary} />
        ) : (
          <>
            {lineas.map((linea) => (
              <View key={linea.ingrediente_id} style={estilos.lineaMaterial}>
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
                    onPress={() => quitarMaterial(linea.ingrediente_id)}
                    style={estilos.botonQuitar}
                  >
                    <Feather name="x" size={18} color={colores.texto.muted} />
                  </Pressable>
                </View>
                <View style={estilos.filaStepper}>
                  <Text style={tipografia.micro}>Cantidad</Text>
                  <CantidadInput
                    valor={linea.cantidad}
                    unidad={linea.unidad}
                    onChange={(cantidad) => cambiarCantidad(linea.ingrediente_id, cantidad)}
                  />
                </View>
              </View>
            ))}

            <Button
              label="Agregar material"
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

      <SelectorMateriales
        visible={selectorAbierto}
        disponibles={disponibles}
        onElegir={agregarMaterial}
        onClose={() => setSelectorAbierto(false)}
      />
    </>
  );
}

export function CejasScreen() {
  const db = useSQLiteContext();
  const [servicios, setServicios] = useState<ServicioEnLista[]>([]);
  const [cargando, setCargando] = useState(true);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [eliminando, setEliminando] = useState<ServicioEnLista | null>(null);
  const [sesionFormulario, setSesionFormulario] = useState(0);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await listarServicios(db);
      const conResumen = await Promise.all(
        lista.map(async (servicio) => {
          const receta = await obtenerRecetaServicio(db, servicio.id);
          return {
            ...servicio,
            resumen: calcularResumenReceta(receta, servicio.porcentaje_ganancia),
          };
        })
      );
      setServicios(conResumen);
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

  const abrirEdicion = (servicio: Servicio) => {
    setEditando(servicio);
    setSesionFormulario((s) => s + 1);
    setFormularioAbierto(true);
  };

  const guardar = async (dato: NuevoServicio) => {
    if (editando != null) {
      await actualizarServicio(db, editando.id, dato);
    } else {
      await crearServicio(db, dato);
    }
    setFormularioAbierto(false);
    setEditando(null);
    await recargar();
  };

  const confirmarEliminar = async () => {
    if (eliminando == null) return;
    await eliminarServicio(db, eliminando.id);
    setEliminando(null);
    await recargar();
  };

  const alternarActivo = async (servicio: ServicioEnLista) => {
    await cambiarActivoServicio(db, servicio.id, !servicio.activo);
    await recargar();
  };

  const renderItem = ({ item }: { item: ServicioEnLista }) => (
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
          accessibilityLabel={item.activo ? 'Marcar como inactivo' : 'Marcar como activo'}
          onPress={() => alternarActivo(item)}
        >
          <Badge label={item.activo ? 'Activo' : 'Inactivo'} tone={item.activo ? 'success' : 'muted'} />
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
          <Text style={tipografia.title}>Servicios</Text>
          <Text style={tipografia.small}>
            {cargando
              ? 'Cargando…'
              : `${servicios.length} ${servicios.length === 1 ? 'servicio' : 'servicios'} en el sistema`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nuevo servicio"
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
          data={servicios}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              titulo="Aún no hay servicios"
              texto="El bambú crece con paciencia: crea tu primer servicio y añade los materiales de su receta."
              accion={{ label: 'Nuevo servicio', onPress: abrirNuevo }}
            />
          }
        />
      )}

      <FormularioServicio
        key={`${sesionFormulario}-${editando?.id ?? 'nuevo'}`}
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
        titulo="¿Eliminar servicio?"
        subtitulo={eliminando?.nombre}
        onClose={() => setEliminando(null)}
      >
        <Text style={tipografia.small}>
          Este servicio y su receta se eliminarán. Esta acción no se puede deshacer.
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
  lineaMaterial: {
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
  opcionMaterial: {
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
