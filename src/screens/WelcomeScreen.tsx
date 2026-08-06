import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espaciado, radio } from '../theme/tokens';
import { tipografia } from '../theme/typography';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { TroncoBambu } from '../ui/Decoracion';

export function WelcomeScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={estilos.safe}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={['rgba(143, 166, 124, 0.28)', 'rgba(250, 246, 239, 0)']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={estilos.resplandor}
          pointerEvents="none"
        />

        <View style={estilos.hero}>
          <View style={estilos.bambuCluster} pointerEvents="none">
            <TroncoBambu altura={120} ancho={14} color={colores.brand.leaf} opacidad={0.5} />
            <TroncoBambu altura={170} ancho={18} color={colores.brand.accent} opacidad={0.85} />
            <TroncoBambu altura={90} ancho={12} color={colores.brand.amber} opacidad={0.6} />
          </View>

          <View style={estilos.logo}>
            <Image
              source={require('../../assets/logo.png')}
              style={estilos.logoImagen}
              resizeMode="contain"
            />
          </View>

          <Text style={tipografia.display}>Cejas & Café</Text>

          <Text style={[tipografia.body, estilos.tagline]}>
            Tu mirada, tu café, tu momento.
          </Text>

          <View style={estilos.chip}>
            <Badge label="Gestión local · sin conexión" tone="info" />
          </View>
        </View>

        <View style={estilos.pie}>
          <Button
            label="Comenzar a agregar"
            icon="plus"
            onPress={() => router.navigate('/bebidas')}
            style={estilos.cta}
          />
          <View style={estilos.nota}>
            <Feather name="smartphone" size={14} color={colores.texto.muted} />
            <Text style={tipografia.micro}>
              Tus datos viven en este dispositivo
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espaciado['2xl'],
    paddingBottom: 80,
    justifyContent: 'space-between',
  },
  resplandor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    borderBottomLeftRadius: radio.xl * 2,
    borderBottomRightRadius: radio.xl * 2,
  },
  hero: {
    paddingTop: espaciado['4xl'],
    alignItems: 'flex-start',
  },
  bambuCluster: {
    position: 'absolute',
    top: espaciado.lg,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: espaciado.sm,
  },
  logo: {
    marginBottom: espaciado.md,
  },
  logoImagen: {
    width: 120,
    height: 110,
  },
  tagline: {
    marginTop: espaciado.sm,
  },
  chip: {
    marginTop: espaciado.xl,
  },
  pie: {
    gap: espaciado.md,
  },
  cta: {
    width: '100%',
  },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.sm,
  },
});
