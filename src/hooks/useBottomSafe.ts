import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALTO_NAV, espaciado } from '../theme/tokens';

/**
 * Devuelve el padding inferior dinámico para que el contenido no quede
 * oculto detrás de la NavBar ni del home indicator del dispositivo.
 *
 * Fórmula: NavBar height + max(insets.bottom, espaciado.lg) + espaciado.md
 */
export function useBottomSafe() {
  const insets = useSafeAreaInsets();
  return ALTO_NAV + Math.max(insets.bottom, espaciado.lg) + espaciado.md;
}
