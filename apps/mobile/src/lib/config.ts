import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * URL da API. Ordem: EXPO_PUBLIC_API_URL → em dev, o mesmo IP do Metro na
 * porta 3000 (funciona no celular com Expo Go na mesma rede Wi-Fi) → localhost.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'web') return 'http://localhost:3000';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export const API_URL = resolveApiUrl();
export const APP_SCHEME = (Constants.expoConfig?.scheme as string | undefined) ?? 'forja';
