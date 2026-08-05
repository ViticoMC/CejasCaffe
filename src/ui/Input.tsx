import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colores, espaciado, radio } from '../theme/tokens';
import { tipografia } from '../theme/typography';

interface Props {
  label: string;
  value: string;
  onChangeText: (texto: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  error,
  autoFocus = false,
  style,
}: Props) {
  const [enfocado, setEnfocado] = useState(false);
  const borde = error != null ? colores.funcional.error : enfocado ? colores.brand.accent : colores.borde.default;

  return (
    <View style={[estilos.base, style]}>
      <Text style={[tipografia.small, estilos.etiqueta]}>{label}</Text>
      <Pressable>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colores.texto.muted}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          accessibilityLabel={label}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          style={[estilos.input, { borderColor: borde }]}
        />
      </Pressable>
      {error != null && <Text style={[tipografia.micro, estilos.error]}>{error}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    gap: espaciado.sm,
  },
  etiqueta: {
    color: colores.texto.secondary,
  },
  input: {
    backgroundColor: colores.bg.surface,
    borderWidth: 1,
    borderRadius: radio.sm,
    paddingHorizontal: espaciado.lg,
    paddingVertical: espaciado.md,
    fontSize: 16,
    fontFamily: 'Outfit_400Regular',
    color: colores.texto.primary,
    minHeight: 48,
  },
  error: {
    color: colores.funcional.error,
  },
});
