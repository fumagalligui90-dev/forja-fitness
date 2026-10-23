import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { setupNotifications } from '@/lib/notifications';
import { MeProvider } from '@/lib/me';
import { useTheme } from '@/lib/theme';

export default function AppLayout() {
  const { colors } = useTheme();
  useEffect(() => {
    void setupNotifications();
  }, []);
  return (
    <MeProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="treino/[id]" options={{ title: 'Treino' }} />
        <Stack.Screen name="perfil" options={{ title: 'Perfil de treino' }} />
        <Stack.Screen name="resumo/[id]" options={{ title: 'Resumo' }} />
        {/* Modo treino: tela cheia, sem gesto de voltar acidental. */}
        <Stack.Screen name="sessao/[id]" options={{ headerShown: false, gestureEnabled: false, animation: 'slide_from_bottom' }} />
      </Stack>
    </MeProvider>
  );
}
