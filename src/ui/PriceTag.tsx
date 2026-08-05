import { StyleSheet, Text, View } from 'react-native';
import { espaciado } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';

interface Props {
  precio: number;
  costo?: number;
  ganancia?: number;
}

export function PriceTag({ precio, costo, ganancia }: Props) {
  return (
    <View style={estilos.base}>
      <Text style={tipografia.precio}>{formatearDinero(precio)}</Text>
      {costo != null && (
        <Text style={[tipografia.micro, estilos.detalle]}>
          Costo {formatearDinero(costo)}
          {ganancia != null && ` · Ganancia ${formatearDinero(ganancia)}`}
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignItems: 'flex-end',
    gap: espaciado.xs,
  },
  detalle: {
    textAlign: 'right',
  },
});
