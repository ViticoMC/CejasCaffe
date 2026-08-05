import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';

type TipoElemento = {
  clave: string;
  icono: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  nombre: string;
  descripcion: string;
};

const tipos: TipoElemento[] = [
  {
    clave: 'bebida',
    icono: 'coffee-outline',
    nombre: 'Bebida',
    descripcion: 'Receta con ingredientes, costo y precio sugerido.',
  },
  {
    clave: 'ingrediente',
    icono: 'sprout',
    nombre: 'Ingrediente',
    descripcion: 'Producto base con unidad de medida y precio unitario.',
  },
];

export function CrearElementoScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={estilos.safe}>
      <View style={estilos.encabezado}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={estilos.botonVolver}
        >
          <Feather name="chevron-left" size={22} color={colores.brand.primary} />
        </Pressable>
        <View style={estilos.titulos}>
          <Text style={tipografia.title}>Nuevo elemento</Text>
          <Text style={tipografia.small}>¿Qué quieres agregar primero?</Text>
        </View>
      </View>

      <View style={estilos.lista}>
        {tipos.map((tipo) => (
          <View key={tipo.clave} style={estilos.opcion}>
            <View style={estilos.iconoOpcion}>
              <MaterialCommunityIcons
                name={tipo.icono}
                size={26}
                color={colores.brand.primary}
              />
            </View>
            <View style={estilos.infoOpcion}>
              <View style={estilos.filaNombre}>
                <Text style={tipografia.headline}>{tipo.nombre}</Text>
                <Badge label="Próximamente" tone="muted" />
              </View>
              <Text style={tipografia.small}>{tipo.descripcion}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[tipografia.micro, estilos.nota]}>
        En esta fase construimos la bienvenida. Las fichas de bebidas e
        ingredientes llegan en los próximos pasos.
      </Text>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.md,
    paddingHorizontal: espaciado.lg,
    paddingTop: espaciado.lg,
  },
  botonVolver: {
    width: 44,
    height: 44,
    borderRadius: radio.md,
    backgroundColor: colores.bg.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra.sm,
  },
  titulos: {
    flex: 1,
    gap: espaciado.xs,
  },
  lista: {
    flex: 1,
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado['3xl'],
    gap: espaciado.lg,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.md,
    backgroundColor: colores.bg.surface,
    borderRadius: radio.lg,
    padding: espaciado.xl,
    ...sombra.md,
    opacity: 0.85,
  },
  iconoOpcion: {
    width: 52,
    height: 52,
    borderRadius: radio.md,
    backgroundColor: colores.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoOpcion: {
    flex: 1,
    gap: espaciado.sm,
  },
  filaNombre: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.sm,
  },
  nota: {
    paddingHorizontal: espaciado['2xl'],
    paddingBottom: 80,
    textAlign: 'center',
  },
});
