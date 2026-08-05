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
import { listarBebidas, obtenerReceta } from '../db/repos/bebidas';
import { eliminarVenta, listarVentas, registrarVenta } from '../db/repos/ventas';
import { calcularResumenBebida, type ResumenBebida } from '../domain/calculos';
import {
  formatearFechaHora,
  rangoDePeriodo,
  tituloDePeriodo,
  type TipoPeriodo,
} from '../domain/fechas';
import type { Bebida, Venta } from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChipSelector, type OpcionChip } from '../ui/ChipSelector';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { Stepper } from '../ui/Stepper';

type BebidaConResumen = Bebida & { resumen: ResumenBebida };

const OPCIONES_PERIODO: OpcionChip<TipoPeriodo>[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'todo', etiqueta: 'Todo' },
];

export function VentasScreen() {
  const db = useSQLiteContext();
  const { height } = useWindowDimensions();
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [bebidas, setBebidas] = useState<BebidaConResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<TipoPeriodo>('hoy');
  const [offset, setOffset] = useState(0);
  const [bebidaFiltro, setBebidaFiltro] = useState(0);
  const [modalRegistro, setModalRegistro] = useState(false);
  const [bebidaElegida, setBebidaElegida] = useState<BebidaConResumen | null>(null);
  const [cantidadVenta, setCantidadVenta] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState<Venta | null>(null);

  const filtro = useMemo(() => {
    const rango = rangoDePeriodo(periodo, offset);
    return {
      desde: rango.desde,
      hasta: rango.hasta,
      bebida_id: bebidaFiltro !== 0 ? bebidaFiltro : undefined,
    };
  }, [periodo, offset, bebidaFiltro]);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [bebidasLista, ventasLista] = await Promise.all([
        listarBebidas(db),
        listarVentas(db, filtro),
      ]);
      const conResumen = await Promise.all(
        bebidasLista.map(async (bebida) => {
          const receta = await obtenerReceta(db, bebida.id);
          return {
            ...bebida,
            resumen: calcularResumenBebida(receta, bebida.porcentaje_ganancia),
          };
        })
      );
      setBebidas(conResumen);
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
    setBebidaElegida(null);
    setCantidadVenta(1);
    setModalRegistro(true);
  };

  const registrar = async () => {
    if (bebidaElegida == null) return;
    setGuardando(true);
    try {
      await registrarVenta(db, {
        bebida_id: bebidaElegida.id,
        cantidad: cantidadVenta,
      });
      setModalRegistro(false);
      setBebidaElegida(null);
      await recargar();
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

  const opcionesBebidas: OpcionChip<number>[] = useMemo(
    () => [
      { valor: 0, etiqueta: 'Todas' },
      ...bebidas.map((b) => ({ valor: b.id, etiqueta: b.nombre })),
    ],
    [bebidas]
  );

  const renderItem = ({ item }: { item: Venta }) => (
    <Card style={estilos.card}>
      <View style={estilos.filaVenta}>
        <View style={estilos.infoVenta}>
          <Text style={[tipografia.small, estilos.nombreVenta]} numberOfLines={1}>
            {item.nombre_bebida}
          </Text>
          <Text style={tipografia.micro}>
            {item.cantidad} × {formatearDinero(item.precio_unitario)}
          </Text>
          <Text style={tipografia.micro}>{formatearFechaHora(item.creado_en)}</Text>
        </View>
        <View style={estilos.derechaVenta}>
          <Text style={[tipografia.small, estilos.subtotalVenta]}>
            {formatearDinero(item.cantidad * item.precio_unitario)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar venta de ${item.nombre_bebida}`}
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
        </View>
        <ChipSelector
          opciones={opcionesBebidas}
          seleccionado={bebidaFiltro}
          onSeleccionar={setBebidaFiltro}
        />
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
                bebidas.length === 0
                  ? 'Crea bebidas con sus recetas para poder registrar ventas.'
                  : 'No hay ventas en el periodo o producto seleccionado.'
              }
              accion={
                bebidas.length === 0
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
          bebidaElegida != null ? bebidaElegida.nombre : 'Elige una bebida para empezar'
        }
        onClose={() => {
          setModalRegistro(false);
          setBebidaElegida(null);
        }}
        footer={
          bebidaElegida != null ? (
            <>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={() => {
                  setModalRegistro(false);
                  setBebidaElegida(null);
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
        {bebidaElegida == null ? (
          bebidas.length === 0 ? (
            <Text style={[tipografia.small, estilos.sinBebidas]}>
              No hay bebidas creadas. Ve a la pestaña Bebidas para crear una.
            </Text>
          ) : (
            <FlatList
              data={bebidas}
              keyExtractor={(item) => String(item.id)}
              style={{ maxHeight: height * 0.45 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Vender ${item.nombre}`}
                  onPress={() => {
                    setBebidaElegida(item);
                    setCantidadVenta(1);
                  }}
                  style={({ pressed }) => [
                    estilos.filaBebida,
                    pressed && estilos.presionado,
                  ]}
                >
                  <View style={estilos.infoBebida}>
                    <Text style={tipografia.small} numberOfLines={1}>
                      {item.nombre}
                    </Text>
                    {!item.activo && <Text style={tipografia.micro}>Inactiva</Text>}
                  </View>
                  <Text style={[tipografia.small, estilos.precioBebida]}>
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
                <Text style={tipografia.small}>{bebidaElegida.nombre}</Text>
                <Text style={tipografia.micro}>
                  {cantidadVenta} × {formatearDinero(bebidaElegida.resumen.precioVenta)} =
                  {formatearDinero(cantidadVenta * bebidaElegida.resumen.precioVenta)}
                </Text>
              </View>
              <Text style={tipografia.precio}>
                {formatearDinero(cantidadVenta * bebidaElegida.resumen.precioVenta)}
              </Text>
            </Card>
            <View style={estilos.filaCantidad}>
              <View style={estilos.infoCantidad}>
                <Text style={tipografia.small}>Cantidad vendida</Text>
                <Text style={tipografia.micro}>Unidades de esta bebida</Text>
              </View>
              <Stepper
                valor={cantidadVenta}
                onChange={setCantidadVenta}
                minimo={1}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setBebidaElegida(null)}
              style={estilos.cambiarBebida}
            >
              <Feather name="repeat" size={16} color={colores.brand.accent} />
              <Text style={[tipografia.caption, estilos.textoCambiar]}>
                Cambiar bebida
              </Text>
            </Pressable>
          </>
        )}
      </Modal>

      <Modal
        visible={eliminando != null}
        titulo="¿Eliminar venta?"
        subtitulo={eliminando?.nombre_bebida}
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
  sinBebidas: {
    textAlign: 'center',
  },
  filaBebida: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde.default,
  },
  infoBebida: {
    flex: 1,
    gap: espaciado.xs,
  },
  precioBebida: {
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
  cambiarBebida: {
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
