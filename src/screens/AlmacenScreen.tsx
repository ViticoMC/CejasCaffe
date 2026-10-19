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
import { formatearFechaHora } from '../domain/fechas';
import {
  listarInventario,
  listarMovimientos,
  registrarAjuste,
  registrarEntrada,
  type ItemInventario,
} from '../db/repos/inventario';
import { crearPaquete, listarPaquetes } from '../db/repos/paquetes';
import type {
  ItemMovimiento,
  NuevoPaquete,
  Paquete,
  TipoMovimiento,
} from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChipSelector, type OpcionChip } from '../ui/ChipSelector';
import { EmptyState } from '../ui/EmptyState';
import { FormularioPaquete } from '../ui/FormularioPaquete';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { PriceTag } from '../ui/PriceTag';
import { Stepper } from '../ui/Stepper';

type FiltroAlmacen = 'todos' | 'bajo';
type ModoEntrada = 'paquete' | 'cantidad';

const OPCIONES_FILTRO: OpcionChip<FiltroAlmacen>[] = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'bajo', etiqueta: 'Bajo mínimo' },
];

const OPCIONES_ENTRADA: OpcionChip<ModoEntrada>[] = [
  { valor: 'paquete', etiqueta: 'Por paquete' },
  { valor: 'cantidad', etiqueta: 'Por cantidad' },
];

const ETIQUETA_MOVIMIENTO: Record<TipoMovimiento, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
};

const TONO_MOVIMIENTO: Record<TipoMovimiento, 'success' | 'info' | 'muted'> = {
  entrada: 'success',
  salida: 'info',
  ajuste: 'muted',
};

function parsearCantidad(texto: string): number {
  const normalizado = texto.trim().replace(',', '.');
  const valor = parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : NaN;
}

function formatearCantidad(valor: number): string {
  return valor.toLocaleString('es-MX', { maximumFractionDigits: 3 });
}

