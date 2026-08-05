import { StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radio } from '../theme/tokens';
import { fuentes } from '../theme/typography';

export type TonoBadge = 'success' | 'muted' | 'info' | 'warning';

interface Props {
  label: string;
  tone?: TonoBadge;
}

const paletaTono: Record<TonoBadge, { fondo: string; texto: string }> = {
  success: { fondo: 'rgba(76, 122, 76, 0.14)', texto: colores.funcional.success },
  muted: { fondo: colores.bg.subtle, texto: colores.texto.secondary },
  info: { fondo: 'rgba(164, 113, 72, 0.14)', texto: colores.brand.secondary },
  warning: { fondo: 'rgba(201, 138, 45, 0.16)', texto: colores.funcional.warning },
};

export function Badge({ label, tone = 'muted' }: Props) {
  const coloresTono = paletaTono[tone];
  return (
    <View style={[estilos.base, { backgroundColor: coloresTono.fondo }]}>
      <Text style={[estilos.texto, { color: coloresTono.texto }]}>{label}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: radio.pill,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.xs,
    alignSelf: 'flex-start',
  },
  texto: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
});
