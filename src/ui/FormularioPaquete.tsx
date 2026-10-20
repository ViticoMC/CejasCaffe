import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NuevoPaquete, Paquete } from '../domain/tipos';
import { espaciado, colores } from '../theme/tokens';
import { formatearDinero, tipografia } from '../theme/typography';
import { Button } from './Button';
import { Input } from './Input';

function parsear(texto: string): number {
  const valor = parseFloat(texto.trim().replace(',', '.'));
  return Number.isFinite(valor) ? valor : NaN;
}

interface Props {
  material: { nombre: string; unidad: string };
  inicial: Paquete | null;
  onGuardar: (dato: NuevoPaquete) => Promise<void>;
  onCancelar: () => void;
}

export function FormularioPaquete({ material, inicial, onGuardar, onCancelar }: Props) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '');
  const [cantidad, setCantidad] = useState(inicial != null ? String(inicial.cantidad) : '');
  const [precio, setPrecio] = useState(inicial != null ? String(inicial.precio) : '');
  const [errorNombre, setErrorNombre] = useState<string | undefined>();
  const [errorCantidad, setErrorCantidad] = useState<string | undefined>();
  const [errorPrecio, setErrorPrecio] = useState<string | undefined>();
  const [guardando, setGuardando] = useState(false);

  const unidad = material.unidad.trim();
  const valorCantidad = parsear(cantidad);
  const valorPrecio = parsear(precio);
  const porUnidad =
    !Number.isNaN(valorCantidad) &&
    valorCantidad > 0 &&
    !Number.isNaN(valorPrecio) &&
    valorPrecio > 0
      ? formatearDinero(valorPrecio / valorCantidad)
      : null;

  const validar = (): boolean => {
    let ok = true;
    setErrorNombre(nombre.trim().length === 0 ? 'Escribe un nombre para el paquete.' : undefined);
    if (nombre.trim().length === 0) ok = false;
    if (Number.isNaN(valorCantidad) || valorCantidad <= 0) {
      setErrorCantidad(`La cantidad debe ser mayor a 0 ${unidad !== '' ? `(${unidad})` : ''}.`);
      ok = false;
    } else {
      setErrorCantidad(undefined);
    }
    if (Number.isNaN(valorPrecio) || valorPrecio <= 0) {
      setErrorPrecio('El precio debe ser mayor a 0.');
      ok = false;
    } else {
      setErrorPrecio(undefined);
    }
    return ok;
  };

  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        cantidad: valorCantidad,
        precio: valorPrecio,
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <Input
        label="Nombre del paquete"
        value={nombre}
        onChangeText={setNombre}
        placeholder={unidad !== '' ? `p. ej. Paquete de ${unidad}` : 'p. ej. Paquete grande'}
        error={errorNombre}
        autoFocus
      />
      <Input
        label={`Contenido por paquete${unidad !== '' ? ` (${unidad})` : ''}`}
        value={cantidad}
        onChangeText={setCantidad}
        placeholder="0"
        keyboardType="decimal-pad"
        error={errorCantidad}
      />
      <Input
        label="Precio del paquete"
        value={precio}
        onChangeText={setPrecio}
        placeholder="0.00"
        keyboardType="decimal-pad"
        error={errorPrecio}
      />
      {porUnidad != null && unidad !== '' && (
        <Text style={[tipografia.micro, estilos.preview]}>
          Equivale a {porUnidad} por {unidad}
        </Text>
      )}
      <View style={estilos.footer}>
        <Button
          label="Cancelar"
          variant="secondary"
          onPress={onCancelar}
          disabled={guardando}
          style={estilos.botonMitad}
        />
        <Button
          label={inicial != null ? 'Guardar cambios' : 'Agregar'}
          icon="check"
          onPress={guardar}
          disabled={guardando}
          style={estilos.botonMitad}
        />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  preview: {
    color: colores.texto.secondary,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: espaciado.md,
    marginTop: espaciado.xs,
  },
  botonMitad: {
    flex: 1,
  },
});
