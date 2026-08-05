import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colores, espaciado, radio } from '../theme/tokens';
import { fuentes } from '../theme/typography';

export type VarianteBoton = 'primary' | 'secondary' | 'ghost' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: VarianteBoton;
  icon?: React.ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
}: Props) {
  const colorTexto = coloresTexto[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        estilos.base,
        estilosVariant[variant],
        pressed && !disabled && estilos.presionado,
        disabled && estilos.deshabilitado,
        style,
      ]}
    >
      <View style={estilos.contenido}>
        {icon != null && (
          <Feather name={icon} size={20} color={colorTexto} />
        )}
        <Text style={[estilos.texto, { color: colorTexto }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const coloresTexto: Record<VarianteBoton, string> = {
  primary: colores.texto.onBrand,
  secondary: colores.brand.primary,
  ghost: colores.brand.primary,
  danger: colores.texto.onBrand,
};

const estilos = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radio.md,
    paddingHorizontal: espaciado.xl,
    paddingVertical: espaciado.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espaciado.sm,
  },
  texto: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
  presionado: {
    opacity: 0.85,
  },
  deshabilitado: {
    opacity: 0.4,
  },
});

const estilosVariant = StyleSheet.create({
  primary: {
    backgroundColor: colores.brand.primary,
  },
  secondary: {
    backgroundColor: colores.bg.surface,
    borderWidth: 1,
    borderColor: colores.borde.default,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colores.funcional.error,
  },
});
