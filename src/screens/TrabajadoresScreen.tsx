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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  eliminarTrabajador,
  listarTrabajadores,
} from '../db/repos/trabajadores';
import {
  actualizarPago,
  eliminarPago,
  listarPagosPorTrabajador,
  obtenerTotalesPorTrabajador,
  registrarPago,
} from '../db/repos/pagos_trabajador';
import type {
  NuevoPagoTrabajador,
  NuevoTrabajador,
  PagoTrabajador,
  TotalesTrabajador,
  Trabajador,
} from '../domain/tipos';
import { rangoDePeriodo, TipoPeriodo } from '../domain/fechas';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { formatearDinero, fuentes, tipografia } from '../theme/typography';
import { useBottomSafe } from '../hooks/useBottomSafe';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ChipSelector } from '../ui/ChipSelector';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parsearPrecio(texto: string): number {
  const normalizado = texto.trim().replace(',', '.');
  const valor = parseFloat(normalizado);
  return Number.isFinite(valor) ? valor : NaN;
}

function formatearFecha(iso: string): string {
  const d = new Date(iso);
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const ano = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${dia}/${mes}/${ano} ${hh}:${mm}`;
}

const OPCIONES_PERIODO: { valor: TipoPeriodo; etiqueta: string }[] = [
  { valor: 'hoy', etiqueta: 'Hoy' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
  { valor: 'todo', etiqueta: 'Todo' },
];

// ---------------------------------------------------------------------------
// Formulario: Crear / Editar trabajador
// ---------------------------------------------------------------------------

interface FormularioTrabajadorProps {
  inicial: Trabajador | null;
  onGuardar: (dato: NuevoTrabajador) => Promise<void>;
  onCancelar: () => void;
}

function FormularioTrabajador({ inicial, onGuardar, onCancelar }: FormularioTrabajadorProps) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  const validar = (): boolean => {
    if (nombre.trim().length === 0) {
      setErrorNombre('Escribe un nombre para el trabajador.');
      return false;
    }
    setErrorNombre(undefined);
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      await onGuardar({ nombre: nombre.trim() });
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
        placeholder="p. ej. Juan Pérez"
        error={errorNombre}
        autoFocus
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

// ---------------------------------------------------------------------------
// Formulario: Registrar pago (producción y propina separados)
// ---------------------------------------------------------------------------

interface FormularioPagoProps {
  trabajadorId: number;
  onGuardar: (datos: NuevoPagoTrabajador[]) => Promise<void>;
  onCancelar: () => void;
}

function FormularioPago({ trabajadorId, onGuardar, onCancelar }: FormularioPagoProps) {
  const [montoProduccion, setMontoProduccion] = useState('');
  const [montoPropina, setMontoPropina] = useState('');
  const [errorProduccion, setErrorProduccion] = useState<string | undefined>();
  const [errorPropina, setErrorPropina] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  // Fecha del pago: por defecto hoy como string YYYY-MM-DD
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  const [fechaTexto, setFechaTexto] = useState(`${yyyy}-${mm}-${dd}`);

  const formatearFechaCorta = (iso: string): string => {
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  const validar = (): NuevoPagoTrabajador[] => {
    const pagos: NuevoPagoTrabajador[] = [];
    const fechaStr = fechaTexto + 'T00:00:00';

    const valorProd = parsearPrecio(montoProduccion);
    if (!Number.isNaN(valorProd) && valorProd > 0) {
      pagos.push({ trabajador_id: trabajadorId, tipo: 'produccion', monto: valorProd, fecha: fechaStr });
    } else if (montoProduccion.trim().length > 0) {
      setErrorProduccion('Monto no válido.');
    } else {
      setErrorProduccion(undefined);
    }

    const valorProp = parsearPrecio(montoPropina);
    if (!Number.isNaN(valorProp) && valorProp > 0) {
      pagos.push({ trabajador_id: trabajadorId, tipo: 'propina', monto: valorProp, fecha: fechaStr });
    } else if (montoPropina.trim().length > 0) {
      setErrorPropina('Monto no válido.');
    } else {
      setErrorPropina(undefined);
    }

    if (pagos.length === 0) {
      // Al menos uno debe tener un monto válido
      setErrorProduccion('Ingresa al menos un monto.');
      setErrorPropina('Ingresa al menos un monto.');
      return [];
    }

    return pagos;
  };

  const guardar = async () => {
    const pagos = validar();
    if (pagos.length === 0) return;
    setGuardando(true);
    try {
      await onGuardar(pagos);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {/* Campo de fecha */}
      <Text style={[tipografia.small, estilos.labelSeccion]}>
        Fecha del pago
      </Text>
      <Input
        label="Fecha"
        value={formatearFechaCorta(fechaTexto)}
        onChangeText={(t) => {
          // Permitir edición simple: convertir DD/MM/AAAA a YYYY-MM-DD
          const parts = t.split('/');
          if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
            setFechaTexto(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            setFechaTexto(t);
          }
        }}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
      />

      <Text style={[tipografia.small, estilos.labelSeccion, { marginTop: espaciado.md }]}>
        Montos del día
      </Text>
      <View style={estilos.montoSeparadoContainer}>
        <View style={estilos.montoBloque}>
          <View style={[estilos.montoBloqueHeader, { backgroundColor: colores.brand.secondary }]}>
            <Feather name="briefcase" size={16} color={colores.texto.onBrand} />
            <Text style={estilos.montoBloqueTitulo}>Producción</Text>
          </View>
          <Input
            label="Monto pagado"
            value={montoProduccion}
            onChangeText={(text) => {
              setMontoProduccion(text);
              setErrorProduccion(undefined);
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errorProduccion}
          />
        </View>
        <View style={estilos.montoBloque}>
          <View style={[estilos.montoBloqueHeader, { backgroundColor: colores.funcional.success }]}>
            <Feather name="gift" size={16} color={colores.texto.onBrand} />
            <Text style={estilos.montoBloqueTitulo}>Propina</Text>
          </View>
          <Input
            label="Monto pagado"
            value={montoPropina}
            onChangeText={(text) => {
              setMontoPropina(text);
              setErrorPropina(undefined);
            }}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errorPropina}
          />
        </View>
      </View>
      <View style={estilos.footerFormulario}>
        <Button
          label="Cancelar"
          variant="secondary"
          onPress={onCancelar}
          disabled={guardando}
          style={estilos.botonMitad}
        />
        <Button
          label="Registrar"
          icon="check"
          onPress={guardar}
          disabled={guardando}
          style={estilos.botonMitad}
        />
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Formulario: Editar pago existente
// ---------------------------------------------------------------------------

interface FormularioEditarPagoProps {
  pago: PagoTrabajador;
  onGuardar: (tipo: string, monto: number, fecha: string) => Promise<void>;
  onCancelar: () => void;
}

function FormularioEditarPago({ pago, onGuardar, onCancelar }: FormularioEditarPagoProps) {
  const [tipo, setTipo] = useState<'produccion' | 'propina'>(pago.tipo);
  const [monto, setMonto] = useState(String(pago.monto));
  const [errorMonto, setErrorMonto] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  // Extraer la fecha YYYY-MM-DD del creado_en
  const fechaBase = pago.creado_en.split('T')[0];
  const [fechaTexto, setFechaTexto] = useState(fechaBase);

  const formatearFechaCorta = (iso: string): string => {
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return iso;
  };

  const validar = (): boolean => {
    const valor = parsearPrecio(monto);
    if (Number.isNaN(valor) || valor <= 0) {
      setErrorMonto('Ingresa un monto válido mayor a 0.');
      return false;
    }
    setErrorMonto(undefined);
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      await onGuardar(tipo, parsearPrecio(monto), fechaTexto);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      {/* Tipo de pago */}
      <Text style={[tipografia.small, estilos.labelSeccion]}>Tipo de pago</Text>
      <View style={estilos.tipoPagoRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTipo('produccion')}
          style={[
            estilos.tipoPagoChip,
            tipo === 'produccion' && { backgroundColor: colores.brand.secondary },
          ]}
        >
          <Text
            style={[
              estilos.tipoPagoTexto,
              tipo === 'produccion' && { color: colores.texto.onBrand },
            ]}
          >
            Producción
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setTipo('propina')}
          style={[
            estilos.tipoPagoChip,
            tipo === 'propina' && { backgroundColor: colores.funcional.success },
          ]}
        >
          <Text
            style={[
              estilos.tipoPagoTexto,
              tipo === 'propina' && { color: colores.texto.onBrand },
            ]}
          >
            Propina
          </Text>
        </Pressable>
      </View>

      {/* Fecha */}
      <Text style={[tipografia.small, estilos.labelSeccion, { marginTop: espaciado.md }]}>
        Fecha
      </Text>
      <Input
        label="Fecha"
        value={formatearFechaCorta(fechaTexto)}
        onChangeText={(t) => {
          const parts = t.split('/');
          if (parts.length === 3 && parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
            setFechaTexto(`${parts[2]}-${parts[1]}-${parts[0]}`);
          } else {
            setFechaTexto(t);
          }
        }}
        placeholder="DD/MM/AAAA"
        keyboardType="number-pad"
      />

      {/* Monto */}
      <Text style={[tipografia.small, estilos.labelSeccion, { marginTop: espaciado.md }]}>
        Monto
      </Text>
      <Input
        label="Monto"
        value={monto}
        onChangeText={(text) => {
          setMonto(text);
          setErrorMonto(undefined);
        }}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errorMonto}
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
          label="Guardar"
          icon="check"
          onPress={guardar}
          disabled={guardando}
          style={estilos.botonMitad}
        />
      </View>
    </>
  );
}

// ---------------------------------------------------------------------------
// Detalle del trabajador (historial + totales)
// ---------------------------------------------------------------------------

interface DetalleTrabajadorProps {
  trabajador: Trabajador;
  periodo: TipoPeriodo;
  onRegistrarPago: () => void;
  onVolver: () => void;
  key?: number;
}

function DetalleTrabajador({
  trabajador,
  periodo,
  onRegistrarPago,
  onVolver,
}: DetalleTrabajadorProps) {
  const db = useSQLiteContext();
  const [pagos, setPagos] = useState<PagoTrabajador[]>([]);
  const [totales, setTotales] = useState<TotalesTrabajador>({
    produccion: 0,
    propina: 0,
    total: 0,
  });
  const [cargando, setCargando] = useState(true);

  // Modales de edición y eliminación de pago
  const [editandoPago, setEditandoPago] = useState<PagoTrabajador | null>(null);
  const [eliminandoPago, setEliminandoPago] = useState<PagoTrabajador | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const { desde, hasta } = rangoDePeriodo(periodo);
      const [lista, tot] = await Promise.all([
        listarPagosPorTrabajador(db, trabajador.id, desde, hasta),
        obtenerTotalesPorTrabajador(db, trabajador.id, desde, hasta),
      ]);
      setPagos(lista);
      setTotales(tot);
    } finally {
      setCargando(false);
    }
  }, [db, trabajador.id, periodo]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const eliminarPagoHandler = async () => {
    if (eliminandoPago == null) return;
    await eliminarPago(db, eliminandoPago.id);
    setEliminandoPago(null);
    await cargar();
  };

  const editarPagoHandler = async (tipo: string, monto: number, fecha: string) => {
    if (editandoPago == null) return;
    await actualizarPago(db, editandoPago.id, tipo, monto, fecha + 'T00:00:00');
    setEditandoPago(null);
    await cargar();
  };

  const renderItem = ({ item }: { item: PagoTrabajador }) => (
    <View style={estilos.filaPago}>
      <View style={estilos.filaPagoIzq}>
        <Badge
          label={item.tipo === 'produccion' ? 'Producción' : 'Propina'}
          tone={item.tipo === 'produccion' ? 'info' : 'success'}
        />
        <Text style={tipografia.small}>{formatearFecha(item.creado_en)}</Text>
      </View>
      <View style={estilos.filaPagoDer}>
        <Text
          style={[
            tipografia.headline,
            {
              color:
                item.tipo === 'produccion'
                  ? colores.brand.secondary
                  : colores.funcional.success,
            },
          ]}
        >
          {formatearDinero(item.monto)}
        </Text>
        <View style={estilos.filaPagoAcciones}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar pago ${item.id}`}
            onPress={() => setEditandoPago(item)}
            style={estilos.botonPagoAccion}
          >
            <Feather name="edit-2" size={14} color={colores.brand.secondary} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Eliminar pago ${item.id}`}
            onPress={() => setEliminandoPago(item)}
            style={estilos.botonPagoAccion}
          >
            <Feather name="trash-2" size={14} color={colores.funcional.error} />
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={estilos.detalleContainer}>
      {/* Header */}
      <View style={estilos.detalleHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={onVolver}
          style={estilos.botonVolver}
        >
          <Feather name="arrow-left" size={22} color={colores.texto.primary} />
        </Pressable>
        <View style={estilos.detalleInfo}>
          <Text style={tipografia.title}>{trabajador.nombre}</Text>
          <Text style={tipografia.small}>Historial de pagos</Text>
        </View>
      </View>

      {/* Totales */}
      <Card style={estilos.cardTotales}>
        <View style={estilos.filaTotales}>
          <View style={estilos.celdaTotal}>
            <Text style={tipografia.micro}>Producción</Text>
            <Text style={[estilos.valorTotal, { color: colores.brand.secondary }]}>
              {formatearDinero(totales.produccion)}
            </Text>
          </View>
          <View style={estilos.divisorTotal} />
          <View style={estilos.celdaTotal}>
            <Text style={tipografia.micro}>Propina</Text>
            <Text style={[estilos.valorTotal, { color: colores.funcional.success }]}>
              {formatearDinero(totales.propina)}
            </Text>
          </View>
          <View style={estilos.divisorTotal} />
          <View style={estilos.celdaTotal}>
            <Text style={tipografia.micro}>Total</Text>
            <Text style={[estilos.valorTotal, { color: colores.texto.primary }]}>
              {formatearDinero(totales.total)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Botón registrar pago */}
      <Button label="Registrar pago" icon="plus" onPress={onRegistrarPago} />

      {/* Lista de pagos */}
      {cargando ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        </View>
      ) : pagos.length === 0 ? (
        <EmptyState
          titulo="Sin pagos"
          texto="Aún no se han registrado pagos para este trabajador en el período seleccionado."
        />
      ) : (
        <FlatList
          data={pagos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={estilos.listaPagos}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal eliminar pago */}
      <Modal
        visible={eliminandoPago != null}
        titulo="¿Eliminar pago?"
        subtitulo={
          eliminandoPago
            ? `${formatearDinero(eliminandoPago.monto)} - ${eliminandoPago.tipo === 'produccion' ? 'Producción' : 'Propina'}`
            : ''
        }
        onClose={() => setEliminandoPago(null)}
      >
        <Text style={tipografia.small}>
          Este pago se eliminará permanentemente del historial. Esta acción no se puede deshacer.
        </Text>
        <View style={estilos.footerModal}>
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={() => setEliminandoPago(null)}
            style={estilos.botonMitad}
          />
          <Button
            label="Eliminar"
            icon="trash-2"
            variant="danger"
            onPress={eliminarPagoHandler}
            style={estilos.botonMitad}
          />
        </View>
      </Modal>

      {/* Modal editar pago */}
      <Modal
        visible={editandoPago != null}
        titulo="Editar pago"
        subtitulo={
          editandoPago
            ? `Modifica el pago de ${formatearDinero(editandoPago.monto)}`
            : ''
        }
        onClose={() => setEditandoPago(null)}
      >
        {editandoPago != null && (
        <FormularioEditarPago
          pago={editandoPago}
          onGuardar={editarPagoHandler}
          onCancelar={() => setEditandoPago(null)}
        />
      )}
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen principal
// ---------------------------------------------------------------------------

export function TrabajadoresScreen() {
  const db = useSQLiteContext();
  const paddingBottom = useBottomSafe();

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState<TipoPeriodo>('todo');

  // Modales CRUD
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editando, setEditando] = useState<Trabajador | null>(null);
  const [eliminando, setEliminando] = useState<Trabajador | null>(null);

  // Detalle
  const [detalle, setDetalle] = useState<Trabajador | null>(null);
  const [pagoAbierto, setPagoAbierto] = useState(false);

  // Totales por período
  const [totalesMap, setTotalesMap] = useState<Map<number, TotalesTrabajador>>(new Map());

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const { desde, hasta } = rangoDePeriodo(periodo);
      const lista = await listarTrabajadores(db);

      // Cargar totales en paralelo
      const totales = await Promise.all(
        lista.map((t) => obtenerTotalesPorTrabajador(db, t.id, desde, hasta))
      );
      const map = new Map<number, TotalesTrabajador>();
      lista.forEach((t, i) => map.set(t.id, totales[i]));
      setTotalesMap(map);
      setTrabajadores(lista);
    } finally {
      setCargando(false);
    }
  }, [db, periodo]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  // CRUD handlers
  const abrirNuevo = () => {
    setEditando(null);
    setFormularioAbierto(true);
  };

  const abrirEdicion = (trabajador: Trabajador) => {
    setEditando(trabajador);
    setFormularioAbierto(true);
  };

  const guardarTrabajador = async (dato: NuevoTrabajador) => {
    const { crearTrabajador, actualizarTrabajador } = await import(
      '../db/repos/trabajadores'
    );
    if (editando != null) {
      await actualizarTrabajador(db, editando.id, dato);
    } else {
      await crearTrabajador(db, dato);
    }
    setFormularioAbierto(false);
    setEditando(null);
    await recargar();
  };

  const confirmarEliminar = async () => {
    if (eliminando == null) return;
    await eliminarTrabajador(db, eliminando.id);
    setEliminando(null);
    await recargar();
  };

  // Refresco para forzar recarga del detalle
  const [detalleRefresco, setDetalleRefresco] = useState(0);

  // Pago handler
  const registrarPagoHandler = async (datos: NuevoPagoTrabajador[]) => {
    for (const dato of datos) {
      await registrarPago(db, dato);
    }
    setPagoAbierto(false);
    setDetalleRefresco((k) => k + 1);
    await recargar();
  };

  const totalPeriodo = useMemo(
    () => Array.from(totalesMap.values()).reduce((s, t) => s + t.total, 0),
    [totalesMap]
  );

  // Si estamos en vista de detalle, mostrarla
  if (detalle != null) {
    return (
      <SafeAreaView style={estilos.safe}>
        <DetalleTrabajador
          trabajador={detalle}
          periodo={periodo}
          onRegistrarPago={() => setPagoAbierto(true)}
          onVolver={() => setDetalle(null)}
          key={detalleRefresco}
        />
        <Modal
          visible={pagoAbierto}
          titulo="Registrar pago"
          subtitulo={`Agregar un pago para ${detalle.nombre}`}
          onClose={() => setPagoAbierto(false)}
        >
          <FormularioPago
            trabajadorId={detalle.id}
            onGuardar={registrarPagoHandler}
            onCancelar={() => setPagoAbierto(false)}
          />
        </Modal>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: Trabajador }) => {
    const totales = totalesMap.get(item.id) ?? { produccion: 0, propina: 0, total: 0 };
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${item.nombre}`}
        onPress={() => setDetalle(item)}
      >
        <Card style={estilos.card}>
          <View style={estilos.filaSuperior}>
            <View style={estilos.info}>
              <Text style={tipografia.headline} numberOfLines={1}>
                {item.nombre}
              </Text>
              <View style={estilos.badgesRow}>
                <Badge label={`Prod: ${formatearDinero(totales.produccion)}`} tone="info" />
                <Badge label={`Prop: ${formatearDinero(totales.propina)}`} tone="success" />
              </View>
            </View>
            <View style={estilos.derechaCard}>
              <Text
                style={[
                  {
                    fontFamily: fuentes.frauncesSemiBold,
                    fontSize: 18,
                    color: colores.texto.primary,
                    textAlign: 'right',
                  },
                ]}
              >
                {formatearDinero(totales.total)}
              </Text>
              <Feather name="chevron-right" size={18} color={colores.texto.muted} />
            </View>
          </View>
          <View style={estilos.filaAcciones}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Editar ${item.nombre}`}
              onPress={(e) => {
                e.stopPropagation();
                abrirEdicion(item);
              }}
              style={estilos.botonAccion}
            >
              <Feather name="edit-2" size={18} color={colores.brand.secondary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${item.nombre}`}
              onPress={(e) => {
                e.stopPropagation();
                setEliminando(item);
              }}
              style={estilos.botonAccion}
            >
              <Feather name="trash-2" size={18} color={colores.funcional.error} />
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={estilos.safe}>
      {/* Header */}
      <View style={estilos.encabezado}>
        <View style={estilos.titulos}>
          <Text style={tipografia.title}>Trabajadores</Text>
          <Text style={tipografia.small}>
            {cargando
              ? 'Cargando…'
              : `${trabajadores.length} ${trabajadores.length === 1 ? 'trabajador' : 'trabajadores'} · ${formatearDinero(totalPeriodo)}`}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Nuevo trabajador"
          onPress={abrirNuevo}
          style={estilos.botonNuevo}
        >
          <Feather name="plus" size={24} color={colores.texto.onBrand} />
        </Pressable>
      </View>

      {/* Filtro período */}
      <View style={estilos.filtroContainer}>
        <ChipSelector
          opciones={OPCIONES_PERIODO}
          seleccionado={periodo}
          onSeleccionar={(v) => {
            setPeriodo(v as TipoPeriodo);
          }}
        />
      </View>

      {/* Lista */}
      {cargando ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={colores.brand.secondary} size="large" />
        </View>
      ) : (
        <FlatList
          data={trabajadores}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[estilos.lista, { paddingBottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              titulo="Aún no hay trabajadores"
              texto="Agrega a tu equipo para registrar los pagos de salario diarios."
              accion={{ label: 'Agregar trabajador', onPress: abrirNuevo }}
            />
          }
        />
      )}

      {/* Modal crear / editar */}
      <Modal
        visible={formularioAbierto}
        titulo={editando != null ? 'Editar trabajador' : 'Nuevo trabajador'}
        subtitulo={
          editando != null
            ? 'Actualiza el nombre y guarda los cambios.'
            : 'Escribe el nombre del trabajador.'
        }
        onClose={() => {
          setFormularioAbierto(false);
          setEditando(null);
        }}
      >
        <FormularioTrabajador
          key={editando?.id ?? 'nuevo'}
          inicial={editando}
          onGuardar={guardarTrabajador}
          onCancelar={() => {
            setFormularioAbierto(false);
            setEditando(null);
          }}
        />
      </Modal>

      {/* Modal eliminar */}
      <Modal
        visible={eliminando != null}
        titulo="¿Eliminar trabajador?"
        subtitulo={eliminando?.nombre}
        onClose={() => setEliminando(null)}
      >
        <Text style={tipografia.small}>
          El trabajador y todo su historial de pagos se eliminarán permanentemente. Esta acción no
          se puede deshacer.
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

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

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
  filtroContainer: {
    paddingHorizontal: espaciado['2xl'],
    paddingBottom: espaciado.md,
  },
  lista: {
    paddingHorizontal: espaciado['2xl'],
    gap: espaciado.md,
  },
  card: {
    gap: espaciado.sm,
  },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flex: 1,
    gap: espaciado.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: espaciado.xs,
    flexWrap: 'wrap',
  },
  derechaCard: {
    alignItems: 'flex-end',
    gap: espaciado.xs,
    marginLeft: espaciado.sm,
  },
  filaAcciones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: espaciado.md,
    paddingTop: espaciado.xs,
  },
  botonAccion: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerFormulario: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginTop: espaciado.xl,
  },
  botonMitad: {
    flex: 1,
  },
  footerModal: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginTop: espaciado.xl,
  },
  // Detalle
  detalleContainer: {
    flex: 1,
  },
  detalleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado['4xl'],
    paddingBottom: espaciado.md,
    gap: espaciado.md,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: radio.md,
    backgroundColor: colores.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.sm,
  },
  detalleInfo: {
    flex: 1,
    gap: espaciado.xs,
  },
  cardTotales: {
    marginHorizontal: espaciado['2xl'],
    marginBottom: espaciado.md,
    gap: espaciado.sm,
  },
  filaTotales: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  celdaTotal: {
    flex: 1,
    gap: espaciado.xs,
    alignItems: 'center',
  },
  divisorTotal: {
    width: 1,
    height: 36,
    backgroundColor: colores.borde.default,
  },
  valorTotal: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 16,
    lineHeight: 20,
  },
  listaPagos: {
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado.md,
    gap: espaciado.sm,
  },
  filaPago: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
    backgroundColor: colores.bg.surface,
    borderRadius: radio.md,
    ...sombra.sm,
  },
  filaPagoIzq: {
    flex: 1,
    gap: espaciado.xs,
  },
  filaPagoDer: {
    alignItems: 'flex-end',
    gap: espaciado.xs,
    marginLeft: espaciado.sm,
  },
  filaPagoAcciones: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  botonPagoAccion: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelSeccion: {
    marginBottom: espaciado.sm,
  },
  // Selector de tipo de pago
  tipoPagoRow: {
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  tipoPagoChip: {
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.xs,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde.default,
  },
  tipoPagoTexto: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 13,
    color: colores.texto.muted,
  },
  // Bloques separados de monto
  montoSeparadoContainer: {
    gap: espaciado.md,
  },
  montoBloque: {
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde.default,
    backgroundColor: colores.bg.surface,
    overflow: 'hidden',
  },
  montoBloqueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    paddingHorizontal: espaciado.sm,
    paddingVertical: espaciado.xs,
  },
  montoBloqueTitulo: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 13,
    color: colores.texto.onBrand,
  },
  // Botón de fecha
  botonFecha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde.default,
    backgroundColor: colores.bg.surface,
    marginBottom: espaciado.sm,
  },
  textoFecha: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 15,
    color: colores.texto.primary,
  },
});
