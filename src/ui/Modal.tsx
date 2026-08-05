import type { ReactNode } from 'react';
import {
  Modal as ModalRN,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espaciado, radio } from '../theme/tokens';
import { tipografia } from '../theme/typography';

interface Props {
  visible: boolean;
  titulo: string;
  subtitulo?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  scrollable?: boolean;
  maxAlturaCuerpo?: number;
}

export function Modal({
  visible,
  titulo,
  subtitulo,
  onClose,
  children,
  footer,
  scrollable = false,
  maxAlturaCuerpo,
}: Props) {
  return (
    <ModalRN
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={estilos.escenario}>
        <Pressable
          accessibilityLabel="Cerrar"
          style={estilos.overlay}
          onPress={onClose}
        />
        <SafeAreaView style={estilos.safe} edges={['bottom']}>
          <View style={estilos.tarjeta}>
            <View style={estilos.barraArrastre} />
            <View style={estilos.encabezado}>
              <Text style={tipografia.headline}>{titulo}</Text>
              {subtitulo != null && <Text style={tipografia.small}>{subtitulo}</Text>}
            </View>
            {scrollable ? (
              <ScrollView
                style={maxAlturaCuerpo != null ? { maxHeight: maxAlturaCuerpo } : undefined}
                contentContainerStyle={estilos.cuerpo}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={estilos.cuerpo}>{children}</View>
            )}
            {footer != null && <View style={estilos.pie}>{footer}</View>}
          </View>
        </SafeAreaView>
      </View>
    </ModalRN>
  );
}

const estilos = StyleSheet.create({
  escenario: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colores.overlay,
  },
  safe: {
    backgroundColor: colores.bg.surface,
  },
  tarjeta: {
    backgroundColor: colores.bg.surface,
    borderTopLeftRadius: radio.xl,
    borderTopRightRadius: radio.xl,
    paddingHorizontal: espaciado['2xl'],
    paddingTop: espaciado.sm,
    paddingBottom: espaciado.lg,
  },
  barraArrastre: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colores.borde.default,
    alignSelf: 'center',
    marginBottom: espaciado.lg,
  },
  encabezado: {
    gap: espaciado.xs,
    marginBottom: espaciado.lg,
  },
  cuerpo: {
    gap: espaciado.md,
  },
  pie: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginTop: espaciado.xl,
  },
});
