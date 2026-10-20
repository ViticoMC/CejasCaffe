import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { FotoEnFormulario } from '../domain/tipos';
import { uriDe } from '../fotos/almacen';
import { colores, espaciado, radio } from '../theme/tokens';
import { tipografia } from '../theme/typography';

interface Props {
  fotos: FotoEnFormulario[];
  maximo: number;
  agregando?: boolean;
  onAgregar: () => void;
  onQuitar: (indice: number) => void;
  onMover: (indice: number, direccion: -1 | 1) => void;
}

const LADO_MINIATURA = 104;

export function SelectorFotos({
  fotos,
  maximo,
  agregando = false,
  onAgregar,
  onQuitar,
  onMover,
}: Props) {
  const lleno = fotos.length >= maximo;

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.encabezado}>
        <Text style={tipografia.headline}>Fotos</Text>
        <Text style={tipografia.micro}>
          {fotos.length}/{maximo}
        </Text>
      </View>

      {fotos.length === 0 && (
        <Text style={tipografia.small}>
          Agrega hasta {maximo} fotos para armar un carrusel en el menú. La primera será la
          portada.
        </Text>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.tira}
        keyboardShouldPersistTaps="handled"
      >
        {fotos.map((foto, indice) => (
          <View key={foto.archivo} style={estilos.item}>
            <View style={estilos.marcoMiniatura}>
              <Image
                source={{ uri: uriDe(foto.archivo) }}
                style={estilos.miniatura}
                resizeMode="cover"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar foto ${indice + 1}`}
                onPress={() => onQuitar(indice)}
                style={estilos.botonQuitar}
              >
                <Feather name="x" size={14} color={colores.texto.onBrand} />
              </Pressable>
              {indice === 0 && (
                <View style={estilos.etiquetaPortada}>
                  <Text style={estilos.textoPortada}>Portada</Text>
                </View>
              )}
            </View>

            <View style={estilos.controles}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mover foto ${indice + 1} a la izquierda`}
                disabled={indice === 0}
                onPress={() => onMover(indice, -1)}
                style={[estilos.botonMover, indice === 0 && estilos.deshabilitado]}
              >
                <Feather name="chevron-left" size={18} color={colores.texto.secondary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mover foto ${indice + 1} a la derecha`}
                disabled={indice === fotos.length - 1}
                onPress={() => onMover(indice, 1)}
                style={[
                  estilos.botonMover,
                  indice === fotos.length - 1 && estilos.deshabilitado,
                ]}
              >
                <Feather name="chevron-right" size={18} color={colores.texto.secondary} />
              </Pressable>
            </View>
          </View>
        ))}

        {!lleno && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar fotos"
            disabled={agregando}
            onPress={onAgregar}
            style={({ pressed }) => [
              estilos.agregar,
              pressed && estilos.presionado,
              agregando && estilos.deshabilitado,
            ]}
          >
            {agregando ? (
              <ActivityIndicator color={colores.brand.secondary} />
            ) : (
              <>
                <Feather name="plus" size={22} color={colores.brand.secondary} />
                <Text style={tipografia.micro}>Agregar</Text>
              </>
            )}
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espaciado.md,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  tira: {
    gap: espaciado.md,
    paddingVertical: espaciado.xs,
  },
  item: {
    gap: espaciado.sm,
  },
  marcoMiniatura: {
    width: LADO_MINIATURA,
    height: LADO_MINIATURA,
    borderRadius: radio.md,
    overflow: 'hidden',
    backgroundColor: colores.bg.subtle,
  },
  miniatura: {
    width: '100%',
    height: '100%',
  },
  botonQuitar: {
    position: 'absolute',
    top: espaciado.xs,
    right: espaciado.xs,
    width: 24,
    height: 24,
    borderRadius: radio.pill,
    backgroundColor: colores.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  etiquetaPortada: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    paddingHorizontal: espaciado.sm,
    paddingVertical: 2,
    backgroundColor: colores.brand.primary,
    borderTopRightRadius: radio.sm,
  },
  textoPortada: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 10,
    color: colores.texto.onBrand,
  },
  controles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botonMover: {
    flex: 1,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.bg.subtle,
    borderRadius: radio.sm,
    marginHorizontal: 1,
  },
  agregar: {
    width: LADO_MINIATURA,
    height: LADO_MINIATURA,
    borderRadius: radio.md,
    borderWidth: 1.5,
    borderColor: colores.borde.default,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.xs,
    backgroundColor: colores.bg.surfaceElevated,
  },
  deshabilitado: {
    opacity: 0.4,
  },
  presionado: {
    opacity: 0.6,
  },
});
