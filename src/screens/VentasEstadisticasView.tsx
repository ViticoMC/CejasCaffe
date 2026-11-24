import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {
  EstadisticaProducto,
  GranularidadTendencia,
  PuntoTendencia,
  ResumenEstadisticas,
} from '../domain/tipos';
import {
  etiquetaMejorPeriodo,
  etiquetaTendenciaLarga,
} from '../domain/fechas';
import { colores, espaciado } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { ChartCard } from '../ui/Stats/ChartCard';
import { InsightCard, type InsightItem } from '../ui/Stats/InsightCard';
import { KpiCard } from '../ui/Stats/KpiCard';
import { GananciaDonutChart } from '../ui/Charts/GananciaDonutChart';
import { TendenciaChart } from '../ui/Charts/TendenciaChart';
import { TopProductosChart } from '../ui/Charts/TopProductosChart';
import { VentasPorProductoChart } from '../ui/Charts/VentasPorProductoChart';

interface Props {
  resumen: ResumenEstadisticas | null;
  resumenAnterior: ResumenEstadisticas | null;
  statsProducto: EstadisticaProducto[];
  statsTendencia: PuntoTendencia[];
  granularidad: GranularidadTendencia;
  cargando: boolean;
  error: string | null;
  onReintentar: () => void;
  onRegistrarVenta: () => void;
  paddingBottom: number;
}

