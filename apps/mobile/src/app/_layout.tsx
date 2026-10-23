import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Loading } from '@/components/ui';
import { authClient } from '@/lib/auth';
import { ThemeProvider, useTheme } from '@/lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <RootNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * Rotas protegidas pela sessão validada no servidor: sem login só o grupo
 * (auth) existe; logado sem aceite de termos (login social), só a conclusão
 * do cadastro; logado e completo, o app.
 */
function RootNavigator() {
  const { colors, scheme } = useTheme();
  const { data: session, isPending } = authClient.useSession();

  if (isPending && !session) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <Loading label="Abrindo…" />
      </View>
    );
  }

  const loggedIn = !!session?.user?.emailVerified;
  const needsConsent = loggedIn && !session?.user?.termsAcceptedAt;

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={!loggedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={needsConsent}>
          <Stack.Screen name="concluir-cadastro" />
        </Stack.Protected>
        <Stack.Protected guard={loggedIn && !needsConsent}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
