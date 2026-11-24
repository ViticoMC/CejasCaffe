import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { listarBebidas } from '../db/repos/bebidas';
import { cargarPedidoMesa, crearMesa, eliminarMesa, guardarPedidoMesa, limpiarPedidoMesa, listarMesas, obtenerMesasConPedidos, obtenerMesasConPedidosYTiempo } from '../db/repos/mesas';
import type { MesaConTiempo } from '../db/repos/mesas';
import { registrarVenta } from '../db/repos/ventas';
import type { Bebida, LineaPedido, Mesa } from '../domain/tipos';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { useBottomSafe } from '../hooks/useBottomSafe';
import { useToast } from '../hooks/useToast';
import { formatearDinero, fuentes, tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Stepper } from '../ui/Stepper';
import { Toast } from '../ui/Toast';

// ---------------------------------------------------------------------------
// MesasScreen
// ---------------------------------------------------------------------------

export function MesasScreen() {
  const db = useSQLiteContext();
  const paddingBottom = useBottomSafe();
  const { toast, show: showToast } = useToast();

  // Lista de mesas
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);

  // Mesas con pedidos activos (desde DB)
  const [mesasConPedidos, setMesasConPedidos] = useState<Set<number>>(new Set());

  // Tiempos de pedido por mesa (mesa_id -> creado_en)
  const [tiemposPedido, setTiemposPedido] = useState<Map<number, string>>(new Map());

  // Tiempo actual para actualizar los badges en tiempo real
  const [ahora, setAhora] = useState(Date.now());

  // Pedido de la mesa seleccionada
  const [mesaActual, setMesaActual] = useState<Mesa | null>(null);
  const [lineas, setLineas] = useState<LineaPedido[]>([]);
  const [cargandoPedido, setCargandoPedido] = useState(false);

  // Estados de la UI
  const [modalCrear, setModalCrear] = useState(false);
  const [nombreMesa, setNombreMesa] = useState('');
  const [modalBebidas, setModalBebidas] = useState(false);
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [cantidadesSelector, setCantidadesSelector] = useState<Record<number, number>>({});
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [mostrarPostFinalizar, setMostrarPostFinalizar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Mesa con menú abierto
  const [mesaMenuAbierto, setMesaMenuAbierto] = useState<Mesa | null>(null);

  // Modo de fusión de mesas
  const [modoFusion, setModoFusion] = useState(false);
  const [mesasSeleccionadas, setMesasSeleccionadas] = useState<Mesa[]>([]);
  const [modalFusionConfirm, setModalFusionConfirm] = useState(false);
  const [pedidoOrigen, setPedidoOrigen] = useState<LineaPedido[]>([]);
  const [pedidoDestino, setPedidoDestino] = useState<LineaPedido[]>([]);

  // Cargar mesas al montar
  const cargarMesas = useCallback(async () => {
    setCargando(true);
    try {
      const [resultado, mesasConPedidoIds, mesasConTiempo] = await Promise.all([
        listarMesas(db).catch(() => [] as Mesa[]),
        obtenerMesasConPedidos(db).catch(() => [] as number[]),
        obtenerMesasConPedidosYTiempo(db).catch(() => [] as MesaConTiempo[]),
      ]);
      setMesas(resultado);
      setMesasConPedidos(new Set(mesasConPedidoIds));
      const tiempoMap = new Map<number, string>();
      for (const m of mesasConTiempo) {
        if (m.creado_en) tiempoMap.set(m.mesa_id, m.creado_en);
      }
      setTiemposPedido(tiempoMap);
    } catch (e) {
      console.error('Error cargando mesas:', e);
    } finally {
      setCargando(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      cargarMesas();
    }, [cargarMesas])
  );

  // Timer para actualizar los tiempos de pedido en tiempo real (cada 30 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      setAhora(Date.now());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Cargar bebidas activas para el selector
  const cargarBebidas = useCallback(async () => {
    const resultado = await listarBebidas(db);
    setBebidas(resultado.filter((b) => b.activo));
  }, [db]);

  // Totales del pedido
  const totales = useMemo(() => {
    const total = lineas.reduce((sum, l) => sum + l.bebida_precio * l.cantidad, 0);
    const totalCosto = lineas.reduce((sum, l) => sum + l.bebida_costo * l.cantidad, 0);
    return { total, totalCosto, ganancia: total - totalCosto };
  }, [lineas]);

  // Mesas ocupadas (las que tienen pedidos en DB)
  const mesasOcupadas = mesasConPedidos;

  // Formatear tiempo transcurrido desde creado_en
  const formatearTiempoTranscurrido = (creadoEn: string | null | undefined) => {
    if (!creadoEn) return null;
    const creado = new Date(creadoEn.replace(' ', 'T')).getTime();
    const diff = ahora - creado;
    const minutos = Math.floor(diff / 60_000);
    if (minutos < 1) return 'ahora';
    if (minutos < 60) return `${minutos} min`;
    const horas = Math.floor(minutos / 60);
    const minsRestantes = minutos % 60;
    return minsRestantes > 0 ? `${horas}h ${minsRestantes}m` : `${horas}h`;
  };

  // ------------------------------------------------------------------
  // Acciones — Mesas
  // ------------------------------------------------------------------

  const handleCrearMesa = async () => {
    const nombre = nombreMesa.trim();
    if (!nombre) {
      Alert.alert('Nombre inválido', 'Ingresa un nombre para la mesa.');
      return;
    }
    if (mesas.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase())) {
      Alert.alert('Ya existe', 'Ya hay una mesa con ese nombre.');
      return;
    }
    try {
      await crearMesa(db, nombre);
      setNombreMesa('');
      setModalCrear(false);
      cargarMesas();
    } catch (error: any) {
      if (error.message === 'Mesa duplicada') {
        Alert.alert('Ya existe', 'Ya hay una mesa con ese nombre.');
      } else {
        Alert.alert('Error', 'No se pudo crear la mesa. Inténtalo de nuevo.');
      }
    }
  };

  const handleEliminarMesa = (mesa: Mesa) => {
    if (mesasOcupadas.has(mesa.id)) {
      Alert.alert('No se puede eliminar', 'La mesa tiene pedidos activos. Finaliza o pasa a ventas antes de eliminarla.');
      return;
    }
    Alert.alert(
      'Eliminar mesa',
      `¿Eliminar la mesa ${mesa.nombre}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await eliminarMesa(db, mesa.id);
            } catch (e) {
              console.error('Error eliminando mesa:', e);
            }
            if (mesaActual?.id === mesa.id) {
              setMesaActual(null);
              setLineas([]);
            }
            await cargarMesas();
          },
        },
      ]
    );
  };

  const handleEntrarMesa = async (mesa: Mesa) => {
    setMesaActual(mesa);
    setMostrarResumen(false);
    setMostrarPostFinalizar(false);
    setCargandoPedido(true);
    try {
      const pedido = await cargarPedidoMesa(db, mesa.id);
      // Asignar _tempId único a cada línea usando el ref para evitar colisiones
      nextTempIdRef.current = Math.max(0, ...pedido.map((l) => l._tempId ?? 0)) + 1;
      const conTempId = pedido.map((l) => ({ ...l, _tempId: nextTempIdRef.current++ }));
      setLineas(conTempId);
    } catch (e) {
      console.error('Error cargando pedido de mesa:', e);
      setLineas([]);
    } finally {
      setCargandoPedido(false);
    }
  };

  const handleVolverLista = async () => {
    setMesaActual(null);
    setLineas([]);
    setMostrarResumen(false);
    setMostrarPostFinalizar(false);
    // Refrescar el estado de mesas ocupadas/libres desde la DB
    // para que un pedido recién agregado se refleje inmediatamente
    try {
      const [mesasConPedidoIds, mesasConTiempo] = await Promise.all([
        obtenerMesasConPedidos(db).catch(() => [] as number[]),
        obtenerMesasConPedidosYTiempo(db).catch(() => [] as MesaConTiempo[]),
      ]);
      setMesasConPedidos(new Set(mesasConPedidoIds));
      const tiempoMap = new Map<number, string>();
      for (const m of mesasConTiempo) {
        if (m.creado_en) tiempoMap.set(m.mesa_id, m.creado_en);
      }
      setTiemposPedido(tiempoMap);
    } catch (e) {
      console.error('Error refrescando mesas al volver:', e);
    }
  };

  // ------------------------------------------------------------------
  // Acciones — Fusionar mesas
  // ------------------------------------------------------------------

  const handleToggleFusion = () => {
    if (modoFusion) {
      // Salir del modo fusión
      setModoFusion(false);
      setMesasSeleccionadas([]);
      setModalFusionConfirm(false);
    } else {
      // Entrar al modo fusión
      setModoFusion(true);
      setMesasSeleccionadas([]);
    }
  };

  const handleSeleccionarMesaFusion = async (mesa: Mesa) => {
    const nuevas = [...mesasSeleccionadas];
    if (nuevas.length > 0) {
      // Deseleccionar si ya estaba
      const idx = nuevas.findIndex((m) => m.id === mesa.id);
      if (idx >= 0) {
        nuevas.splice(idx, 1);
        setMesasSeleccionadas(nuevas);
        return;
      }
    }
    if (nuevas.length < 2) {
      nuevas.push(mesa);
      setMesasSeleccionadas(nuevas);
    }

    // Si ya tenemos 2 mesas, cargar los pedidos y mostrar confirmación
    if (nuevas.length === 2) {
      try {
        const [origen, destino] = await Promise.all([
          cargarPedidoMesa(db, nuevas[1].id),
          cargarPedidoMesa(db, nuevas[0].id),
        ]);
        setPedidoOrigen(origen);
        setPedidoDestino(destino);
        setModalFusionConfirm(true);
      } catch (e) {
        console.error('Error cargando pedidos para fusión:', e);
      }
    }
  };

  const handleConfirmarFusion = async () => {
    if (mesasSeleccionadas.length !== 2) return;
    const [mesaDestino, mesaOrigen] = mesasSeleccionadas;

    try {
      // Cargar los pedidos actuales desde DB (para tener los datos frescos)
      const pedidoDestinoActual = await cargarPedidoMesa(db, mesaDestino.id);
      const pedidoOrigenActual = await cargarPedidoMesa(db, mesaOrigen.id);

      // Lógica de fusión
      const fusionados = fusionarPedidos(pedidoDestinoActual, pedidoOrigenActual);

      // Guardar el pedido fusionado en la mesa destino
      await guardarPedidoMesa(db, mesaDestino.id, fusionados);

      // Limpiar el pedido de la mesa origen
      await limpiarPedidoMesa(db, mesaOrigen.id);

      // Salir del modo fusión y refrescar
      setModoFusion(false);
      setMesasSeleccionadas([]);
      setModalFusionConfirm(false);
      await cargarMesas();
      Alert.alert('Fusión completada', `Los pedidos de "${mesaOrigen.nombre}" se movieron a "${mesaDestino.nombre}".`);
    } catch (e) {
      console.error('Error fusionando mesas:', e);
      Alert.alert('Error', 'No se pudo fusionar las mesas. Inténtalo de nuevo.');
    }
  };

  // Lógica de fusión de dos pedidos
  const fusionarPedidos = (destino: LineaPedido[], origen: LineaPedido[]): LineaPedido[] => {
    const resultado: LineaPedido[] = [];
    const procesadosOrigen = new Set<number>();

    // Copiar todas las líneas del destino
    for (const l of destino) {
      resultado.push({ ...l });
    }

    // Procesar cada línea del origen
    for (const o of origen) {
      // Buscar en el destino una línea con el mismo bebida_id Y mismo estado
      const coincidencia = resultado.find(
        (d) => d.bebida_id === o.bebida_id && d.entregado === o.entregado
      );

      if (coincidencia) {
        // Mismo bebida_id y mismo estado: sumar cantidad
        coincidencia.cantidad += o.cantidad;
        procesadosOrigen.add(o.bebida_id);
      } else {
        // No coincide o estado diferente: agregar como nueva línea
        resultado.push({ ...o });
      }
    }

    return resultado;
  };

  // Guardar pedido en DB
  const guardarLineas = async (nuevasLineas: LineaPedido[]) => {
    if (mesaActual) {
      try {
        await guardarPedidoMesa(db, mesaActual.id, nuevasLineas);
        showToast('Pedido guardado', 'success');
      } catch (e) {
        console.error('Error guardando pedido de mesa:', e);
        showToast('Error al guardar', 'error');
      }
    }
  };

  // ------------------------------------------------------------------
  // Acciones — Pedido
  // ------------------------------------------------------------------

  const handleAbrirSelector = async () => {
    await cargarBebidas();
    setCantidadesSelector({});
    setModalBebidas(true);
  };

  // Generador de _tempId único (useRef para persistir entre renders)
  const nextTempIdRef = useRef(0);
  const asignarTempId = () => {
    const id = nextTempIdRef.current++;
    return id;
  };

  const handleAgregarBebidas = async () => {
    // Agrupar las cantidades solicitadas por bebida_id para evitar duplicados
    const cantidadesPorBebida: Map<number, number> = new Map();
    for (const [bebidaId, cant] of Object.entries(cantidadesSelector)) {
      if (cant > 0) {
        cantidadesPorBebida.set(Number(bebidaId), cant);
      }
    }

    const siguientes: LineaPedido[] = [];

    // Procesar líneas existentes: mantener las que no tienen selector, sumar a pendientes
    for (const l of lineas) {
      const cantExtra = cantidadesPorBebida.get(l.bebida_id);
      if (cantExtra === undefined || cantExtra === 0) {
        // No se pidió esta bebida en el selector, mantener sin cambios
        siguientes.push(l);
      } else if (!l.entregado) {
        // Línea pendiente: sumar cantidad a esta línea
        siguientes.push({ ...l, cantidad: l.cantidad + cantExtra });
        cantidadesPorBebida.delete(l.bebida_id);
      } else {
        // Línea entregada: mantenerla sin cambios; la nueva pendiente se crea después
        siguientes.push(l);
        // No eliminar de cantidadesPorBebida: se necesita para crear la nueva pendiente
      }
    }

    // Crear nuevas líneas pendientes para bebidas que solo existen como entregadas o son nuevas
    for (const [bebidaId, cant] of cantidadesPorBebida) {
      // Buscar si hay una línea entregada con este bebida_id para copiar datos
      const lineaEntregada = lineas.find((l) => l.bebida_id === bebidaId && l.entregado);
      if (lineaEntregada) {
        siguientes.push({
          bebida_id: lineaEntregada.bebida_id,
          bebida_nombre: lineaEntregada.bebida_nombre,
          bebida_precio: lineaEntregada.bebida_precio,
          bebida_costo: lineaEntregada.bebida_costo,
          cantidad: cant,
          entregado: false,
          _tempId: asignarTempId(),
        });
      } else {
        // Bebida completamente nueva
        const bebida = bebidas.find((b) => b.id === bebidaId);
        if (bebida) {
          siguientes.push({
            bebida_id: bebida.id,
            bebida_nombre: bebida.nombre,
            bebida_precio: bebida.precio_venta,
            bebida_costo: bebida.costo_produccion,
            cantidad: cant,
            entregado: false,
            _tempId: asignarTempId(),
          });
        }
      }
    }

    setLineas(siguientes);
    await guardarLineas(siguientes);
    setModalBebidas(false);
  };

  const handleToggleEntregado = async (tempId: number) => {
    // Solo permitir marcar como entregado, no desmarcar
    const siguientes = lineas.map((l) =>
      l._tempId === tempId && !l.entregado ? { ...l, entregado: true } : l
    );
    setLineas(siguientes);
    await guardarLineas(siguientes);
  };

  const handleEliminarLinea = async (tempId: number) => {
    const siguientes = lineas.filter((l) => l._tempId !== tempId);
    setLineas(siguientes);
    await guardarLineas(siguientes);
  };

  const handleCambiarCantidad = async (tempId: number, delta: number) => {
    const siguientes = lineas
      .map((l) =>
        l._tempId === tempId ? { ...l, cantidad: l.cantidad + delta } : l
      )
      .filter((l) => l.cantidad > 0);
    setLineas(siguientes);
    await guardarLineas(siguientes);
  };

  const handleFinalizar = () => {
    if (lineas.length === 0) {
      Alert.alert('Sin pedidos', 'Agrega al menos una bebida al pedido.');
      return;
    }
    const pendientes = lineas.filter((l) => !l.entregado);
    if (pendientes.length > 0) {
      Alert.alert(
        'Bebidas pendientes',
        `Hay ${pendientes.length} bebida(s) sin entregar. Marca todas como entregadas antes de finalizar.`,
      );
      return;
    }
    setMostrarResumen(true);
  };

  const handleVolverEditar = () => {
    setMostrarResumen(false);
    setMostrarPostFinalizar(false);
  };

  const handlePasarAVentas = async () => {
    setGuardando(true);
    try {
      const todosFaltantes: string[] = [];
      for (const linea of lineas) {
        try {
          const resultado = await registrarVenta(db, {
            producto: { tipo: 'bebida', id: linea.bebida_id },
            cantidad: linea.cantidad,
          });
          if (resultado.faltantes.length > 0) {
            const faltas = resultado.faltantes
              .map((f) => `${f.nombre} (tiene ${f.disponible}, necesita ${f.requerido})`)
              .join(', ');
            todosFaltantes.push(`${linea.bebida_nombre}: ${faltas}`);
          }
        } catch (e) {
          console.error('Error registrando venta:', e);
        }
      }

      if (todosFaltantes.length > 0) {
        Alert.alert(
          'Stock bajo',
          `Se registró la venta pero faltan ingredientes:\n\n${todosFaltantes.join('\n')}`,
          [{ text: 'Entendido' }]
        );
      }

      // Limpiar pedido
      if (mesaActual) {
        await limpiarPedidoMesa(db, mesaActual.id);
      }
      setLineas([]);
      setMostrarResumen(false);
      setMostrarPostFinalizar(false);
      setMesaActual(null);
      await cargarMesas();
      Alert.alert('Listo', 'Pedido registrado en ventas.');
    } finally {
      setGuardando(false);
    }
  };

  // ------------------------------------------------------------------
  // Vistas
  // ------------------------------------------------------------------

  // Vista: Resumen (Cuenta profesional)
  if (mostrarResumen && mesaActual) {
    return (
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.barraSuperior}>
          <Pressable onPress={handleVolverEditar} style={estilos.btnAtras}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colores.texto.primary} />
          </Pressable>
          <Text style={tipografia.headline}>Cuenta</Text>
        </View>
        <ScrollView contentContainerStyle={[estilos.scrollContenido, { paddingBottom }]}>
          <Card style={estilos.cuentaCard}>
            <View style={estilos.cuentaEncabezado}>
              <Text style={estilos.cuentaTitulo}>Cejas Café</Text>
              <Text style={estilos.cuentaSubtitulo}>
                Mesa {mesaActual.nombre}
              </Text>
              <Text style={estilos.cuentaFecha}>
                {new Date().toLocaleString('es-MX', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            <View style={estilos.cuentaSeparador} />

            {lineas.map((linea, i) => (
              <View key={`${linea.bebida_id}-${i}`} style={estilos.cuentaLinea}>
                <View style={estilos.cuentaLineaIzq}>
                  <Text style={estilos.cuentaLineaNombre}>{linea.bebida_nombre}</Text>
                  <Text style={estilos.cuentaLineaDetalle}>
                    {linea.cantidad} × {formatearDinero(linea.bebida_precio)}
                  </Text>
                </View>
                <Text style={estilos.cuentaLineaTotal}>
                  {formatearDinero(linea.cantidad * linea.bebida_precio)}
                </Text>
              </View>
            ))}

            <View style={estilos.cuentaSeparador} />

            <View style={estilos.cuentaTotalFila}>
              <Text style={estilos.cuentaTotalEtiqueta}>Total</Text>
              <Text style={estilos.cuentaTotalValor}>
                {formatearDinero(totales.total)}
              </Text>
            </View>
          </Card>
        </ScrollView>

        <View style={[estilos.footerAcciones, { paddingBottom }]}>
          <Button
            label="Editar"
            variant="secondary"
            onPress={handleVolverEditar}
            style={estilos.footerBtn}
          />
          <Button
            label="Pasar a Ventas"
            variant="primary"
            onPress={() => setMostrarPostFinalizar(true)}
            style={estilos.footerBtn}
          />
        </View>

        {/* Confirmación final */}
        <Modal
          visible={mostrarPostFinalizar}
          titulo="Confirmar"
          subtitulo="¿Registrar este pedido en ventas? No se podrá editar después."
          onClose={() => setMostrarPostFinalizar(false)}
        >
          <View style={estilos.modalPie}>
            <Button
              label="Cancelar"
              variant="ghost"
              onPress={() => setMostrarPostFinalizar(false)}
              style={estilos.modalBtn}
            />
            <Button
              label={guardando ? 'Registrando…' : 'Confirmar'}
              variant="primary"
              onPress={handlePasarAVentas}
              disabled={guardando}
              style={estilos.modalBtn}
            />
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Vista: Detalle de mesa (Pedido)
  if (mesaActual) {
    return (
      <SafeAreaView style={estilos.safe}>
        <View style={estilos.barraSuperior}>
          <Pressable onPress={handleVolverLista} style={estilos.btnAtras}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colores.texto.primary} />
          </Pressable>
          <Text style={tipografia.headline}>Mesa {mesaActual.nombre}</Text>
        </View>

        {cargandoPedido ? (
          <View style={estilos.centroVacío}>
            <ActivityIndicator size="large" color={colores.brand.primary} />
            <Text style={estilos.cargandoTexto}>Cargando pedido…</Text>
          </View>
        ) : lineas.length === 0 ? (
          <View style={estilos.centroVacío}>
            <EmptyState
              titulo="Sin pedido"
              texto="Agrega bebidas para crear un pedido en esta mesa."
              accion={{ label: 'Agregar bebidas', onPress: handleAbrirSelector }}
            />
          </View>
        ) : (
          (() => {
            const entregadas = lineas.filter((l) => l.entregado);
            const pendientes = lineas.filter((l) => !l.entregado);
            const renderLinea = (item: LineaPedido, esEntregada: boolean) => (
              <Card key={String(item._tempId)} style={[estilos.lineaCard, esEntregada && estilos.lineaCardEntregada]}>
                <View style={estilos.lineaSuperior}>
                  <View style={estilos.lineaIzq}>
                    <Text style={[estilos.lineaNombre, esEntregada && estilos.lineaNombreEntregada]}>{item.bebida_nombre}</Text>
                    <Text style={[estilos.lineaDetalle, esEntregada && estilos.lineaDetalleEntregada]}>
                      {item.cantidad} × {formatearDinero(item.bebida_precio)} ={' '}
                      {formatearDinero(item.cantidad * item.bebida_precio)}
                    </Text>
                  </View>
                  <View style={estilos.lineaDer}>
                    <View style={estilos.cantidadControl}>
                      <Pressable
                        onPress={() => handleCambiarCantidad(item._tempId!, -1)}
                        disabled={esEntregada}
                        style={[estilos.btnCantidad, esEntregada && estilos.btnCantidadDeshabilitado]}
                      >
                        <MaterialCommunityIcons
                          name="minus"
                          size={18}
                          color={esEntregada ? colores.texto.muted : colores.texto.primary}
                        />
                      </Pressable>
                      <Text style={estilos.cantidadTexto}>{item.cantidad}</Text>
                      <Pressable
                        onPress={() => handleCambiarCantidad(item._tempId!, 1)}
                        disabled={esEntregada}
                        style={[estilos.btnCantidad, esEntregada && estilos.btnCantidadDeshabilitado]}
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={18}
                          color={esEntregada ? colores.texto.muted : colores.texto.primary}
                        />
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={() => handleToggleEntregado(item._tempId!)}
                      style={[
                        estilos.btnEntregado,
                        item.entregado && estilos.btnEntregadoActivo,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.entregado ? 'check-circle' : 'checkbox-blank-circle'}
                        size={28}
                        color={item.entregado ? colores.funcional.success : colores.texto.muted}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => handleEliminarLinea(item._tempId!)}
                      style={estilos.btnEliminar}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={22}
                        color={colores.funcional.error}
                      />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
            return (
              <View style={estilos.contenidoPedido}>
                <ScrollView contentContainerStyle={estilos.lineasLista}>
                  {entregadas.length > 0 && (
                    <View style={estilos.seccionGrupo}>
                      <View style={estilos.seccionEncabezado}>
                        <MaterialCommunityIcons name="check-all" size={18} color={colores.funcional.success} />
                        <Text style={estilos.seccionTitulo}>Entregadas</Text>
                        <Badge label={`${entregadas.length}`} tone="success" />
                      </View>
                      {entregadas.map((item) => renderLinea(item, true))}
                    </View>
                  )}
                  {pendientes.length > 0 && (
                    <View style={estilos.seccionGrupo}>
                      <View style={estilos.seccionEncabezado}>
                        <MaterialCommunityIcons name="clock-outline" size={18} color={colores.funcional.warning} />
                        <Text style={estilos.seccionTitulo}>Pendientes</Text>
                        <Badge label={`${pendientes.length}`} tone="warning" />
                      </View>
                      {pendientes.map((item) => renderLinea(item, false))}
                    </View>
                  )}
                </ScrollView>
                <View style={[estilos.barraInferior, { paddingBottom }]}>
                  <View style={estilos.subtotalFila}>
                    <Text style={estilos.subtotalEtiqueta}>Subtotal</Text>
                    <Text style={estilos.subtotalValor}>{formatearDinero(totales.total)}</Text>
                  </View>
                  <View style={estilos.botonesInferior}>
                    <Button
                      label="Agregar"
                      variant="secondary"
                      onPress={handleAbrirSelector}
                      style={estilos.btnAgregar}
                    />
                    <Button
                      label="Finalizar"
                      variant="primary"
                      onPress={handleFinalizar}
                      style={estilos.btnFinalizar}
                    />
                  </View>
                </View>
              </View>
            )
          })()
        )}

        {/* Modal selector de bebidas */}
        <Modal
          visible={modalBebidas}
          titulo="Seleccionar bebidas"
          onClose={() => setModalBebidas(false)}
          scrollable
          maxAlturaCuerpo={400}
          footer={
            <Button
              label="Agregar al pedido"
              variant="primary"
              onPress={handleAgregarBebidas}
            />
          }
        >
          {bebidas.map((bebida) => (
            <Card key={bebida.id} style={estilos.bebidaItem}>
              <View style={estilos.bebidaInfo}>
                <Text style={estilos.bebidaNombre}>{bebida.nombre}</Text>
                <Text style={estilos.bebidaPrecio}>
                  {formatearDinero(bebida.precio_venta)}
                </Text>
              </View>
              <Stepper
                valor={cantidadesSelector[bebida.id] ?? 0}
                onChange={(val) =>
                  setCantidadesSelector((prev) => ({ ...prev, [bebida.id]: val }))
                }
                minimo={0}
              />
            </Card>
          ))}
        </Modal>
      </SafeAreaView>
    );
  }

  // Vista: Lista de mesas
  return (
    <SafeAreaView style={estilos.safe}>
      <View style={estilos.encabezado}>
        <View style={estilos.encabezadoIzq}>
          <Text style={tipografia.title}>Mesas</Text>
          <Text style={tipografia.small}>
            Gestiona las mesas y los pedidos del local.
          </Text>
        </View>
        <Pressable
          onPress={handleToggleFusion}
          style={[
            estilos.btnFusion,
            modoFusion && estilos.btnFusionActivo,
          ]}
        >
          <MaterialCommunityIcons
            name="merge"
            size={18}
            color={modoFusion ? colores.texto.onBrand : colores.texto.secondary}
          />
          <Text style={[estilos.btnFusionTexto, modoFusion && estilos.btnFusionTextoActivo]}>
            {modoFusion ? 'Cancelar' : 'Fusionar'}
          </Text>
        </Pressable>
      </View>

      {modoFusion && (
        <View style={estilos.barraFusion}>
          <Text style={estilos.barraFusionTexto}>
            {mesasSeleccionadas.length === 0
              ? 'Toca la mesa destino (primera selección)'
              : mesasSeleccionadas.length === 1
              ? `Destino: ${mesasSeleccionadas[0].nombre} — Toca la mesa origen`
              : `Destino: ${mesasSeleccionadas[0].nombre} ← Origen: ${mesasSeleccionadas[1].nombre}`}
          </Text>
        </View>
      )}

      {cargando ? (
        <View style={estilos.centroVacío}>
          <ActivityIndicator size="large" color={colores.brand.primary} />
        </View>
      ) : mesas.length === 0 ? (
        <View style={estilos.centroVacío}>
          <EmptyState
            titulo="Sin mesas"
            texto="Crea una mesa para empezar a tomar pedidos."
            accion={{ label: 'Crear mesa', onPress: () => setModalCrear(true) }}
          />
        </View>
      ) : (
        <FlatList
          data={mesas}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={estilos.gridMesas}
          columnWrapperStyle={estilos.gridMesasFila}
          renderItem={({ item }) => {
            const ocupada = mesasOcupadas.has(item.id);
            const tiempoTexto = ocupada ? formatearTiempoTranscurrido(tiemposPedido.get(item.id)) : null;
            const seleccionadaIdx = mesasSeleccionadas.findIndex((m) => m.id === item.id);
            const estaSeleccionada = seleccionadaIdx >= 0;
            return (
              <View style={estilos.mesaCardWrapper}>
                <Pressable
                  onPress={() => {
                    if (modoFusion) {
                      if (ocupada) {
                        handleSeleccionarMesaFusion(item);
                      }
                    } else {
                      handleEntrarMesa(item);
                      setMesaMenuAbierto(null);
                    }
                  }}
                  onLongPress={() => {
                    if (!modoFusion && !ocupada) {
                      handleEliminarMesa(item);
                      setMesaMenuAbierto(null);
                    }
                  }}
                  style={({ pressed }) => [
                    estilos.mesaCard,
                    pressed && estilos.mesaCardPresionada,
                    estaSeleccionada && estilos.mesaCardSeleccionada,
                    !ocupada && modoFusion && estilos.mesaCardDeshabilitada,
                  ]}
                >
                  {estaSeleccionada ? (
                    <View style={estilos.fusionBadge}>
                      <MaterialCommunityIcons
                        name={seleccionadaIdx === 0 ? 'arrow-right-circle' : 'arrow-left-circle'}
                        size={28}
                        color={colores.brand.primary}
                      />
                      <Text style={estilos.fusionBadgeTexto}>
                        {seleccionadaIdx === 0 ? 'Destino' : 'Origen'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name="table-chair"
                        size={32}
                        color={ocupada ? colores.brand.amber : colores.brand.accent}
                      />
                      <Text style={estilos.mesaNumero}>{item.nombre}</Text>
                    </>
                  )}
                  {!estaSeleccionada && (
                    <>
                      <Badge
                        label={ocupada ? 'Ocupada' : 'Libre'}
                        tone={ocupada ? 'warning' : 'success'}
                      />
                      {ocupada && tiempoTexto && (
                        <View style={estilos.tiempoPedidoBadge}>
                          <MaterialCommunityIcons name="clock-outline" size={10} color={colores.texto.secondary} />
                          <Text style={estilos.tiempoPedidoTexto}>{tiempoTexto}</Text>
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
                {!modoFusion && !ocupada && (
                  <Pressable
                    onPress={() => {
                      if (mesaMenuAbierto?.id === item.id) {
                        handleEliminarMesa(item);
                        setMesaMenuAbierto(null);
                      } else {
                        setMesaMenuAbierto(item.id === mesaMenuAbierto?.id ? null : item);
                      }
                    }}
                    style={estilos.mesaMenuBtn}
                  >
                    <MaterialCommunityIcons
                      name={mesaMenuAbierto?.id === item.id ? 'delete' : 'dots-vertical'}
                      size={18}
                      color={mesaMenuAbierto?.id === item.id ? colores.funcional.error : colores.texto.muted}
                    />
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}

      {/* Botón flotante para crear mesa (ocultar en modo fusión) */}
      {!modoFusion && (
        <Pressable
          onPress={() => setModalCrear(true)}
          style={({ pressed }) => [
            estilos.fab,
            pressed && estilos.fabPresionado,
          ]}
        >
          <MaterialCommunityIcons name="plus" size={28} color={colores.texto.onBrand} />
        </Pressable>
      )}

      {/* Modal confirmación de fusión */}
      <Modal
        visible={modalFusionConfirm}
        titulo="Confirmar fusión"
        subtitulo={`Los pedidos de "${mesasSeleccionadas[1]?.nombre}" se moverán a "${mesasSeleccionadas[0]?.nombre}".`}
        onClose={() => {
          setModalFusionConfirm(false);
          setMesasSeleccionadas([]);
          setModoFusion(false);
        }}
        scrollable
        maxAlturaCuerpo={300}
      >
        {pedidoDestino.length > 0 && (
          <View style={estilos.fusionSeccion}>
            <Text style={estilos.fusionSeccionTitulo}>📋 Mesa destino (actual)</Text>
            {pedidoDestino.map((l, i) => (
              <Text key={i} style={estilos.fusionLinea}>
                {l.bebida_nombre} × {l.cantidad} {l.entregado ? '✓' : '⏱'}
              </Text>
            ))}
          </View>
        )}
        {pedidoOrigen.length > 0 && (
          <View style={estilos.fusionSeccion}>
            <Text style={estilos.fusionSeccionTitulo}>➡️ Mesa origen (se moverá)</Text>
            {pedidoOrigen.map((l, i) => (
              <Text key={i} style={estilos.fusionLinea}>
                {l.bebida_nombre} × {l.cantidad} {l.entregado ? '✓' : '⏱'}
              </Text>
            ))}
          </View>
        )}
        {pedidoOrigen.length === 0 && pedidoDestino.length === 0 && (
          <Text style={estilos.fusionVacío}>Ambas mesas tienen pedidos vacíos.</Text>
        )}
        <View style={estilos.modalPie}>
          <Button
            label="Cancelar"
            variant="ghost"
            onPress={() => {
              setModalFusionConfirm(false);
              setMesasSeleccionadas([]);
              setModoFusion(false);
            }}
            style={estilos.modalBtn}
          />
          <Button
            label="Fusionar"
            variant="primary"
            onPress={handleConfirmarFusion}
            style={estilos.modalBtn}
          />
        </View>
      </Modal>

      {/* Modal crear mesa */}
      <Modal
        visible={modalCrear}
        titulo="Nueva mesa"
        onClose={() => setModalCrear(false)}
      >
        <Input
          label="Nombre de mesa"
          value={nombreMesa}
          onChangeText={setNombreMesa}
          placeholder="Ej. Mesa Ventana, Barra 1, Terraza A…"
          autoFocus
        />
        <View style={estilos.modalPie}>
          <Button
            label="Cancelar"
            variant="ghost"
            onPress={() => setModalCrear(false)}
            style={estilos.modalBtn}
          />
          <Button
            label="Crear"
            variant="primary"
            onPress={handleCrearMesa}
            style={estilos.modalBtn}
          />
        </View>
      </Modal>

      {/* Toast de confirmación */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const estilos = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
  encabezado: {
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado['4xl'],
    paddingBottom: espaciado.lg,
    gap: espaciado.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  encabezadoIzq: {
    flex: 1,
  },
  // Botón de fusión
  btnFusion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radio.md,
    backgroundColor: colores.bg.surface,
    borderWidth: 1,
    borderColor: colores.borde.default,
  },
  btnFusionActivo: {
    backgroundColor: colores.brand.primary,
    borderColor: colores.brand.primary,
  },
  btnFusionTexto: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 13,
    color: colores.texto.secondary,
  },
  btnFusionTextoActivo: {
    color: colores.texto.onBrand,
  },
  // Barra de instrucciones de fusión
  barraFusion: {
    marginHorizontal: espaciado['2xl'],
    marginVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radio.md,
    backgroundColor: colores.brand.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: colores.brand.primary,
  },
  barraFusionTexto: {
    fontFamily: fuentes.outfitMedium,
    fontSize: 13,
    color: colores.texto.primary,
  },
  // Mesa seleccionada para fusión
  mesaCardSeleccionada: {
    borderWidth: 3,
    borderColor: colores.brand.primary,
    backgroundColor: colores.brand.primary + '10',
  },
  mesaCardDeshabilitada: {
    opacity: 0.4,
  },
  fusionBadge: {
    alignItems: 'center',
    gap: 4,
  },
  fusionBadgeTexto: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 11,
    color: colores.brand.primary,
    textTransform: 'uppercase' as const,
  },
  // Modal de fusión
  fusionSeccion: {
    marginBottom: espaciado.md,
  },
  fusionSeccionTitulo: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 14,
    color: colores.texto.primary,
    marginBottom: espaciado.xs,
  },
  fusionLinea: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 13,
    color: colores.texto.secondary,
    paddingVertical: 2,
    paddingLeft: espaciado.sm,
  },
  fusionVacío: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 14,
    color: colores.texto.muted,
    textAlign: 'center',
    paddingVertical: espaciado.xl,
  },
  centroVacío: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.md,
  },
  cargandoTexto: {
    fontFamily: fuentes.outfitMedium,
    fontSize: 14,
    color: colores.texto.secondary,
  },
  // Grid de mesas
  gridMesas: {
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.lg,
    gap: espaciado.md,
  },
  gridMesasFila: {
    gap: espaciado.md,
  },
  mesaCardWrapper: {
    flex: 1,
    maxWidth: '30%',
    position: 'relative',
  },
  mesaCard: {
    flex: 1,
    backgroundColor: colores.bg.surface,
    borderRadius: radio.lg,
    padding: espaciado.lg,
    alignItems: 'center',
    gap: espaciado.sm,
    ...sombra.md,
  },
  mesaCardPresionada: {
    opacity: 0.7,
  },
  mesaMenuBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.bg.surface,
    zIndex: 1,
  },
  mesaNumero: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 24,
    color: colores.texto.primary,
  },
  // Badge de tiempo de pedido
  tiempoPedidoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  tiempoPedidoTexto: {
    fontFamily: fuentes.outfitMedium,
    fontSize: 11,
    color: colores.texto.secondary,
  },
  // FAB
  fab: {
    position: 'absolute',
    right: espaciado['2xl'],
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colores.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.md,
  },
  fabPresionado: {
    opacity: 0.8,
  },
  // Barra superior
  barraSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingHorizontal: espaciado['2xl'],
    paddingVertical: espaciado.lg,
  },
  btnAtras: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pedido
  contenidoPedido: {
    flex: 1,
  },
  lineasLista: {
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado.lg,
    gap: espaciado.md,
  },
  lineaCard: {
    padding: espaciado.lg,
  },
  lineaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lineaIzq: {
    flex: 1,
    marginRight: espaciado.md,
  },
  lineaNombre: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 16,
    color: colores.texto.primary,
  },
  lineaDetalle: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 13,
    color: colores.texto.secondary,
    marginTop: 2,
  },
  lineaDer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  // Líneas entregadas (atenuadas)
  lineaCardEntregada: {
    opacity: 0.55,
  },
  lineaNombreEntregada: {
    textDecorationLine: 'line-through',
    color: colores.texto.muted,
  },
  lineaDetalleEntregada: {
    color: colores.texto.muted,
  },
  // Secciones de grupos (entregadas / pendientes)
  seccionGrupo: {
    gap: espaciado.md,
    marginBottom: espaciado['2xl'],
  },
  seccionEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    marginBottom: espaciado.sm,
  },
  seccionTitulo: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 13,
    color: colores.texto.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  btnEntregado: {
    padding: 4,
  },
  btnEntregadoActivo: {},
  btnEliminar: {
    padding: 4,
  },
  // Control de cantidad +/-
  cantidadControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colores.bg.background,
    borderRadius: radio.md,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  btnCantidad: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.bg.surface,
    borderWidth: 1,
    borderColor: colores.borde.default,
  },
  btnCantidadDeshabilitado: {
    opacity: 0.3,
  },
  cantidadTexto: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 15,
    color: colores.texto.primary,
    minWidth: 20,
    textAlign: 'center',
  },
  // Barra inferior del pedido
  barraInferior: {
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado.lg,
    gap: espaciado.md,
  },
  subtotalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: espaciado.sm,
  },
  subtotalEtiqueta: {
    fontFamily: fuentes.outfitMedium,
    fontSize: 16,
    color: colores.texto.secondary,
  },
  subtotalValor: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 20,
    color: colores.texto.primary,
  },
  botonesInferior: {
    flexDirection: 'row',
    gap: espaciado.md,
  },
  btnAgregar: {
    flex: 1,
  },
  btnFinalizar: {
    flex: 1,
  },
  // Selector de bebidas
  bebidaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: espaciado.md,
  },
  bebidaInfo: {
    flex: 1,
  },
  bebidaNombre: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 15,
    color: colores.texto.primary,
  },
  bebidaPrecio: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 13,
    color: colores.brand.secondary,
    marginTop: 2,
  },
  // Modal
  modalPie: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginTop: espaciado.xl,
  },
  modalBtn: {
    flex: 1,
  },
  // Cuenta / Resumen
  scrollContenido: {
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado.lg,
  },
  cuentaCard: {
    padding: espaciado['2xl'],
  },
  cuentaEncabezado: {
    alignItems: 'center',
    gap: espaciado.xs,
    marginBottom: espaciado.lg,
  },
  cuentaTitulo: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 28,
    color: colores.texto.primary,
  },
  cuentaSubtitulo: {
    fontFamily: fuentes.outfitMedium,
    fontSize: 16,
    color: colores.texto.secondary,
  },
  cuentaFecha: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 13,
    color: colores.texto.muted,
    marginTop: espaciado.xs,
  },
  cuentaSeparador: {
    height: 1,
    backgroundColor: colores.borde.default,
    marginVertical: espaciado.md,
  },
  cuentaLinea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: espaciado.sm,
  },
  cuentaLineaIzq: {
    flex: 1,
  },
  cuentaLineaNombre: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 15,
    color: colores.texto.primary,
  },
  cuentaLineaDetalle: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 13,
    color: colores.texto.muted,
    marginTop: 2,
  },
  cuentaLineaTotal: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 15,
    color: colores.texto.primary,
  },
  cuentaTotalFila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: espaciado.md,
  },
  cuentaTotalEtiqueta: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 22,
    color: colores.texto.primary,
  },
  cuentaTotalValor: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 30,
    color: colores.brand.secondary,
  },
  // Footer acciones
  footerAcciones: {
    flexDirection: 'row',
    gap: espaciado.md,
    paddingHorizontal: espaciado['2xl'],
    backgroundColor: colores.bg.surface,
    ...sombra.md,
  },
  footerBtn: {
    flex: 1,
  },
});
