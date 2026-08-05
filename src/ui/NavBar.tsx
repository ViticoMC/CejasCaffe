import { MaterialCommunityIcons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espaciado, radio, sombra } from '../theme/tokens';
import { fuentes } from '../theme/typography';
import { IconoCejas } from './IconoCejas';

export type DestinoNav = 'bebidas' | 'ingredientes' | 'cejas' | 'ventas' | 'inversiones';

export interface ItemNav {
  clave: DestinoNav;
  ruta: string;
  etiqueta: string;
  icono: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  svg?: (color: string, size: number) => React.ReactNode;
}

export const DESTINOS_NAV: ItemNav[] = [
  { clave: 'bebidas', ruta: '/bebidas', etiqueta: 'Bebidas', icono: 'coffee-outline' },
  { clave: 'ingredientes', ruta: '/ingredientes', etiqueta: 'Ingredientes', icono: 'sprout' },
  {
    clave: 'cejas',
    ruta: '/cejas',
    etiqueta: 'Cejas',
    icono: 'mirror',
    svg: (color, size) => <IconoCejas size={size} color={color} />,
  },
  { clave: 'ventas', ruta: '/ventas', etiqueta: 'Ventas', icono: 'cash-multiple' },
  { clave: 'inversiones', ruta: '/inversiones', etiqueta: 'Inversiones', icono: 'chart-donut' },
];

const ALTO_SHEET = 176;
const ALTO_PEEK = 56;
const OCULTO = ALTO_SHEET - ALTO_PEEK;

export function NavBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ruta = usePathname();
  const translateY = useRef(new Animated.Value(OCULTO)).current;
  const expandido = useRef(false);
  const [abierto, setAbierto] = useState(false);

  const animar = (objetivo: number) => {
    expandido.current = objetivo === 0;
    setAbierto(objetivo === 0);
    Animated.spring(translateY, {
      toValue: objetivo,
      useNativeDriver: false,
      tension: 60,
      friction: 12,
    }).start();
  };

  const animarRef = useRef(animar);
  animarRef.current = animar;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesto) =>
        Math.abs(gesto.dy) > 6 && Math.abs(gesto.dy) > Math.abs(gesto.dx),
      onPanResponderMove: (_, gesto) => {
        const base = expandido.current ? 0 : OCULTO;
        translateY.setValue(Math.max(0, Math.min(OCULTO, base + gesto.dy)));
      },
      onPanResponderRelease: (_, gesto) => {
        const base = expandido.current ? 0 : OCULTO;
        const actual = Math.max(0, Math.min(OCULTO, base + gesto.dy));
        const conInercia = actual - gesto.vy * 90;
        animarRef.current(conInercia < OCULTO / 2 ? 0 : OCULTO);
      },
    })
  ).current;

  const alternar = () => animar(expandido.current ? OCULTO : 0);

  return (
    <View style={estilos.envoltura} pointerEvents="box-none">
      <Animated.View
        style={[
          estilos.lamina,
          {
            transform: [{ translateY }],
            paddingBottom: Math.max(insets.bottom, espaciado.md),
          },
        ]}
      >
        <View style={estilos.manija} {...panResponder.panHandlers}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={abierto ? 'Cerrar navegación' : 'Abrir navegación'}
            onPress={alternar}
            style={estilos.pressManija}
          >
            <View style={estilos.pastilla} />
            {abierto && (
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color={colores.texto.muted}
                style={estilos.chevron}
              />
            )}
          </Pressable>
        </View>

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
                  animarRef.current(OCULTO);
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
                      22
                    )
                  ) : (
                    <MaterialCommunityIcons
                      name={item.icono}
                      size={22}
                      color={estaActivo ? colores.brand.primary : colores.texto.muted}
                    />
                  )}
                </View>
                <Text style={[estilos.etiqueta, estaActivo && estilos.etiquetaActiva]}>
                  {item.etiqueta}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

const estilos = StyleSheet.create({
  envoltura: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: ALTO_SHEET,
  },
  lamina: {
    flex: 1,
    backgroundColor: colores.bg.surface,
    borderTopLeftRadius: radio.xl,
    borderTopRightRadius: radio.xl,
    paddingHorizontal: espaciado.md,
    paddingTop: espaciado.xs,
    ...sombra.md,
  },
  manija: {
    height: ALTO_PEEK - espaciado.sm,
    justifyContent: 'center',
  },
  pressManija: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilla: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colores.borde.default,
  },
  chevron: {
    position: 'absolute',
    right: 0,
  },
  fila: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xs,
  },
  itemPresionado: {
    opacity: 0.55,
  },
  icono: {
    width: 44,
    height: 32,
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoActivo: {
    backgroundColor: 'rgba(74, 52, 39, 0.10)',
  },
  etiqueta: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 11,
    lineHeight: 14,
    color: colores.texto.muted,
  },
  etiquetaActiva: {
    color: colores.brand.primary,
  },
});
