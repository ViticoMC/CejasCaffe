import { StyleSheet, View } from 'react-native';
import { colores } from '../theme/tokens';

interface TroncoProps {
  altura: number;
  ancho?: number;
  color?: string;
  nodos?: number;
  opacidad?: number;
}

export function TroncoBambu({
  altura,
  ancho = 16,
  color = colores.brand.accent,
  nodos = 3,
  opacidad = 1,
}: TroncoProps) {
  const separacion = altura / (nodos + 1);
  return (
    <View style={[estilos.tronco, { width: ancho, height: altura, opacity: opacidad }]}>
      <View
        style={{
          flex: 1,
          borderRadius: ancho / 2,
          backgroundColor: color,
          width: ancho,
        }}
      />
      {Array.from({ length: nodos }).map((_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: separacion * (i + 1) - 1.5,
            left: -3,
            right: -3,
            height: 3,
            borderRadius: 2,
            backgroundColor: 'rgba(43, 33, 28, 0.22)',
          }}
        />
      ))}
    </View>
  );
}

interface ArcoProps {
  ancho?: number;
  altura?: number;
  color?: string;
  opacidad?: number;
}

export function ArcoCeja({
  ancho = 120,
  altura = 14,
  color = colores.brand.secondary,
  opacidad = 1,
}: ArcoProps) {
  return (
    <View style={{ width: ancho, height: altura, opacity: opacidad }}>
      <View
        style={{
          flex: 1,
          borderTopLeftRadius: altura,
          borderTopRightRadius: altura,
          backgroundColor: color,
          transform: [{ rotate: '-2deg' }],
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  tronco: {
    overflow: 'hidden',
  },
});
