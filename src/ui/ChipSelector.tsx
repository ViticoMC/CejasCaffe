import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colores, espaciado, radio } from '../theme/tokens';
import { fuentes } from '../theme/typography';

export interface OpcionChip<T extends string | number> {
  valor: T;
  etiqueta: string;
}

interface Props<T extends string | number> {
  opciones: OpcionChip<T>[];
  seleccionado: T;
  onSeleccionar: (valor: T) => void;
}

export function ChipSelector<T extends string | number>({
  opciones,
  seleccionado,
  onSeleccionar,
}: Props<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={estilos.contenido}
    >
      {opciones.map((opcion) => {
        const activo = opcion.valor === seleccionado;
        return (
          <Pressable
            key={String(opcion.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            onPress={() => onSeleccionar(opcion.valor)}
            style={[estilos.chip, activo && estilos.chipActivo]}
          >
            <Text style={[estilos.texto, activo && estilos.textoActivo]}>
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    gap: espaciado.sm,
    paddingRight: espaciado.lg,
  },
  chip: {
    borderRadius: radio.pill,
    borderWidth: 1,
    borderColor: colores.borde.default,
    backgroundColor: colores.bg.surface,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  chipActivo: {
    backgroundColor: colores.brand.primary,
    borderColor: colores.brand.primary,
  },
  texto: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: colores.texto.secondary,
  },
  textoActivo: {
    color: colores.texto.onBrand,
  },
});
