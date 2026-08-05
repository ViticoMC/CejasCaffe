import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espaciado } from '../theme/tokens';
import { tipografia } from '../theme/typography';

interface Props {
  titulo: string;
  descripcion?: string;
  children?: ReactNode;
}

export function BasePagina({ titulo, descripcion, children }: Props) {
  return (
    <SafeAreaView style={estilos.safe}>
      <View style={estilos.encabezado}>
        <Text style={tipografia.title}>{titulo}</Text>
        {descripcion != null && <Text style={tipografia.small}>{descripcion}</Text>}
      </View>
      <View style={estilos.centro}>{children}</View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
  encabezado: {
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado['4xl'],
    gap: espaciado.xs,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espaciado['3xl'],
    gap: espaciado.md,
  },
});
