import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colores, espaciado, radio } from '../theme/tokens';
import { fuentes } from '../theme/typography';

interface Props {
  valor: number;
  onChange: (valor: number) => void;
  paso?: number;
  minimo?: number;
  maximo?: number;
  unidad?: string;
  entero?: boolean;
}

const DECIMALES = 3;

function redondear(valor: number): number {
  const factor = 10 ** DECIMALES;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

function formatear(valor: number): string {
  if (!Number.isFinite(valor)) return '';
  return String(redondear(valor));
}

function limpiarEntrada(texto: string): string {
  let limpio = texto.replace(/[^0-9.,]/g, '');
  const separador = limpio.search(/[.,]/);
  if (separador !== -1) {
    limpio =
      limpio.slice(0, separador + 1) + limpio.slice(separador + 1).replace(/[.,]/g, '');
  }
  return limpio;
}

function parsear(texto: string): number {
  const valor = parseFloat(texto.replace(',', '.'));
  return Number.isFinite(valor) ? valor : NaN;
}

export function CantidadInput({
  valor,
  onChange,
  paso = 1,
  minimo = 0,
  maximo = 999999,
  unidad,
  entero = false,
}: Props) {
  const [texto, setTexto] = useState(() => formatear(valor));
  const ultimo = useRef(valor);

  useEffect(() => {
    if (valor !== ultimo.current) {
      ultimo.current = valor;
      setTexto(formatear(valor));
    }
  }, [valor]);

  const aplicar = (nuevo: number) => {
    const ajustado = entero ? Math.round(nuevo) : nuevo;
    const acotado = redondear(Math.min(maximo, Math.max(minimo, ajustado)));
    ultimo.current = acotado;
    setTexto(formatear(acotado));
    onChange(acotado);
  };

  const cambiarTexto = (entrada: string) => {
    const limpio = limpiarEntrada(entrada);
    setTexto(limpio);
    const numero = parsear(limpio);
    if (!Number.isNaN(numero) && numero >= minimo) {
      const acotado = Math.min(maximo, entero ? Math.round(numero) : numero);
      ultimo.current = acotado;
      onChange(acotado);
    }
  };

  const actual = parsear(texto);
  const base = Number.isNaN(actual) ? valor : actual;
  const sufijo = unidad != null && unidad.trim().length > 0 ? unidad.trim() : null;
  const sufijoRecortado = sufijo != null && sufijo.length > 12 ? sufijo.slice(0, 12) : sufijo;

  return (
    <View style={estilos.base}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reducir cantidad"
        onPress={() => aplicar(base - paso)}
        disabled={base <= minimo}
        style={({ pressed }) => [
          estilos.boton,
          (pressed || base <= minimo) && estilos.botonApagado,
        ]}
      >
        <Feather name="minus" size={18} color={colores.brand.primary} />
      </Pressable>

      <View style={estilos.campo}>
        <TextInput
          value={texto}
          onChangeText={cambiarTexto}
          onBlur={() => setTexto(formatear(valor))}
          keyboardType="decimal-pad"
          selectTextOnFocus
          accessibilityLabel={sufijo != null ? `Cantidad en ${sufijo}` : 'Cantidad'}
          style={estilos.input}
        />
        {sufijoRecortado != null && (
          <Text
            style={estilos.unidad}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {sufijoRecortado}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aumentar cantidad"
        onPress={() => aplicar(base + paso)}
        disabled={base >= maximo}
        style={({ pressed }) => [
          estilos.boton,
          (pressed || base >= maximo) && estilos.botonApagado,
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
    flexWrap: 'nowrap',
  },
  boton: {
    width: 40,
    height: 40,
    borderRadius: radio.pill,
    backgroundColor: colores.bg.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  botonApagado: {
    opacity: 0.4,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    minHeight: 40,
    paddingHorizontal: espaciado.sm,
    borderRadius: radio.sm,
    borderWidth: 1,
    borderColor: colores.borde.default,
    backgroundColor: colores.bg.surface,
    flexShrink: 1,
    minWidth: 0,
  },
  input: {
    paddingVertical: 0,
    textAlign: 'center',
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 16,
    color: colores.texto.primary,
    fontVariant: ['tabular-nums'],
    minWidth: 24,
    flexShrink: 0,
    flexGrow: 0,
  },
  unidad: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 12,
    color: colores.texto.muted,
    flexShrink: 1,
    textAlign: 'right',
    minWidth: 0,
  },
});
