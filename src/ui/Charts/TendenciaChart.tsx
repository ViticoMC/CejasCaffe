import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { colores, espaciado, radio } from '../../theme/tokens';
import { fuentes, tipografia, formatearDinero } from '../../theme/typography';
import {
  etiquetaTendencia,
  etiquetaTendenciaLarga,
} from '../../domain/fechas';
import type {
  GranularidadTendencia,
  PuntoTendencia,
} from '../../domain/tipos';

interface Props {
  data: PuntoTendencia[];
  granularidad: GranularidadTendencia;
}

function formatearEjeMoneda(valor: string): string {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return valor;
  const signo = numero < 0 ? '-' : '';
  const absoluto = Math.abs(numero);
  if (absoluto >= 1000) {
    const miles = absoluto / 1000;
    return `${signo}$${miles.toFixed(miles >= 10 ? 0 : 1)}k`;
  }
  return `${signo}$${Math.round(absoluto)}`;
}

export function TendenciaChart({ data, granularidad }: Props) {
  const { width } = useWindowDimensions();

  if (data.length === 0) {
    return (
      <Text style={estilos.sinDatos}>No hay datos de ventas en este período.</Text>
    );
  }

  const anchoPlot = Math.max(width - 128, 140);
  const spacing = Math.max(
    24,
    Math.min(64, (anchoPlot - 24) / Math.max(data.length - 1, 1))
  );
  const anchoContenido = 8 + (data.length - 1) * spacing + 16;
  const sinScroll = anchoContenido <= anchoPlot;

  const totalIngresos = data.reduce((suma, punto) => suma + punto.ventas, 0);
  const totalGanancia = data.reduce((suma, punto) => suma + punto.ganancia, 0);
  const maximo = Math.max(
    ...data.map((punto) => Math.max(punto.ventas, punto.ganancia)),
    1
  );
  const pasoEtiquetas = Math.max(1, Math.ceil(data.length / 6));
  const etiquetas = data.map((punto, index) =>
    index % pasoEtiquetas === 0 || index === data.length - 1
      ? etiquetaTendencia(punto.fecha, granularidad)
      : ''
  );

  const chartData = data.map((punto) => ({ value: punto.ventas }));
  const chartData2 = data.map((punto) => ({ value: punto.ganancia }));

  return (
    <View
      style={estilos.contenedor}
      accessible
      accessibilityLabel={`Tendencia de ingresos y ganancia. Ingresos ${formatearDinero(
        totalIngresos
      )}, ganancia ${formatearDinero(totalGanancia)}.`}
    >
      <View style={estilos.leyenda}>
        <View style={estilos.leyendaItem}>
          <View style={[estilos.leyendaPunto, { backgroundColor: colores.brand.secondary }]} />
          <Text style={tipografia.micro}>Ingresos</Text>
        </View>
        <View style={estilos.leyendaItem}>
          <View style={[estilos.leyendaPunto, { backgroundColor: colores.funcional.success }]} />
          <Text style={tipografia.micro}>Ganancia</Text>
        </View>
      </View>

      <LineChart
        data={chartData}
        data2={chartData2}
        color1={colores.brand.secondary}
        color2={colores.funcional.success}
        thickness1={3}
        thickness2={2}
        areaChart1
        startFillColor1={colores.brand.secondary}
        endFillColor1={colores.brand.secondary}
        startOpacity1={0.18}
        endOpacity1={0.02}
        curved
        hideDataPoints1={data.length > 12}
        hideDataPoints2={data.length > 12}
        dataPointsColor1={colores.brand.secondary}
        dataPointsColor2={colores.funcional.success}
        dataPointsRadius1={3}
        dataPointsRadius2={3}
        rulesColor="rgba(232, 220, 203, 0.7)"
        rulesThickness={1}
        yAxisThickness={0}
        xAxisThickness={0}
        yAxisLabelWidth={48}
        formatYLabel={formatearEjeMoneda}
        noOfSections={4}
        maxValue={maximo * 1.15}
        showXAxisIndices
        xAxisIndicesHeight={6}
        xAxisIndicesColor={colores.borde.default}
        xAxisLabelTexts={etiquetas}
        xAxisLabelTextStyle={estilos.etiquetaEje}
        initialSpacing={8}
        endSpacing={16}
        spacing={spacing}
        nestedScrollEnabled
        disableScroll={sinScroll}
        showScrollIndicator={false}
        pointerConfig={{
          pointerColor: colores.brand.primary,
          width: 2,
          pointerLabelWidth: 168,
          autoAdjustPointerLabelPosition: true,
          pointerLabelComponent: (_items: unknown, _secondary: unknown, index: number) => {
            const punto = data[index];
            if (punto == null) return null;
            return (
              <View style={estilos.tooltip}>
                <Text style={estilos.tooltipTitulo}>
                  {etiquetaTendenciaLarga(punto.fecha, granularidad)}
                </Text>
                <View style={estilos.tooltipFila}>
                  <View style={[estilos.tooltipPunto, { backgroundColor: colores.brand.secondary }]} />
                  <Text style={estilos.tooltipTexto}>
                    Ingresos {formatearDinero(punto.ventas)}
                  </Text>
                </View>
                <View style={estilos.tooltipFila}>
                  <View style={[estilos.tooltipPunto, { backgroundColor: colores.funcional.success }]} />
                  <Text style={estilos.tooltipTexto}>
                    Ganancia {formatearDinero(punto.ganancia)}
                  </Text>
                </View>
              </View>
            );
          },
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.sm,
  },
  leyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.lg,
    paddingLeft: espaciado.xs,
  },
  leyendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
  },
  leyendaPunto: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sinDatos: {
    ...tipografia.small,
    textAlign: 'center',
    paddingVertical: espaciado['3xl'],
    color: colores.texto.muted,
  },
  etiquetaEje: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 10,
    color: colores.texto.muted,
  },
  tooltip: {
    backgroundColor: colores.bg.surfaceElevated,
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde.default,
    paddingVertical: espaciado.sm,
    paddingHorizontal: espaciado.md,
    gap: 3,
    shadowColor: colores.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  tooltipTitulo: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 11,
    lineHeight: 15,
    color: colores.texto.primary,
  },
  tooltipFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
  },
  tooltipPunto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tooltipTexto: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 11,
    lineHeight: 15,
    color: colores.texto.secondary,
    fontVariant: ['tabular-nums'],
  },
});
