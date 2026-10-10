import { Feather } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listarBebidas, obtenerReceta } from '../db/repos/bebidas';
import { listarServicios, obtenerRecetaServicio } from '../db/repos/servicios';
import { eliminarVenta, listarVentas, registrarVenta } from '../db/repos/ventas';
import { calcularResumenReceta, type ResumenReceta } from '../domain/calculos';
import {
  fechaAVentaISO,
  fechaDePeriodo,
  formatearFechaHora,
  rangoDePeriodo,
  tituloDePeriodo,
  type TipoPeriodo,
} from '../domain/fechas';
import type { Bebida, Servicio, TipoProducto, Venta } from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChipSelector, type OpcionChip } from '../ui/ChipSelector';
import { EmptyState } from '../ui/EmptyState';
import { FechaSelector } from '../ui/FechaSelector';
import { Modal } from '../ui/Modal';
import { Stepper } from '../ui/Stepper';

type BebidaConResumen = Bebida & { resumen: ResumenReceta };
type ServicioConResumen = Servicio & { resumen: ResumenReceta };

interface ProductoConResumen {
  id: number;
  nombre: string;
  tipo: TipoProducto;
  activo: boolean;
  resumen: ResumenReceta;
}

type FiltroTipo = 'todas' | TipoProducto;

function formatearCantidad(valor: number): string {
  return valor.toLocaleString('es-MX', { maximumFractionDigits: 3 });
}

const OPCIONES_PERIODO: OpcionChip<TipoPeriodo>[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'todo', etiqueta: 'Todo' },
];

const OPCIONES_TIPO: OpcionChip<FiltroTipo>[] = [
  { valor: 'todas', etiqueta: 'Todas' },
  { valor: 'bebida', etiqueta: 'Bebidas' },
  { valor: 'servicio', etiqueta: 'Servicios' },
];

const ETIQUETA_TIPO: Record<TipoProducto, string> = {
  bebida: 'Bebida',
  servicio: 'Servicio',
};

