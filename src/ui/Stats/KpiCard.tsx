import { Feather } from '@expo/vector-icons';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colores, espaciado, radio } from '../../theme/tokens';
import { fuentes, tipografia } from '../../theme/typography';
import { Card } from '../Card';
import type { NombreIcono } from './tipos';

interface Props {
  etiqueta: string;
  valor: string;
  icono: NombreIcono;
  color?: string;
  delta?: number | null;
  sufijoDelta?: string;
  detalle?: string;
  style?: StyleProp<ViewStyle>;
}

function esPositivo(delta: number): boolean {
  return delta > 0.05;
}

function esNegativo(delta: number): boolean {
  return delta < -0.05;
}

function colorDelta(delta: number): string {
  if (esPositivo(delta)) return colores.funcional.success;
  if (esNegativo(delta)) return colores.funcional.error;
  return colores.texto.muted;
}

function fondoDelta(delta: number): string {
  if (esPositivo(delta)) return 'rgba(76, 122, 76, 0.12)';
  if (esNegativo(delta)) return 'rgba(176, 86, 63, 0.12)';
  return colores.bg.subtle;
}

function iconoDelta(delta: number): NombreIcono {
  if (esPositivo(delta)) return 'arrow-up-right';
  if (esNegativo(delta)) return 'arrow-down-right';
  return 'minus';
}

export function KpiCard({
  etiqueta,
  valor,
  icono,
  color,
  delta,
  sufijoDelta = '%',
  detalle,
  style,
}: Props) {
  return (
    <Card style={[estilos.card, style]}>
      <View style={estilos.filaSuperior}>
        <Text style={[tipografia.micro, estilos.etiqueta]} numberOfLines={1}>
          {etiqueta}
        </Text>
        <Feather name={icono} size={15} color={colores.texto.muted} />
      </View>

      <Text
        style={[estilos.valor, { color: color ?? colores.texto.primary }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {valor}
      </Text>

      {delta != null ? (
        <View style={estilos.filaDelta}>
          <View style={[estilos.chipDelta, { backgroundColor: fondoDelta(delta) }]}>
            <Feather name={iconoDelta(delta)} size={11} color={colorDelta(delta)} />
            <Text
              style={[estilos.textoDelta, { color: colorDelta(delta) }]}
              numberOfLines={1}
            >
              {Math.abs(delta).toFixed(1)}
              {sufijoDelta}
            </Text>
          </View>
          <Text style={estilos.contextoDelta} numberOfLines={1}>
            vs anterior
          </Text>
        </View>
      ) : detalle != null ? (
        <Text style={estilos.detalle} numberOfLines={1}>
          {detalle}
        </Text>
      ) : (
        <View style={estilos.filaDelta}>
          <Text style={estilos.contextoDelta}>Sin periodo previo</Text>
        </View>
      )}
    </Card>
  );
}

const estilos = StyleSheet.create({
  card: {
    padding: espaciado.md,
    gap: espaciado.xs,
  },
  filaSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
  },
  etiqueta: {
    flex: 1,
    letterSpacing: 0.3,
  },
  valor: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 20,
    lineHeight: 24,
    fontVariant: ['tabular-nums'],
  },
  filaDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    minHeight: 18,
  },
  chipDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: radio.pill,
    paddingHorizontal: espaciado.sm,
    paddingVertical: 1,
  },
  textoDelta: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 11,
    lineHeight: 15,
    fontVariant: ['tabular-nums'],
  },
  contextoDelta: {
    flexShrink: 1,
    fontFamily: fuentes.outfitRegular,
    fontSize: 10,
    lineHeight: 14,
    color: colores.texto.muted,
  },
  detalle: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 11,
    lineHeight: 15,
    color: colores.texto.muted,
  },
});
