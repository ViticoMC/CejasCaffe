import { Feather } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colores, espaciado, radio } from '../../theme/tokens';
import { tipografia } from '../../theme/typography';
import { Card } from '../Card';
import type { NombreIcono } from './tipos';

interface Props {
  icono: NombreIcono;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ChartCard({
  icono,
  titulo,
  subtitulo,
  children,
  style,
  accessibilityLabel,
}: Props) {
  return (
    <Card style={[estilos.card, style]}>
      <View style={estilos.encabezado}>
        <View style={estilos.icono}>
          <Feather name={icono} size={16} color={colores.brand.accent} />
        </View>
        <View style={estilos.textos}>
          <Text style={tipografia.headline} numberOfLines={1}>
            {titulo}
          </Text>
          {subtitulo != null && (
            <Text style={[tipografia.micro, estilos.subtitulo]} numberOfLines={1}>
              {subtitulo}
            </Text>
          )}
        </View>
      </View>
      <View
        accessible={accessibilityLabel != null}
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </View>
    </Card>
  );
}

const estilos = StyleSheet.create({
  card: {
    padding: espaciado.lg,
    gap: espaciado.md,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
  },
  icono: {
    width: 34,
    height: 34,
    borderRadius: radio.md,
    backgroundColor: 'rgba(90, 122, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 1,
  },
  subtitulo: {
    marginTop: 1,
  },
});
