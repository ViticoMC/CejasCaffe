import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radio } from '../../theme/tokens';
import { fuentes, tipografia, formatearDinero } from '../../theme/typography';
import type { EstadisticaProducto } from '../../domain/tipos';

export type MetricaProducto = 'ingresos' | 'cantidad';

interface Props {
  data: EstadisticaProducto[];
  metrica?: MetricaProducto;
}

const coloresBarras = [
  colores.brand.primary,
  colores.brand.secondary,
  colores.brand.latte,
  colores.brand.accent,
  colores.brand.leaf,
  colores.brand.amber,
  colores.funcional.warning,
];

function valorDe(item: EstadisticaProducto, metrica: MetricaProducto): number {
  return metrica === 'ingresos' ? item.ingresos : item.cantidadVendida;
}

function formatearValor(item: EstadisticaProducto, metrica: MetricaProducto): string {
  return metrica === 'ingresos'
    ? formatearDinero(item.ingresos)
    : `${item.cantidadVendida} uds`;
}

export function VentasPorProductoChart({ data, metrica = 'ingresos' }: Props) {
  if (data.length === 0) {
    return (
      <Text style={estilos.sinDatos}>No hay datos de ventas en este período.</Text>
    );
  }

  const ordenados = [...data].sort(
    (a, b) => valorDe(b, metrica) - valorDe(a, metrica)
  );
  const top = ordenados.slice(0, 7);
  const total = ordenados.reduce((suma, item) => suma + valorDe(item, metrica), 0);
  const maximo = Math.max(...top.map((item) => valorDe(item, metrica)), 1);
  const unidad = metrica === 'ingresos' ? 'de ingresos' : 'de unidades';

  return (
    <View
      style={estilos.lista}
      accessible
      accessibilityLabel={`Productos por ${
        metrica === 'ingresos' ? 'ingresos' : 'unidades vendidas'
      }. ${top
        .map((item) => `${item.nombre}, ${formatearValor(item, metrica)}`)
        .join('. ')}.`}
    >
      {top.map((item, index) => {
        const valor = valorDe(item, metrica);
        const porcentaje = maximo > 0 ? (valor / maximo) * 100 : 0;
        const participacion = total > 0 ? (valor / total) * 100 : 0;
        const colorBarra = coloresBarras[index % coloresBarras.length];

        return (
          <View key={item.clave} style={estilos.fila}>
            <View style={estilos.filaTexto}>
              <Text style={estilos.nombre} numberOfLines={1}>
                {item.nombre}
              </Text>
              <Text style={estilos.valor}>{formatearValor(item, metrica)}</Text>
            </View>
            <View style={estilos.track}>
              <View
                style={[
                  estilos.fill,
                  {
                    width: `${Math.max(porcentaje, 3)}%`,
                    backgroundColor: colorBarra,
                  },
                ]}
              />
            </View>
            <Text style={estilos.detalle}>
              {participacion.toFixed(0)}% {unidad}
              {metrica === 'ingresos' ? ` · ${item.cantidadVendida} uds` : ''}
            </Text>
          </View>
        );
      })}
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
  lista: {
    gap: espaciado.md,
  },
  fila: {
    gap: espaciado.xs,
  },
  filaTexto: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: espaciado.sm,
  },
  nombre: {
    flex: 1,
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colores.texto.primary,
  },
  valor: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colores.texto.secondary,
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 8,
    borderRadius: radio.pill,
    backgroundColor: colores.bg.subtle,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radio.pill,
  },
  detalle: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 10,
    lineHeight: 14,
    color: colores.texto.muted,
    fontVariant: ['tabular-nums'],
  },
});
