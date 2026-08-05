import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado } from '../theme/tokens';
import { tipografia } from '../theme/typography';
import { Button } from './Button';
import { ArcoCeja, TroncoBambu } from './Decoracion';

interface Props {
  titulo: string;
  texto: string;
  accion?: { label: string; onPress: () => void };
}

export function EmptyState({ titulo, texto, accion }: Props) {
  return (
    <View style={estilos.base}>
      <View style={estilos.decoracion} pointerEvents="none">
        <TroncoBambu altura={64} ancho={10} color={colores.brand.leaf} opacidad={0.5} />
        <TroncoBambu altura={96} ancho={14} color={colores.brand.accent} opacidad={0.85} />
        <TroncoBambu altura={48} ancho={9} color={colores.brand.amber} opacidad={0.6} />
      </View>
      <ArcoCeja ancho={64} altura={8} color={colores.brand.secondary} opacidad={0.6} />
      <Text style={[tipografia.headline, estilos.titulo]}>{titulo}</Text>
      <Text style={[tipografia.small, estilos.texto]}>{texto}</Text>
      {accion != null && (
        <Button label={accion.label} icon="plus" onPress={accion.onPress} style={estilos.boton} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignItems: 'center',
    paddingHorizontal: espaciado['2xl'],
    paddingVertical: espaciado['4xl'],
    gap: espaciado.md,
  },
  decoracion: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espaciado.xs,
    marginBottom: espaciado.sm,
  },
  titulo: {
    textAlign: 'center',
  },
  texto: {
    textAlign: 'center',
  },
  boton: {
    marginTop: espaciado.md,
  },
});
