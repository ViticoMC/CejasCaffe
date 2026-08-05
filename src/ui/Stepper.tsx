import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radio } from '../theme/tokens';
import { fuentes } from '../theme/typography';

interface Props {
  valor: number;
  onChange: (valor: number) => void;
  paso?: number;
  minimo?: number;
  maximo?: number;
}

export function Stepper({ valor, onChange, paso = 1, minimo = 0, maximo = 9999 }: Props) {
  const redondear = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
  const restar = () => onChange(Math.max(minimo, redondear(valor - paso)));
  const sumar = () => onChange(Math.min(maximo, redondear(valor + paso)));

  return (
    <View style={estilos.base}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reducir cantidad"
        onPress={restar}
        disabled={valor <= minimo}
        style={({ pressed }) => [
          estilos.boton,
          (pressed || valor <= minimo) && estilos.botonApagado,
        ]}
      >
        <Feather name="minus" size={18} color={colores.brand.primary} />
      </Pressable>
      <Text style={estilos.valor}>{valor}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aumentar cantidad"
        onPress={sumar}
        disabled={valor >= maximo}
        style={({ pressed }) => [
          estilos.boton,
          (pressed || valor >= maximo) && estilos.botonApagado,
        ]}
      >
        <Feather name="plus" size={18} color={colores.brand.primary} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.sm,
  },
  boton: {
    width: 40,
    height: 40,
    borderRadius: radio.pill,
    backgroundColor: colores.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonApagado: {
    opacity: 0.4,
  },
  valor: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 16,
    color: colores.texto.primary,
    minWidth: 44,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
