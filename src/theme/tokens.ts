export const colores = {
  brand: {
    primary: '#4A3427',
    secondary: '#A47148',
    latte: '#C89F7B',
    accent: '#5A7A4C',
    leaf: '#8FA67C',
    amber: '#D9B26E',
  },
  bg: {
    background: '#FAF6EF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFDF8',
    subtle: '#F5EDE3',
  },
  borde: {
    default: '#E8DCCB',
  },
  texto: {
    primary: '#2B211C',
    secondary: '#6B5A50',
    muted: '#9C8B7D',
    onBrand: '#FDF8F0',
  },
  funcional: {
    success: '#4C7A4C',
    warning: '#C98A2D',
    error: '#B0563F',
  },
  shadow: 'rgba(43, 33, 28, 0.12)',
  overlay: 'rgba(43, 33, 28, 0.45)',
} as const;

export const espaciado = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const radio = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const sombra = {
  sm: {
    shadowColor: colores.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colores.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
