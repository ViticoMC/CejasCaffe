import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { fuentes } from '../theme/typography';
// import { IconoCeja } from './IconoCeja';

export type DestinoNav =
  | 'menu'
  | 'bebidas'
  | 'ingredientes'
  | 'cejas'
  | 'ventas'
  | 'inversiones'
  | 'almacen'
  | 'respaldos';

export interface ItemNav {
  clave: DestinoNav;
  ruta: string;
  etiqueta: string;
  icono: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  svg?: (color: string, size: number) => React.ReactNode;
}

export const DESTINOS_NAV: ItemNav[] = [
  { clave: 'menu', ruta: '/menu', etiqueta: 'Menú', icono: 'qrcode' },
  { clave: 'bebidas', ruta: '/bebidas', etiqueta: 'Bebidas', icono: 'coffee-outline' },
  { clave: 'ingredientes', ruta: '/ingredientes', etiqueta: 'Materiales', icono: 'sprout' },
  // Pestaña "Cejas" oculta temporalmente de la interfaz. La lógica (ruta y
  // CejasScreen) se conserva; basta descomentar para volver a mostrarla.
  // {
  //   clave: 'cejas',
  //   ruta: '/cejas',
  //   etiqueta: 'Cejas',
  //   icono: 'mirror',
  //   svg: (color) => <IconoCeja color={color} />,
  // },
  { clave: 'ventas', ruta: '/ventas', etiqueta: 'Ventas', icono: 'cash-multiple' },
  { clave: 'inversiones', ruta: '/inversiones', etiqueta: 'Inversiones', icono: 'chart-donut' },
  { clave: 'almacen', ruta: '/almacen', etiqueta: 'Almacén', icono: 'warehouse' },
  { clave: 'respaldos', ruta: '/respaldos', etiqueta: 'Respaldos', icono: 'backup-restore' },
];

const ALTO_NAV = 56;

export function NavBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ruta = usePathname();
  const paddingBottom = Math.max(insets.bottom, espaciado.xs);

  return (
    <View style={estilos.envoltura} pointerEvents="box-none">
      <View
        style={[
          estilos.lamina,
          {
            height: ALTO_NAV + paddingBottom,
            paddingBottom,
          },
        ]}
      >
        <View style={estilos.fila}>
          {DESTINOS_NAV.map((item) => {
            const estaActivo = ruta === item.ruta;
            return (
              <Pressable
                key={item.clave}
                accessibilityRole="tab"
                accessibilityState={{ selected: estaActivo }}
                onPress={() => {
                  router.navigate(item.ruta);
                }}
                style={({ pressed }) => [
                  estilos.item,
                  pressed && estilos.itemPresionado,
                ]}
              >
                <View style={[estilos.icono, estaActivo && estilos.iconoActivo]}>
                  {item.svg != null ? (
                    item.svg(
                      estaActivo ? colores.brand.primary : colores.texto.muted,
                      20
                    )
                  ) : (
                    <MaterialCommunityIcons
                      name={item.icono}
                      size={20}
                      color={estaActivo ? colores.brand.primary : colores.texto.muted}
                    />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={[estilos.etiqueta, estaActivo && estilos.etiquetaActiva]}
                >
                  {item.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  envoltura: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  lamina: {
    backgroundColor: colores.bg.surface,
    borderTopLeftRadius: radio.lg,
    borderTopRightRadius: radio.lg,
    paddingHorizontal: espaciado.xs,
    paddingTop: espaciado.xs,
    ...sombra.md,
  },
  fila: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  itemPresionado: {
    opacity: 0.55,
  },
  icono: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoActivo: {
    backgroundColor: colores.brand.primary + '14',
  },
  etiqueta: {
    fontFamily: fuentes.outfitRegular,
    fontSize: 10,
    color: colores.texto.muted,
    textAlign: 'center',
  },
  etiquetaActiva: {
    fontFamily: fuentes.outfitMedium,
    color: colores.brand.primary,
  },
});
