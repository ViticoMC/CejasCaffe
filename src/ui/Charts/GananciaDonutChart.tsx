import { StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { colores, espaciado } from '../../theme/tokens';
import { fuentes, tipografia, formatearDinero } from '../../theme/typography';
import type { DistribucionGanancia } from '../../domain/tipos';

interface Props {
  data: DistribucionGanancia;
}

export function GananciaDonutChart({ data }: Props) {
  const total = data.costoTotal + data.gananciaTotal;

  if (data.gananciaTotal < 0) {
    return (
      <View style={estilos.perdida}>
        <Text style={estilos.perdidaTitulo}>Periodo con pérdida neta</Text>
        <Text style={estilos.perdidaTexto}>
          Entre costos y salarios de producción, los gastos ({formatearDinero(data.costoTotal)}) superaron la ganancia bruta.
          Pérdida neta de {formatearDinero(Math.abs(data.gananciaTotal))}.
        </Text>
      </View>
    );
  }

  if (total === 0) {
    return (
      <Text style={estilos.sinDatos}>No hay datos de ventas en este período.</Text>
    );
  }

  const porcentajeGanancia = Math.round((data.gananciaTotal / total) * 100);
  const porcentajeCosto = 100 - porcentajeGanancia;

  const pieData = [
    {
      value: data.gananciaTotal,
      color: colores.funcional.success,
    },
    {
      value: data.costoTotal,
      color: colores.brand.latte,
    },
  ];

  return (
    <View
      style={estilos.contenedor}
      accessible
      accessibilityLabel={`Distribución de rentabilidad. Ganancia ${formatearDinero(
        data.gananciaTotal
      )} (${porcentajeGanancia}%), costo ${formatearDinero(data.costoTotal)} (${porcentajeCosto}%).`}
    >
      <PieChart
        data={pieData}
        donut
        innerCircleColor={colores.bg.surface}
        radius={84}
        innerRadius={58}
        centerLabelComponent={() => (
          <View style={estilos.centro}>
            <Text style={estilos.porcentaje}>{porcentajeGanancia}%</Text>
            <Text style={estilos.centroEtiqueta}>margen</Text>
          </View>
        )}
      />

      <View style={estilos.legendas}>
        <View style={estilos.legendItem}>
          <View style={[estilos.legendDot, { backgroundColor: colores.funcional.success }]} />
          <Text style={estilos.legendText}>Ganancia</Text>
          <Text style={estilos.legendValor}>{formatearDinero(data.gananciaTotal)}</Text>
          <Text style={estilos.legendPct}>{porcentajeGanancia}%</Text>
        </View>
        <View style={estilos.legendItem}>
          <View style={[estilos.legendDot, { backgroundColor: colores.brand.latte }]} />
          <Text style={estilos.legendText}>Costo</Text>
          <Text style={estilos.legendValor}>{formatearDinero(data.costoTotal)}</Text>
          <Text style={estilos.legendPct}>{porcentajeCosto}%</Text>
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  sinDatos: {
    ...tipografia.small,
    textAlign: 'center',
    paddingVertical: espaciado['3xl'],
    color: colores.texto.muted,
  },
  contenedor: {
    alignItems: 'center',
    gap: espaciado.lg,
  },
  perdida: {
    gap: espaciado.xs,
    paddingVertical: espaciado.lg,
  },
  perdidaTitulo: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: colores.funcional.error,
  },
  perdidaTexto: {
    ...tipografia.small,
    color: colores.texto.secondary,
  },
  centro: {
    alignItems: 'center',
  },
  porcentaje: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 28,
    lineHeight: 32,
    color: colores.texto.primary,
    fontVariant: ['tabular-nums'],
  },
  centroEtiqueta: {
    fontFamily: fuentes.outfitMedium,
    fontSize: 10,
    lineHeight: 14,
    color: colores.texto.muted,
    letterSpacing: 0.3,
  },
  legendas: {
    width: '100%',
    gap: espaciado.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    flex: 1,
    fontFamily: fuentes.outfitMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colores.texto.secondary,
  },
  legendValor: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colores.texto.primary,
    fontVariant: ['tabular-nums'],
  },
  legendPct: {
    minWidth: 38,
    textAlign: 'right',
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colores.texto.muted,
    fontVariant: ['tabular-nums'],
  },
});
