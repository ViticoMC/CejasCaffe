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

export interface InsightItem {
  icono: NombreIcono;
  etiqueta: string;
  valor: string;
  detalle?: string;
  color?: string;
}

interface Props {
  items: InsightItem[];
  style?: StyleProp<ViewStyle>;
}

export function InsightCard({ items, style }: Props) {
  if (items.length === 0) {
    return null;
  }

  return (
    <Card style={[estilos.card, style]}>
      <Text style={[tipografia.caption, estilos.titulo]}>Lo más destacado</Text>
      {items.map((item, index) => (
        <View key={item.etiqueta}>
          {index > 0 && <View style={estilos.divisor} />}
          <View style={estilos.fila}>
            <View style={estilos.icono}>
              <Feather
                name={item.icono}
                size={15}
                color={item.color ?? colores.brand.amber}
              />
            </View>
            <View style={estilos.textos}>
              <Text style={tipografia.micro}>{item.etiqueta}</Text>
              <Text
                style={[estilos.valor, { color: item.color ?? colores.texto.primary }]}
                numberOfLines={1}
              >
                {item.valor}
              </Text>
              {item.detalle != null && (
                <Text style={tipografia.micro} numberOfLines={1}>
                  {item.detalle}
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}

const estilos = StyleSheet.create({
  card: {
    padding: espaciado.lg,
    gap: espaciado.md,
  },
  titulo: {
    letterSpacing: 0.3,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  icono: {
    width: 32,
    height: 32,
    borderRadius: radio.md,
    backgroundColor: 'rgba(217, 178, 110, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 1,
  },
  valor: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 15,
    lineHeight: 20,
  },
  divisor: {
    height: 1,
    backgroundColor: colores.borde.default,
    marginVertical: espaciado.md,
  },
});
