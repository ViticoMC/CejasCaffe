import {
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold } from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DATABASE_NAME, migrateDbIfNeeded } from '../db/database';
import { colores } from '../theme/tokens';
import { NavBar } from '../ui/NavBar';

export default function Layout() {
  const [cargada, errorFuente] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  if (!cargada && !errorFuente) {
    return <View style={estilos.carga} />;
  }

  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <StatusBar style="dark" />
        <View style={estilos.shell}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colores.bg.background },
            }}
          />
          <NavBar />
        </View>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  carga: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
  shell: {
    flex: 1,
    backgroundColor: colores.bg.background,
  },
});