function variacion(
  actual: number,
  anterior: number | null | undefined
): number | null {
  if (anterior == null || anterior <= 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

function variacionPuntos(
  actual: number,
  anterior: number | null | undefined
): number | null {
  if (anterior == null) return null;
  return actual - anterior;
}

function formatearUnidades(valor: number): string {
  return valor.toLocaleString('es-MX', { maximumFractionDigits: 0 });
}

function subtituloTendencia(granularidad: GranularidadTendencia): string {
  switch (granularidad) {
    case 'hora':
      return 'Ingresos y ganancia por hora';
    case 'semana':
      return 'Ingresos y ganancia por semana';
    case 'mes':
      return 'Ingresos y ganancia por mes';
    case 'dia':
    default:
      return 'Ingresos y ganancia por día';
  }
}

export function VentasEstadisticasView({
  resumen,
  resumenAnterior,
  statsProducto,
  statsTendencia,
  granularidad,
  cargando,
  error,
  onReintentar,
  onRegistrarVenta,
  paddingBottom,
}: Props) {
  const mejorPunto = useMemo(() => {
    if (statsTendencia.length === 0) return null;
    return statsTendencia.reduce(
      (mejor, punto) => (punto.ventas > mejor.ventas ? punto : mejor),
      statsTendencia[0]
    );
  }, [statsTendencia]);

  const productoEstrella = statsProducto[0] ?? null;
  const productoPorIngresos = useMemo(() => {
    if (statsProducto.length === 0) return null;
    return statsProducto.reduce(
      (mejor, producto) =>
        producto.ingresos > mejor.ingresos ? producto : mejor,
      statsProducto[0]
    );
  }, [statsProducto]);
  const margenNetoAnterior =
    resumenAnterior != null && resumenAnterior.numeroVentas > 0
      ? resumenAnterior.margenNeto
      : null;

  const insights = useMemo(() => {
    const items: InsightItem[] = [];
    if (mejorPunto != null && mejorPunto.ventas > 0) {
      items.push({
        icono: 'trending-up',
        etiqueta: etiquetaMejorPeriodo(granularidad),
        valor: etiquetaTendenciaLarga(mejorPunto.fecha, granularidad),
        detalle: `${formatearDinero(mejorPunto.ventas)} en ventas`,
      });
    }
    if (productoEstrella != null) {
      items.push({
        icono: 'award',
        etiqueta: 'Producto estrella',
        valor: productoEstrella.nombre,
        detalle: `${productoEstrella.cantidadVendida} uds · ${formatearDinero(
          productoEstrella.ingresos
        )}`,
        color: colores.brand.secondary,
      });
    }
    return items;
  }, [mejorPunto, productoEstrella, granularidad]);

  if (error != null && resumen == null) {
    return (
      <View style={[estilos.contenido, { paddingBottom }]}>
        <Card style={estilos.errorCard}>
          <Text style={[tipografia.small, estilos.errorTexto]}>{error}</Text>
          <Button label="Reintentar" icon="refresh-cw" onPress={onReintentar} />
        </Card>
      </View>
    );
  }

  if (resumen == null) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={colores.brand.secondary} size="large" />
      </View>
    );
  }

  if (resumen.numeroVentas === 0) {
    return (
      <ScrollView
        contentContainerStyle={[estilos.contenido, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <EmptyState
          titulo="Sin ventas en este periodo"
          texto="Registra tu primera venta para empezar a ver ingresos, ganancia y tendencias."
          accion={{ label: 'Registrar venta', onPress: onRegistrarVenta }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[estilos.contenido, { paddingBottom }]}
      showsVerticalScrollIndicator={false}
    >
      {cargando && (
        <View style={estilos.actualizando}>
          <ActivityIndicator size="small" color={colores.brand.secondary} />
          <Text style={tipografia.micro}>Actualizando estadísticas…</Text>
        </View>
      )}

      {error != null && (
        <Card style={estilos.bannerError}>
          <Text style={[tipografia.micro, estilos.errorTexto]}>{error}</Text>
          <Button
            label="Reintentar"
            variant="secondary"
            onPress={onReintentar}
            style={estilos.botonReintentar}
          />
        </Card>
      )}

      <View style={estilos.grid}>
        <KpiCard
          etiqueta="Ingresos"
          valor={formatearDinero(resumen.ingresos)}
          icono="dollar-sign"
          color={colores.brand.primary}
          delta={variacion(resumen.ingresos, resumenAnterior?.ingresos)}
          style={estilos.kpi}
        />
        <KpiCard
          etiqueta="Ganancia neta"
          valor={formatearDinero(resumen.gananciaNeta)}
          icono="trending-up"
          color={
            resumen.gananciaNeta >= 0
              ? colores.funcional.success
              : colores.funcional.error
          }
          delta={variacion(resumen.gananciaNeta, resumenAnterior?.gananciaNeta)}
          style={estilos.kpi}
        />
        <KpiCard
          etiqueta="Margen neto"
          valor={`${resumen.margenNeto.toFixed(1)}%`}
          icono="percent"
          color={
            resumen.margenNeto >= 0
              ? colores.brand.secondary
              : colores.funcional.error
          }
          delta={variacionPuntos(resumen.margenNeto, margenNetoAnterior)}
          sufijoDelta=" pts"
          style={estilos.kpi}
        />
        <KpiCard
          etiqueta="Ticket promedio"
          valor={formatearDinero(resumen.ticketPromedio)}
          icono="shopping-bag"
          delta={variacion(
            resumen.ticketPromedio,
            resumenAnterior?.ticketPromedio
          )}
          style={estilos.kpi}
        />
        <KpiCard
          etiqueta="Unidades"
          valor={formatearUnidades(resumen.unidades)}
          icono="package"
          delta={variacion(resumen.unidades, resumenAnterior?.unidades)}
          style={estilos.kpi}
        />
        <KpiCard
          etiqueta="Días con ventas"
          valor={formatearUnidades(resumen.diasConVentas)}
          icono="calendar"
          delta={variacion(
            resumen.diasConVentas,
            resumenAnterior?.diasConVentas
          )}
          style={estilos.kpi}
        />
        <KpiCard
          etiqueta="Salarios (producción)"
          valor={formatearDinero(resumen.salariosProduccion)}
          icono="users"
          color={colores.funcional.error}
          delta={variacion(
            resumen.salariosProduccion,
            resumenAnterior?.salariosProduccion
          )}
          style={estilos.kpi}
        />
        <KpiCard
          etiqueta="Salarios (propina)"
          valor={formatearDinero(resumen.salariosPropina)}
          icono="gift"
          color={colores.funcional.warning}
          delta={variacion(
            resumen.salariosPropina,
            resumenAnterior?.salariosPropina
          )}
          style={estilos.kpi}
        />
      </View>

      {insights.length > 0 && <InsightCard items={insights} />}

      <ChartCard
        icono="bar-chart-2"
        titulo="Ingresos por producto"
        subtitulo="Top 7 del periodo"
        accessibilityLabel={`Productos con más ingresos: ${
          productoPorIngresos?.nombre ?? 'sin datos'
        }.`}
      >
        <VentasPorProductoChart data={statsProducto} metrica="ingresos" />
      </ChartCard>

      <ChartCard
        icono="activity"
        titulo="Tendencia"
        subtitulo={subtituloTendencia(granularidad)}
        accessibilityLabel={`Tendencia de ingresos y ganancia. Total de ingresos ${formatearDinero(
          resumen.ingresos
        )}.`}
      >
        <TendenciaChart data={statsTendencia} granularidad={granularidad} />
      </ChartCard>

      <ChartCard
        icono="pie-chart"
        titulo="Ganancia neta vs costo"
        subtitulo="Después de salarios de producción"
        accessibilityLabel={`Margen neto ${resumen.margenNeto.toFixed(
          1
        )} por ciento.`}
      >
        <GananciaDonutChart
          data={{
            costoTotal: resumen.costo + resumen.salariosProduccion,
            gananciaTotal: resumen.gananciaNeta,
          }}
        />
      </ChartCard>

      <ChartCard
        icono="award"
        titulo="Top productos"
        subtitulo="Ranking por unidades vendidas"
        accessibilityLabel={`Producto más vendido: ${
          productoEstrella?.nombre ?? 'sin datos'
        }.`}
      >
        <TopProductosChart data={statsProducto} />
      </ChartCard>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    paddingHorizontal: espaciado['2xl'],
    gap: espaciado.lg,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaciado.md,
  },
  kpi: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  errorCard: {
    gap: espaciado.md,
    alignItems: 'stretch',
  },
  bannerError: {
    gap: espaciado.sm,
    borderWidth: 1,
    borderColor: 'rgba(176, 86, 63, 0.35)',
    backgroundColor: 'rgba(176, 86, 63, 0.06)',
  },
  errorTexto: {
    color: colores.funcional.error,
  },
  botonReintentar: {
    alignSelf: 'flex-start',
  },
  actualizando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
});