export function VentasScreen() {
  const db = useSQLiteContext();
  const { height } = useWindowDimensions();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [bebidas, setBebidas] = useState<BebidaConResumen[]>([]);
  const [servicios, setServicios] = useState<ServicioConResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<TipoPeriodo>('hoy');
  const [offset, setOffset] = useState(0);
  const [tipoFiltro, setTipoFiltro] = useState<FiltroTipo>('todas');
  const [productoFiltro, setProductoFiltro] = useState(0);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [productoElegido, setProductoElegido] = useState<ProductoConResumen | null>(null);
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [fechaVenta, setFechaVenta] = useState<Date>(() => new Date());
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<Venta | null>(null);
  const [modalCalendario, setModalCalendario] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(() => new Date());
  const [calendarioId, setCalendarioId] = useState(0);

  const productos: ProductoConResumen[] = useMemo(
    () => [
      ...bebidas.map((b) => ({
        id: b.id,
        nombre: b.nombre,
        tipo: 'bebida' as const,
        activo: b.activo,
        resumen: b.resumen,
      })),
      ...servicios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        tipo: 'servicio' as const,
        activo: s.activo,
        resumen: s.resumen,
      })),
    ],
    [bebidas, servicios]
  );

  const filtro = useMemo(() => {
    const rango = rangoDePeriodo(periodo, offset);
    return {
      desde: rango.desde,
      hasta: rango.hasta,
      tipo: tipoFiltro === 'todas' ? undefined : tipoFiltro,
      bebida_id:
        tipoFiltro === 'bebida' && productoFiltro !== 0 ? productoFiltro : undefined,
      servicio_id:
        tipoFiltro === 'servicio' && productoFiltro !== 0 ? productoFiltro : undefined,
    };
  }, [periodo, offset, tipoFiltro, productoFiltro]);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [bebidasLista, serviciosLista, ventasLista] = await Promise.all([
        listarBebidas(db),
        listarServicios(db),
        listarVentas(db, filtro),
      ]);
      const conResumenBebidas = await Promise.all(
        bebidasLista.map(async (bebida) => {
          const receta = await obtenerReceta(db, bebida.id);
          return {
            ...bebida,
            resumen: calcularResumenReceta(receta, bebida.porcentaje_ganancia),
          };
        })
      );
      const conResumenServicios = await Promise.all(
        serviciosLista.map(async (servicio) => {
          const receta = await obtenerRecetaServicio(db, servicio.id);
          return {
            ...servicio,
            resumen: calcularResumenReceta(receta, servicio.porcentaje_ganancia),
          };
        })
      );
      setBebidas(conResumenBebidas);
      setServicios(conResumenServicios);
      setVentas(ventasLista);
    } finally {
      setCargando(false);
    }
  }, [db, filtro]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const resumen = useMemo(() => {
    const totalVentas = ventas.reduce((s, v) => s + v.cantidad * v.precio_unitario, 0);
    const totalProduccion = ventas.reduce((s, v) => s + v.cantidad * v.costo_unitario, 0);
    return {
      totalVentas,
      totalProduccion,
      totalGanancia: totalVentas - totalProduccion,
      numeroVentas: ventas.length,
    };
  }, [ventas]);

  const abrirRegistro = () => {
    setProductoElegido(null);
    setCantidadVenta(1);
    setFechaVenta(new Date());
    setModalRegistro(true);
  };

  const registrar = async () => {
    if (productoElegido == null) return;
    setGuardando(true);
    try {
      const { faltantes } = await registrarVenta(db, {
        producto: { tipo: productoElegido.tipo, id: productoElegido.id },
        cantidad: cantidadVenta,
        fecha: fechaAVentaISO(fechaVenta),
      });
      setModalRegistro(false);
      setProductoElegido(null);
      await recargar();
      if (faltantes.length > 0) {
        const detalle = faltantes
          .map(
            (f) =>
              `${f.nombre}: faltan ${formatearCantidad(f.requerido - f.disponible)} ${f.unidad.trim()} ` +
              `(disponible ${formatearCantidad(f.disponible)} ${f.unidad.trim()})`
          )
          .join('\n');
        Alert.alert(
          'Stock insuficiente',
          `La venta se registró, pero no hay suficiente inventario para fabricarla. Esta operación no debería existir en el almacén:\n\n${detalle}`
        );
      }
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (eliminando == null) return;
    await eliminarVenta(db, eliminando.id);
    setEliminando(null);
    await recargar();
  };

  const abrirCalendario = () => {
    setFechaSeleccionada(fechaDePeriodo(periodo, offset));
    setCalendarioId((c) => c + 1);
    setModalCalendario(true);
  };

  const aplicarDia = (fecha: Date) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const dia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    setOffset(Math.round((dia.getTime() - hoy.getTime()) / 86400000));
    setPeriodo('hoy');
    setModalCalendario(false);
  };

  const productosFiltrados = useMemo(
    () => productos.filter((p) => tipoFiltro === 'todas' || p.tipo === tipoFiltro),
    [productos, tipoFiltro]
  );

  const opcionesProductos: OpcionChip<number>[] = useMemo(
    () => [
      { valor: 0, etiqueta: 'Todas' },
      ...productosFiltrados.map((p) => ({ valor: p.id, etiqueta: p.nombre })),
    ],
    [productosFiltrados]
  );

  const cambiarTipo = (tipo: FiltroTipo) => {
    setTipoFiltro(tipo);
    setProductoFiltro(0);
  };

  const renderItem = ({ item }: { item: Venta }) => (
    <Card style={estilos.card}>
      <View style={estilos.filaVenta}>
        <View style={estilos.infoVenta}>
          <Text style={[tipografia.small, estilos.nombreVenta]} numberOfLines={1}>
            {item.nombre_producto}
          </Text>
          <View style={estilos.filaTipoVenta}>
            <Badge
              label={ETIQUETA_TIPO[item.servicio_id != null ? 'servicio' : 'bebida']}
              tone="info"
            />
            <Text style={tipografia.micro}>
              {item.cantidad} × {formatearDinero(item.precio_unitario)}
            </Text>
          </View>
          <Text style={tipografia.micro}>{formatearFechaHora(item.creado_en)}</Text>
        </View>
        <View style={estilos.derechaVenta}>
          <Text style={[tipografia.small, estilos.subtotalVenta]}>
            {formatearDinero(item.cantidad * item.precio_unitario)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar venta de ${item.nombre_producto}`}
            onPress={() => setEliminando(item)}
            style={estilos.botonEliminar}
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
          <Text style={tipografia.title}>Ventas</Text>
          <Text style={tipografia.small}>
            {cargando
              ? 'Cargando…'
              : `${resumen.numeroVentas} ${resumen.numeroVentas === 1 ? 'venta' : 'ventas'}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar venta"
          onPress={abrirRegistro}
          style={estilos.botonNuevo}
        >
          <Feather name="plus" size={24} color={colores.texto.onBrand} />
        </Pressable>
      </View>

      <View style={estilos.zonaResumen}>
        <Card style={estilos.resumenCard}>
          <View style={estilos.filaResumen}>
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Ventas</Text>
              <Text style={[estilos.valorResumen, { color: colores.brand.primary }]}>
                {formatearDinero(resumen.totalVentas)}
              </Text>
            </View>
            <View style={estilos.divisorResumen} />
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Producción</Text>
              <Text style={[estilos.valorResumen, { color: colores.texto.secondary }]}>
                {formatearDinero(resumen.totalProduccion)}
              </Text>
            </View>
            <View style={estilos.divisorResumen} />
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Ganancia</Text>
              <Text
                style={[
                  estilos.valorResumen,
                  {
                    color:
                      resumen.totalGanancia >= 0
                        ? colores.funcional.success
                        : colores.funcional.error,
                  },
                ]}
              >
                {formatearDinero(resumen.totalGanancia)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={estilos.zonaFiltros}>
        <View style={estilos.filaPeriodo}>
          {periodo !== 'todo' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Periodo anterior"
              onPress={() => setOffset((o) => o - 1)}
              style={estilos.botonFlecha}
            >
              <Feather name="chevron-left" size={20} color={colores.brand.primary} />
            </Pressable>
          )}
          <View style={estilos.centroPeriodo}>
            <ChipSelector
              opciones={OPCIONES_PERIODO}
              seleccionado={periodo}
              onSeleccionar={(p) => {
                setPeriodo(p);
                setOffset(0);
              }}
            />
            <Text style={[tipografia.micro, estilos.tituloPeriodo]}>
              {tituloDePeriodo(periodo, offset)}
            </Text>
          </View>
          {periodo !== 'todo' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Periodo siguiente"
              onPress={() => setOffset((o) => o + 1)}
              style={estilos.botonFlecha}
            >
              <Feather name="chevron-right" size={20} color={colores.brand.primary} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Elegir un día específico"
            onPress={abrirCalendario}
            style={({ pressed }) => [
              estilos.botonCalendario,
              pressed && estilos.presionado,
            ]}
          >
            <Feather name="calendar" size={18} color={colores.brand.accent} />
          </Pressable>
        </View>
        <ChipSelector
          opciones={OPCIONES_TIPO}
          seleccionado={tipoFiltro}
          onSeleccionar={cambiarTipo}
        />
        {productosFiltrados.length > 0 && (
          <ChipSelector
            opciones={opcionesProductos}
            seleccionado={productoFiltro}
            onSeleccionar={setProductoFiltro}
          />
        )}
      </View>

      {cargando ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        </View>
      ) : (
        <FlatList
          data={ventas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              titulo="Sin ventas aquí"
              texto={
                productos.length === 0
                  ? 'Crea bebidas o servicios con sus recetas para poder registrar ventas.'
                  : 'No hay ventas en el periodo o producto seleccionado.'
              }
              accion={
                productos.length === 0
                  ? undefined
                  : { label: 'Registrar venta', onPress: abrirRegistro }
              }
            />
          }
        />
      )}

      <Modal
        visible={modalRegistro}
        titulo="Registrar venta"
        subtitulo={
          productoElegido != null ? productoElegido.nombre : 'Elige un producto para empezar'
        }
        onClose={() => {
          setModalRegistro(false);
          setProductoElegido(null);
        }}
        footer={
          productoElegido != null ? (
            <>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => {
                  setModalRegistro(false);
                  setProductoElegido(null);
                }}
                disabled={guardando}
                style={estilos.botonMitad}
              />
              <Button
                label="Registrar venta"
                icon="check"
                onPress={registrar}
                disabled={guardando}
                style={estilos.botonMitad}
              />
            </>
          ) : undefined
        }
      >
        {productoElegido == null ? (
          productos.length === 0 ? (
            <Text style={[tipografia.small, estilos.sinProductos]}>
              No hay bebidas ni servicios creados. Ve a las pestañas Bebidas o Servicios para
              crear uno.
            </Text>
          ) : (
            <FlatList
              data={productos}
              keyExtractor={(item) => `${item.tipo}-${item.id}`}
              style={{ maxHeight: height * 0.45 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Vender ${item.nombre}`}
                  onPress={() => {
                    setProductoElegido(item);
                    setCantidadVenta(1);
                  }}
                  style={({ pressed }) => [
                    estilos.filaProducto,
                    pressed && estilos.presionado,
                  ]}
                >
                  <View style={estilos.infoProducto}>
                    <Text style={tipografia.small} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    <View style={estilos.filaTipoProducto}>
                      <Badge label={ETIQUETA_TIPO[item.tipo]} tone="info" />
                      {!item.activo && <Text style={tipografia.micro}>Inactivo</Text>}
                    </View>
                  </View>
                  <Text style={[tipografia.small, estilos.precioProducto]}>
                    {formatearDinero(item.resumen.precioVenta)}
                  </Text>
                </Pressable>
              )}
            />
          )
        ) : (
          <>
            <Card style={estilos.cardSeleccion}>
              <View style={estilos.infoSeleccion}>
                <Text style={tipografia.small}>{productoElegido.nombre}</Text>
                <Text style={tipografia.micro}>
                  {cantidadVenta} × {formatearDinero(productoElegido.resumen.precioVenta)} =
                  {formatearDinero(cantidadVenta * productoElegido.resumen.precioVenta)}
                </Text>
              </View>
              <Text style={tipografia.precio}>
                {formatearDinero(cantidadVenta * productoElegido.resumen.precioVenta)}
              </Text>
            </Card>
            <View style={estilos.filaCantidad}>
              <View style={estilos.infoCantidad}>
                <Text style={tipografia.small}>Cantidad vendida</Text>
                <Text style={tipografia.micro}>Unidades de este producto</Text>
              </View>
              <Stepper
                valor={cantidadVenta}
                onChange={setCantidadVenta}
                minimo={1}
              />
            </View>
            <FechaSelector valor={fechaVenta} onChange={setFechaVenta} />
            <Pressable
              accessibilityRole="button"
              onPress={() => setProductoElegido(null)}
              style={estilos.cambiarProducto}
            >
              <Feather name="repeat" size={16} color={colores.brand.accent} />
              <Text style={[tipografia.caption, estilos.textoCambiar]}>
                Cambiar producto
              </Text>
            </Pressable>
          </>
        )}
      </Modal>

      <Modal
        visible={modalCalendario}
        titulo="Ver un día específico"
        subtitulo="Selecciona la fecha que quieres consultar"
        onClose={() => setModalCalendario(false)}
        footer={
          <>
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={() => setModalCalendario(false)}
              style={estilos.botonMitad}
            />
            <Button
              label="Ver día"
              icon="calendar"
              onPress={() => aplicarDia(fechaSeleccionada)}
              style={estilos.botonMitad}
            />
          </>
        }
      >
        <FechaSelector key={calendarioId} valor={fechaSeleccionada} onChange={setFechaSeleccionada} />
      </Modal>

      <Modal
        visible={eliminando != null}
        titulo="¿Eliminar venta?"
        subtitulo={eliminando?.nombre_producto}
        onClose={() => setEliminando(null)}
      >
        <Text style={tipografia.small}>
          {eliminando != null &&
            `${eliminando.cantidad} × ${formatearDinero(eliminando.precio_unitario)} (${formatearFechaHora(eliminando.creado_en)}). Esta acción no se puede deshacer.`}
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
    fontSize: 17,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  zonaFiltros: {
    gap: espaciado.md,
    paddingBottom: espaciado.md,
    paddingHorizontal: espaciado['2xl'],
  },
  filaPeriodo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botonFlecha: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonCalendario: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde.default,
    backgroundColor: colores.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centroPeriodo: {
    flex: 1,
    gap: espaciado.xs,
  },
  tituloPeriodo: {
    paddingLeft: espaciado.md,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: {
    paddingHorizontal: espaciado['2xl'],
    paddingBottom: 200,
    gap: espaciado.md,
  },
  card: {
    padding: espaciado.lg,
  },
  filaVenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  infoVenta: {
    flex: 1,
    gap: espaciado.xs,
  },
  nombreVenta: {
    color: colores.texto.primary,
  },
  filaTipoVenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  derechaVenta: {
    alignItems: 'flex-end',
    gap: espaciado.xs,
  },
  subtotalVenta: {
    fontFamily: 'Fraunces_600SemiBold',
    fontVariant: ['tabular-nums'],
    color: colores.brand.secondary,
  },
  botonEliminar: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    backgroundColor: colores.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sinProductos: {
    textAlign: 'center',
  },
  filaProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde.default,
  },
  infoProducto: {
    flex: 1,
    gap: espaciado.xs,
  },
  filaTipoProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  precioProducto: {
    fontFamily: 'Fraunces_600SemiBold',
    fontVariant: ['tabular-nums'],
    color: colores.brand.secondary,
  },
  presionado: {
    opacity: 0.55,
  },
  cardSeleccion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  infoSeleccion: {
    flex: 1,
    gap: espaciado.xs,
  },
  filaCantidad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCantidad: {
    gap: espaciado.xs,
  },
  cambiarProducto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    alignSelf: 'center',
  },
  textoCambiar: {
    color: colores.brand.accent,
  },
  footerModal: {
    flexDirection: 'row',
    gap: espaciado.md,
  },
  botonMitad: {
    flex: 1,
  },
});
