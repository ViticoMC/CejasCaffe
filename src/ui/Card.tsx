import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colores, espaciado, radio, sombra } from '../theme/tokens';

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, style }: Props) {
  return <View style={[estilos.base, style]}>{children}</View>;
}

const estilos = StyleSheet.create({
  base: {
    backgroundColor: colores.bg.surface,
    borderRadius: radio.lg,
    padding: espaciado.lg,
    ...sombra.md,
  },
});
