import { Feather } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espaciado, radio } from '../theme/tokens';
import { fuentes, tipografia } from '../theme/typography';
import { Stepper } from './Stepper';

const MES_MIN = 1;
const MES_MAX = 12;
const ANIO_MIN = 2000;

function diasEnMes(anio: number, mes: number): number {
  return new Date(anio, mes, 0).getDate();
}

function esHoy(fecha: Date): boolean {
  const hoy = new Date();
  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getDate() === hoy.getDate()
  );
}

interface Props {
  valor: Date;
  onChange: (fecha: Date) => void;
}

export function FechaSelector({ valor, onChange }: Props) {
  const anioActual = new Date().getFullYear();
  const [anio, setAnio] = useState(valor.getFullYear());
  const [mes, setMes] = useState(valor.getMonth() + 1);
  const [dia, setDia] = useState(valor.getDate());

  const emitir = (anioNuevo: number, mesNuevo: number, diaNuevo: number) => {
    const dias = diasEnMes(anioNuevo, mesNuevo);
    const diaValido = Math.min(Math.max(1, diaNuevo), dias);
    setAnio(anioNuevo);
    setMes(mesNuevo);
    setDia(diaValido);
    onChange(new Date(anioNuevo, mesNuevo - 1, diaValido));
  };

  const hoy = useMemo(() => esHoy(valor), [valor]);

  return (
    <View style={estilos.seccion}>
      <View style={estilos.cabecera}>
        <View style={estilos.info}>
          <Text style={tipografia.small}>Fecha de la venta</Text>
          <Text style={tipografia.micro}>Si no especificas, se guarda como hoy</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Usar la fecha de hoy"
          onPress={() => {
            const ahora = new Date();
            emitir(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate());
          }}
          disabled={hoy}
          style={({ pressed }) => [
            estilos.botonHoy,
            pressed && estilos.presionado,
          ]}
        >
          <Feather name="calendar" size={14} color={colores.brand.accent} />
          <Text style={estilos.textoHoy}>Hoy</Text>
        </Pressable>
      </View>
      <View style={estilos.filaStepper}>
        <Text style={tipografia.small}>Día</Text>
        <Stepper
          valor={dia}
          onChange={(d) => emitir(anio, mes, d)}
          minimo={1}
          maximo={diasEnMes(anio, mes)}
        />
      </View>
      <View style={estilos.filaStepper}>
        <Text style={tipografia.small}>Mes</Text>
        <Stepper
          valor={mes}
          onChange={(m) => emitir(anio, m, dia)}
          minimo={MES_MIN}
          maximo={MES_MAX}
        />
      </View>
      <View style={estilos.filaStepper}>
        <Text style={tipografia.small}>Año</Text>
        <Stepper
          valor={anio}
          onChange={(a) => emitir(a, mes, dia)}
          minimo={ANIO_MIN}
          maximo={anioActual}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: {
    backgroundColor: colores.bg.subtle,
    borderRadius: radio.lg,
    padding: espaciado.lg,
    gap: espaciado.md,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaciado.md,
  },
  info: {
    flex: 1,
    gap: espaciado.xs,
  },
  botonHoy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.xs,
    borderWidth: 1,
    borderColor: colores.borde.default,
    backgroundColor: colores.bg.surface,
    borderRadius: radio.pill,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm,
  },
  textoHoy: {
    fontFamily: fuentes.outfitSemiBold,
    fontSize: 13,
    color: colores.brand.accent,
  },
  filaStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presionado: {
    opacity: 0.6,
  },
});