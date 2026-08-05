import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colores } from '../theme/tokens';
import { tipografia } from '../theme/typography';

interface Props {
  mensaje: string;
}

export function ConfirmacionNavegacion({ mensaje }: Props) {
  return (
    <View style={estilos.base}>
      <Feather name="check-circle" size={44} color={colores.funcional.success} />
      <Text style={[tipografia.headline, estilos.texto]}>Navegación funcionando</Text>
      <Text style={[tipografia.small, estilos.texto, estilos.mensaje]}>{mensaje}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignItems: 'center',
    gap: 4,
  },
  texto: {
    textAlign: 'center',
  },
  mensaje: {
    marginTop: 4,
  },
});