export function AlmacenScreen() {
  const db = useSQLiteContext();
  const { height } = useWindowDimensions();
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState<FiltroAlmacen>('todos');

  const [modalEntrada, setModalEntrada] = useState(false);
  const [entradaIngrediente, setEntradaIngrediente] = useState<ItemInventario | null>(null);
  const [modoEntrada, setModoEntrada] = useState<ModoEntrada>('paquete');
  const [paquetesMaterial, setPaquetesMaterial] = useState<Paquete[]>([]);
  const [cargandoPaquetes, setCargandoPaquetes] = useState(false);
  const [paqueteElegido, setPaqueteElegido] = useState<Paquete | null>(null);
  const [numPaquetes, setNumPaquetes] = useState(1);
  const [precioPaquete, setPrecioPaquete] = useState('');
  const [creandoPaquete, setCreandoPaquete] = useState(false);
  const [cantidadEntrada, setCantidadEntrada] = useState('');
  const [costoEntrada, setCostoEntrada] = useState('');
  const [motivoEntrada, setMotivoEntrada] = useState('');

  const [ajustando, setAjustando] = useState<ItemInventario | null>(null);
  const [cantidadAjuste, setCantidadAjuste] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');

  const [movimientosDe, setMovimientosDe] = useState<ItemInventario | null>(null);
  const [movimientos, setMovimientos] = useState<ItemMovimiento[]>([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);

  const [guardando, setGuardando] = useState(false);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      setInventario(await listarInventario(db));
    } finally {
      setCargando(false);
    }
  }, [db]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const abrirEntrada = (material: ItemInventario | null) => {
    setEntradaIngrediente(material);
    setCantidadEntrada('');
    setCostoEntrada('');
    setMotivoEntrada('');
    setNumPaquetes(1);
    setPrecioPaquete('');
    setPaqueteElegido(null);
    setPaquetesMaterial([]);
    setCreandoPaquete(false);
    setModalEntrada(true);
    if (material != null) {
      void seleccionarMaterial(material);
    }
  };

  const cerrarEntrada = () => {
    setModalEntrada(false);
    setEntradaIngrediente(null);
    setPaquetesMaterial([]);
    setPaqueteElegido(null);
    setCreandoPaquete(false);
  };

  const seleccionarMaterial = async (material: ItemInventario) => {
    setEntradaIngrediente(material);
    setCantidadEntrada('');
    setCostoEntrada('');
    setMotivoEntrada('');
    setNumPaquetes(1);
    setPrecioPaquete('');
    setCreandoPaquete(false);
    setCargandoPaquetes(true);
    try {
      const lista = await listarPaquetes(db, material.id);
      setPaquetesMaterial(lista);
      const primero = lista[0] ?? null;
      setPaqueteElegido(primero);
      if (primero != null) {
        setPrecioPaquete(String(primero.precio));
      }
    } finally {
      setCargandoPaquetes(false);
    }
  };

  const guardarPaqueteEntrada = async (dato: NuevoPaquete) => {
    if (entradaIngrediente == null) return;
    const creado = await crearPaquete(db, entradaIngrediente.id, dato);
    setPaquetesMaterial(await listarPaquetes(db, entradaIngrediente.id));
    setPaqueteElegido(creado);
    setPrecioPaquete(String(creado.precio));
    setCreandoPaquete(false);
  };

  const previaEntrada = useMemo(() => {
    if (entradaIngrediente == null) return null;
    const stock = entradaIngrediente.stock;
    const actual = entradaIngrediente.precio_unitario;
    if (modoEntrada === 'paquete') {
      if (paqueteElegido == null) return null;
      const precio = parsearCantidad(precioPaquete);
      if (!Number.isFinite(numPaquetes) || numPaquetes <= 0) return null;
      if (Number.isNaN(precio) || precio <= 0) return null;
      const cantidad = numPaquetes * paqueteElegido.cantidad;
      const costo = numPaquetes * precio;
      return {
        resumen: `${numPaquetes} × ${paqueteElegido.nombre} = ${formatearCantidad(cantidad)} ${entradaIngrediente.unidad.trim()}`,
        cantidad,
        costo,
        porUnidad: paqueteElegido.cantidad > 0 ? precio / paqueteElegido.cantidad : 0,
        nuevoPromedio:
          stock + cantidad > 0 ? (stock * actual + costo) / (stock + cantidad) : actual,
      };
    }
    const cantidad = parsearCantidad(cantidadEntrada);
    const costo = parsearCantidad(costoEntrada);
    if (Number.isNaN(cantidad) || cantidad <= 0) return null;
    if (Number.isNaN(costo) || costo <= 0) return null;
    return {
      resumen: `Entrarán ${formatearCantidad(cantidad)} ${entradaIngrediente.unidad.trim()}`,
      cantidad,
      costo,
      porUnidad: costo / cantidad,
      nuevoPromedio:
        stock + cantidad > 0 ? (stock * actual + costo) / (stock + cantidad) : actual,
    };
  }, [
    entradaIngrediente,
    modoEntrada,
    paqueteElegido,
    precioPaquete,
    numPaquetes,
    cantidadEntrada,
    costoEntrada,
  ]);

  const puedeConfirmar =
    entradaIngrediente != null &&
    (modoEntrada === 'paquete'
      ? paqueteElegido != null &&
        !cargandoPaquetes &&
        Number.isFinite(numPaquetes) &&
        numPaquetes > 0 &&
        previaEntrada != null
      : previaEntrada != null);

  const confirmarEntrada = async () => {
    if (entradaIngrediente == null || !puedeConfirmar) return;

    setGuardando(true);
    try {
      const motivo = motivoEntrada.trim().length > 0 ? motivoEntrada.trim() : null;
      if (modoEntrada === 'paquete' && paqueteElegido != null && previaEntrada != null) {
        const precio = parsearCantidad(precioPaquete);
        await registrarEntrada(db, {
          ingrediente_id: entradaIngrediente.id,
          paquete_id: paqueteElegido.id,
          paquetes: numPaquetes,
          precioPaquete: precio,
          motivo,
        });
      } else {
        if (previaEntrada == null) return;
        await registrarEntrada(db, {
          ingrediente_id: entradaIngrediente.id,
          cantidad: previaEntrada.cantidad,
          costoTotal: previaEntrada.costo,
          motivo,
        });
      }
      cerrarEntrada();
      await recargar();
    } catch (error) {
      Alert.alert(
        'No se pudo registrar',
        error instanceof Error ? error.message : 'Intenta de nuevo.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const abrirAjuste = (material: ItemInventario) => {
    setAjustando(material);
    setCantidadAjuste(material.stock > 0 ? formatearCantidad(material.stock) : '');
    setMotivoAjuste('');
  };

  const cerrarAjuste = () => {
    setAjustando(null);
    setCantidadAjuste('');
    setMotivoAjuste('');
  };

  const confirmarAjuste = async () => {
    if (ajustando == null) return;
    const cantidadNueva = parsearCantidad(cantidadAjuste);
    if (Number.isNaN(cantidadNueva) || cantidadNueva < 0) return;

    setGuardando(true);
    try {
      await registrarAjuste(db, {
        ingrediente_id: ajustando.id,
        cantidadNueva,
        motivo: motivoAjuste.trim().length > 0 ? motivoAjuste.trim() : null,
      });
      cerrarAjuste();
      await recargar();
    } finally {
      setGuardando(false);
    }
  };

  const abrirMovimientos = async (material: ItemInventario) => {
    setMovimientosDe(material);
    setCargandoMovimientos(true);
    try {
      setMovimientos(await listarMovimientos(db, material.id));
    } finally {
      setCargandoMovimientos(false);
    }
  };

  const resumen = useMemo(() => {
    const bajos = inventario.filter((i) => i.bajo).length;
    const valor = inventario.reduce((s, i) => s + i.valor, 0);
    return { total: inventario.length, bajos, valor };
  }, [inventario]);

  const lista = useMemo(
    () => (filtro === 'bajo' ? inventario.filter((i) => i.bajo) : inventario),
    [filtro, inventario]
  );

  const renderItem = ({ item }: { item: ItemInventario }) => {
    const tonoStock = item.bajo ? colores.funcional.warning : colores.brand.primary;
    return (
      <Card style={estilos.card}>
        <View style={estilos.filaSuperior}>
          <View style={estilos.info}>
            <Text style={tipografia.headline} numberOfLines={1}>
              {item.nombre}
            </Text>
            <View style={estilos.badges}>
              <Badge label={item.unidad.trim().length > 0 ? item.unidad : 'sin unidad'} tone="info" />
              {item.bajo && <Badge label="Bajo mínimo" tone="warning" />}
            </View>
          </View>
          <View style={estilos.existencia}>
            <Text style={[estilos.valorStock, { color: tonoStock }]}>
              {formatearCantidad(item.stock)}
            </Text>
            <Text style={tipografia.micro}>{item.unidad.trim()}</Text>
          </View>
        </View>

        <View style={estilos.filaMetas}>
          <Text style={tipografia.micro}>
            Mínimo {formatearCantidad(item.stock_minimo)} {item.unidad.trim()}
          </Text>
          <PriceTag precio={item.valor} />
        </View>

        <View style={estilos.filaAcciones}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Registrar entrada de ${item.nombre}`}
            onPress={() => abrirEntrada(item)}
            style={estilos.accion}
          >
            <Feather name="arrow-down-circle" size={18} color={colores.brand.accent} />
            <Text style={estilos.textoAccion}>Entrada</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Contar stock de ${item.nombre}`}
            onPress={() => abrirAjuste(item)}
            style={estilos.accion}
          >
            <Feather name="sliders" size={18} color={colores.brand.accent} />
            <Text style={estilos.textoAccion}>Ajustar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver historial de ${item.nombre}`}
            onPress={() => abrirMovimientos(item)}
            style={estilos.accion}
          >
            <Feather name="clock" size={18} color={colores.brand.accent} />
            <Text style={estilos.textoAccion}>Historial</Text>
          </Pressable>
        </View>
      </Card>
    );
  };

  return (
    <SafeAreaView style={estilos.safe}>
      <View style={estilos.encabezado}>
        <View style={estilos.titulos}>
          <Text style={tipografia.title}>Almacén</Text>
          <Text style={tipografia.small}>
            {cargando
              ? 'Cargando…'
              : `${resumen.total} ${resumen.total === 1 ? 'material' : 'materiales'} en el almacén`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Registrar entrada de material"
          onPress={() => abrirEntrada(null)}
          style={estilos.botonNuevo}
        >
          <Feather name="plus" size={24} color={colores.texto.onBrand} />
        </Pressable>
      </View>

      <View style={estilos.zonaResumen}>
        <Card style={estilos.resumenCard}>
          <View style={estilos.filaResumen}>
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Materiales</Text>
              <Text style={[estilos.valorResumen, { color: colores.brand.primary }]}>
                {resumen.total}
              </Text>
            </View>
            <View style={estilos.divisorResumen} />
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Bajo mínimo</Text>
              <Text
                style={[
                  estilos.valorResumen,
                  {
                    color:
                      resumen.bajos > 0
                        ? colores.funcional.warning
                        : colores.funcional.success,
                  },
                ]}
              >
                {resumen.bajos}
              </Text>
            </View>
            <View style={estilos.divisorResumen} />
            <View style={estilos.celdaResumen}>
              <Text style={tipografia.micro}>Valor en stock</Text>
              <Text
                style={[
                  estilos.valorResumen,
                  { color: colores.brand.secondary },
                ]}
              >
                {formatearDinero(resumen.valor)}
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <View style={estilos.zonaFiltros}>
        <ChipSelector
          opciones={OPCIONES_FILTRO}
          seleccionado={filtro}
          onSeleccionar={setFiltro}
        />
      </View>

      {cargando ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={estilos.lista}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            filtro === 'bajo' ? (
              <EmptyState
                titulo="Todo en orden"
                texto="Ningún material está por debajo de su stock mínimo."
              />
            ) : (
              <EmptyState
                titulo="El almacén está vacío"
                texto="Registra una entrada de materia prima para empezar a llevar tu inventario."
                accion={{ label: 'Registrar entrada', onPress: () => abrirEntrada(null) }}
              />
            )
          }
        />
      )}

      <Modal
        visible={modalEntrada}
        titulo={entradaIngrediente != null ? `Entrada de ${entradaIngrediente.nombre}` : 'Registrar entrada'}
        subtitulo={
          entradaIngrediente != null
            ? `Existencia actual: ${formatearCantidad(entradaIngrediente.stock)} ${entradaIngrediente.unidad.trim()} · ${formatearDinero(entradaIngrediente.precio_unitario)} por ${entradaIngrediente.unidad.trim()}`
            : 'Elige el material que entró al almacén.'
        }
        onClose={cerrarEntrada}
        scrollable
        maxAlturaCuerpo={height * 0.6}
        footer={
          entradaIngrediente != null && !creandoPaquete ? (
            <>
              <Button
                label="Cancelar"
                variant="secondary"
                onPress={cerrarEntrada}
                disabled={guardando}
                style={estilos.botonMitad}
              />
              <Button
                label="Registrar entrada"
                icon="check"
                onPress={confirmarEntrada}
                disabled={guardando || !puedeConfirmar}
                style={estilos.botonMitad}
              />
            </>
          ) : undefined
        }
      >
        {entradaIngrediente == null ? (
          inventario.length === 0 ? (
            <Text style={[tipografia.small, estilos.sinMateriales]}>
              No hay materiales en el sistema. Crea uno en la pestaña Materiales.
            </Text>
          ) : (
            inventario.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Entrada de ${item.nombre}`}
                onPress={() => void seleccionarMaterial(item)}
                style={({ pressed }) => [
                  estilos.filaMaterial,
                  pressed && estilos.presionado,
                ]}
              >
                <View style={estilos.infoMaterial}>
                  <Text style={tipografia.small} numberOfLines={1}>
                    {item.nombre}
                  </Text>
                  <Text style={tipografia.micro}>
                    Stock {formatearCantidad(item.stock)} {item.unidad.trim()}
                  </Text>
                </View>
                <Badge label={item.unidad.trim()} tone="info" />
              </Pressable>
            ))
          )
        ) : creandoPaquete ? (
          <FormularioPaquete
            key={`paquete-${entradaIngrediente.id}`}
            material={{
              nombre: entradaIngrediente.nombre,
              unidad: entradaIngrediente.unidad,
            }}
            inicial={null}
            onGuardar={guardarPaqueteEntrada}
            onCancelar={() => setCreandoPaquete(false)}
          />
        ) : (
          <>
            <ChipSelector
              opciones={OPCIONES_ENTRADA}
              seleccionado={modoEntrada}
              onSeleccionar={setModoEntrada}
            />
            {modoEntrada === 'paquete' ? (
              cargandoPaquetes ? (
                <ActivityIndicator color={colores.brand.secondary} size="large" />
              ) : paquetesMaterial.length === 0 ? (
                <>
                  <Text style={tipografia.small}>
                    Este material aún no tiene paquetes. Crea uno para registrar la compra de un
                    solo toque.
                  </Text>
                  <Button
                    label="Crear paquete"
                    icon="plus"
                    onPress={() => setCreandoPaquete(true)}
                  />
                </>
              ) : (
                <>
                  <View style={estilos.bloquePaquete}>
                    <Text style={tipografia.small}>Paquete</Text>
                    <ChipSelector
                      opciones={paquetesMaterial.map((paquete) => ({
                        valor: paquete.id,
                        etiqueta: paquete.nombre,
                      }))}
                      seleccionado={paqueteElegido?.id ?? -1}
                      onSeleccionar={(id) => {
                        const elegido = paquetesMaterial.find((p) => p.id === id) ?? null;
                        setPaqueteElegido(elegido);
                        if (elegido != null) {
                          setPrecioPaquete(String(elegido.precio));
                        }
                      }}
                    />
                  </View>
                  <View style={estilos.bloquePaquete}>
                    <Text style={tipografia.small}>Paquetes a comprar</Text>
                    <Stepper valor={numPaquetes} onChange={setNumPaquetes} minimo={1} />
                  </View>
                  <Input
                    label="Precio del paquete"
                    value={precioPaquete}
                    onChangeText={setPrecioPaquete}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                  {paqueteElegido != null &&
                    !Number.isNaN(parsearCantidad(precioPaquete)) &&
                    parsearCantidad(precioPaquete) !== paqueteElegido.precio && (
                      <Text style={[tipografia.micro, estilos.avisoPrecio]}>
                        Al guardar, este precio reemplazará al del catálogo.
                      </Text>
                    )}
                </>
              )
            ) : (
              <>
                <Input
                  label={`Cantidad (${entradaIngrediente.unidad.trim()})`}
                  value={cantidadEntrada}
                  onChangeText={setCantidadEntrada}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
                <Input
                  label="Costo total de la compra"
                  value={costoEntrada}
                  onChangeText={setCostoEntrada}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </>
            )}
            {previaEntrada != null && (
              <View style={estilos.previa}>
                <View style={estilos.previaFila}>
                  <Text style={tipografia.small}>{previaEntrada.resumen}</Text>
                  <PriceTag precio={previaEntrada.costo} />
                </View>
                <Text style={tipografia.micro}>
                  {formatearDinero(previaEntrada.porUnidad)} por{' '}
                  {entradaIngrediente.unidad.trim()} · Nuevo precio unitario{' '}
                  {formatearDinero(previaEntrada.nuevoPromedio)}
                </Text>
              </View>
            )}
            <Input
              label="Motivo"
              value={motivoEntrada}
              onChangeText={setMotivoEntrada}
              placeholder="p. ej. Compra semanal"
            />
          </>
        )}
      </Modal>

      <Modal
        visible={ajustando != null}
        titulo="Contar stock"
        subtitulo={
          ajustando != null
            ? `${ajustando.nombre} · existencias al momento del conteo`
            : undefined
        }
        onClose={cerrarAjuste}
        footer={
          <>
            <Button
              label="Cancelar"
              variant="secondary"
              onPress={cerrarAjuste}
              disabled={guardando}
              style={estilos.botonMitad}
            />
            <Button
              label="Guardar conteo"
              icon="check"
              onPress={confirmarAjuste}
              disabled={guardando}
              style={estilos.botonMitad}
            />
          </>
        }
      >
        {ajustando != null && (
          <>
            <Input
              label={`Cantidad contada (${ajustando.unidad.trim()})`}
              value={cantidadAjuste}
              onChangeText={setCantidadAjuste}
              placeholder="0"
              keyboardType="decimal-pad"
              autoFocus
            />
            <Input
              label="Motivo"
              value={motivoAjuste}
              onChangeText={setMotivoAjuste}
              placeholder="p. ej. Merma, inventario físico"
            />
          </>
        )}
      </Modal>

      <Modal
        visible={movimientosDe != null}
        titulo="Historial"
        subtitulo={movimientosDe?.nombre}
        onClose={() => setMovimientosDe(null)}
        scrollable
        maxAlturaCuerpo={height * 0.55}
      >
        {cargandoMovimientos ? (
          <View style={estilos.centro}>
            <ActivityIndicator color={colores.brand.secondary} size="large" />
          </View>
        ) : movimientos.length === 0 ? (
          <Text style={tipografia.small}>
            Aún no hay movimientos para este material.
          </Text>
        ) : (
          movimientos.map((movimiento) => {
            const signo = movimiento.tipo === 'entrada' ? '+' : '−';
            return (
              <View key={movimiento.id} style={estilos.filaMovimiento}>
                <View style={estilos.infoMovimiento}>
                  <Badge
                    label={ETIQUETA_MOVIMIENTO[movimiento.tipo]}
                    tone={TONO_MOVIMIENTO[movimiento.tipo]}
                  />
                  <Text style={tipografia.micro}>
                    {formatearFechaHora(movimiento.creado_en)}
                  </Text>
                  {movimiento.motivo != null && movimiento.motivo.length > 0 && (
                    <Text style={tipografia.micro} numberOfLines={1}>
                      {movimiento.motivo}
                    </Text>
                  )}
                  {movimiento.nombre_paquete != null && (
                    <Text style={tipografia.micro} numberOfLines={1}>
                      {movimiento.nombre_paquete}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    estilos.cantidadMovimiento,
                    {
                      color:
                        movimiento.tipo === 'salida'
                          ? colores.funcional.warning
                          : colores.funcional.success,
                    },
                  ]}
                >
                  {signo}
                  {formatearCantidad(movimiento.cantidad)} {movimiento.unidad.trim()}
                </Text>
              </View>
            );
          })
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
  zonaFiltros: {
    paddingBottom: espaciado.md,
    paddingHorizontal: espaciado['2xl'],
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
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.sm,
  },
  existencia: {
    alignItems: 'flex-end',
    gap: espaciado.xs,
  },
  valorStock: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 28,
    lineHeight: 32,
    fontVariant: ['tabular-nums'],
  },
  filaMetas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colores.borde.default,
    paddingTop: espaciado.md,
  },
  filaAcciones: {
    flexDirection: 'row',
    gap: espaciado.lg,
    borderTopWidth: 1,
    borderTopColor: colores.borde.default,
    paddingTop: espaciado.md,
  },
  accion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  textoAccion: {
    ...tipografia.caption,
    color: colores.brand.accent,
  },
  sinMateriales: {
    textAlign: 'center',
  },
  bloquePaquete: {
    gap: espaciado.sm,
  },
  avisoPrecio: {
    color: colores.brand.accent,
  },
  previa: {
    gap: espaciado.xs,
    backgroundColor: colores.bg.subtle,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde.default,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.md,
  },
  previaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  filaMaterial: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingVertical: espaciado.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde.default,
  },
  infoMaterial: {
    flex: 1,
    gap: espaciado.xs,
  },
  presionado: {
    opacity: 0.55,
  },
  filaMovimiento: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
    paddingVertical: espaciado.sm,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde.default,
  },
  infoMovimiento: {
    flex: 1,
    gap: espaciado.xs,
    alignItems: 'flex-start',
  },
  cantidadMovimiento: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 16,
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  botonMitad: {
    flex: 1,
  },
});