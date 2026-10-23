import { Stack } from 'expo-router';
import { useTheme } from '@/lib/theme';

// O login é a primeira tela do grupo, inclusive ao abrir por deep link.
export const unstable_settings = { initialRouteName: 'entrar' };

export default function AuthLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitle: '',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="entrar" options={{ headerShown: false }} />
      <Stack.Screen name="cadastro" />
      <Stack.Screen name="recuperar-senha" />
    </Stack>
  );
}
