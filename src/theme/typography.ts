import { StyleSheet } from 'react-native';
import { colores } from './tokens';

export const fuentes = {
  frauncesMedium: 'Fraunces_500Medium',
  frauncesSemiBold: 'Fraunces_600SemiBold',
  outfitRegular: 'Outfit_400Regular',
  outfitMedium: 'Outfit_500Medium',
  outfitSemiBold: 'Outfit_600SemiBold',
} as const;

export const tipografia = StyleSheet.create({
  display: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 34,
    lineHeight: 38,
    color: colores.texto.primary,
  },
  title: {
    fontFamily: fuentes.frauncesMedium,
    fontSize: 24,
    lineHeight: 28,
    color: colores.texto.primary,
  },
  headline: {
    fontFamily: fuentes.frauncesMedium,
    fontSize: 20,
    lineHeight: 26,
    color: colores.texto.primary,
  },
  body: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 16,
    lineHeight: 24,
    color: colores.texto.secondary,
  },
  small: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 14,
    lineHeight: 20,
    color: colores.texto.secondary,
  },
  caption: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: colores.texto.secondary,
  },
  micro: {
    fontFamily: fuentes.outfitMedium,
    fontSize: 10,
    lineHeight: 14,
    color: colores.texto.muted,
  },
  precio: {
    fontFamily: fuentes.frauncesSemiBold,
    fontSize: 24,
    lineHeight: 28,
    color: colores.brand.secondary,
    fontVariant: ['tabular-nums'],
  },
});

export function formatearDinero(valor: number): string {
  const redondeado = Math.round((valor + Number.EPSILON) * 100) / 100;
  return `$${redondeado.toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;
}
