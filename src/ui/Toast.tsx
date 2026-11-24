import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colores } from '../theme/tokens';
import { fuentes } from '../theme/typography';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
}

const toastColors = {
  success: colores.funcional.success,
  error: colores.funcional.error,
  info: colores.brand.primary,
};

const toastIcons: Record<string, any> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'information',
};

export function Toast({ message, type }: ToastProps) {
  return (
    <View style={estilos.container}>
      <View style={[estilos.badge, { backgroundColor: toastColors[type] }]}>
        <MaterialCommunityIcons
          name={toastIcons[type]}
          size={16}
          color={colores.texto.onBrand}
        />
      </View>
      <Text style={estilos.text}>{message}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colores.bg.surface,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    fontFamily: fuentes.outfitMedium,
    fontSize: 14,
    color: colores.texto.primary,
  },
});
