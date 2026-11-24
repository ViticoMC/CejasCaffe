import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radio } from '../../theme/tokens';
import { fuentes, tipografia, formatearDinero } from '../../theme/typography';
import type { EstadisticaProducto } from '../../domain/tipos';

interface Props {
  data: EstadisticaProducto[];
}

const coloresRanking = [
  colores.brand.amber,
  colores.brand.latte,
  colores.brand.leaf,
  colores.brand.accent,
  colores.brand.secondary,
];

export function TopProductosChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Text style={estilos.sinDatos}>No hay datos de ventas en este período.</Text>
    );
  }

  const top5 = data.slice(0, 5);
  const maxCantidad = Math.max(
    ...top5.map((item) => item.cantidadVendida),
    1
  );

  return (
    <View
      style={estilos.lista}
      accessible
      accessibilityLabel={`Ranking de productos por unidades vendidas. ${top5
        .map(
          (item, index) =>
            `${index + 1}. ${item.nombre}, ${item.cantidadVendida} unidades, ${formatearDinero(
              item.ingresos
            )} de ingresos`
        )
        .join('. ')}.`}
    >
      {top5.map((item, index) => {
        const porcentaje = maxCantidad > 0 ? (item.cantidadVendida / maxCantidad) * 100 : 0;
        const colorBarra = coloresRanking[index % coloresRanking.length];
        return (
          <View key={item.clave} style={estilos.item}>
            <View style={estilos.info}>
              <Text style={[estilos.ranking, { color: colorBarra }]}>#{index + 1}</Text>
              <View style={estilos.textoInfo}>
                <Text style={estilos.nombre} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text style={estilos.detalle}>
                  {item.cantidadVendida} uds · {formatearDinero(item.ingresos)}
                </Text>
              </View>
              <Text
                style={[
                  estilos.ganancia,
                  {
                    color:
                      item.ganancia >= 0
                        ? colores.funcional.success
                        : colores.funcional.error,
                  },
                ]}
              >
                {item.ganancia > 0 ? '+' : ''}
                {formatearDinero(item.ganancia)}
              </Text>
            </View>
            <View style={estilos.barraFondo}>
              <View
                style={[
                  estilos.barraRelleno,
                  { width: `${Math.max(porcentaje, 2)}%`, backgroundColor: colorBarra },
                ]}
              />
            </View>
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
  item: {
    gap: espaciado.sm,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  ranking: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 14,
    minWidth: 26,
  },
  textoInfo: {
    flex: 1,
    gap: 1,
  },
  nombre: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 14,
    color: colores.texto.primary,
  },
  detalle: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 11,
    color: colores.texto.muted,
    fontVariant: ['tabular-nums'],
  },
  ganancia: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 12,
    color: colores.funcional.success,
    fontVariant: ['tabular-nums'],
  },
  barraFondo: {
    height: 8,
    backgroundColor: colores.bg.subtle,
    borderRadius: radio.pill,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: '100%',
    borderRadius: radio.pill,
  },
});
