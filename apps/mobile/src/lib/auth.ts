import { expoClient } from '@better-auth/expo/client';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL, APP_SCHEME } from './config';

const isWeb = Platform.OS === 'web';

/**
 * No celular, o cookie de sessão fica no armazenamento seguro do sistema
 * (Keychain/Keystore) via plugin Expo do Better Auth. No Expo web (só para
 * desenvolvimento) o navegador guarda o cookie normalmente.
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: isWeb ? { credentials: 'include' } : undefined,
  plugins: [
    expoClient({ scheme: APP_SCHEME, storagePrefix: 'forja', storage: SecureStore }),
    inferAdditionalFields({
      user: {
        birthDate: { type: 'string', required: false },
        termsVersion: { type: 'string', required: false },
        termsAcceptedAt: { type: 'date', required: false, input: false },
        role: { type: 'string', required: false, input: false },
      },
    }),
  ],
});

/** Cabeçalho Cookie para chamadas à nossa API (/api/v1) no app nativo. */
export async function authHeaders(): Promise<Record<string, string>> {
  if (isWeb) return {};
  const cookie = await authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
}

export function authErrorMessage(err: { code?: string; message?: string; status?: number } | null | undefined): string {
  const map: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
    EMAIL_NOT_VERIFIED: 'Confirme seu e-mail antes de entrar. Enviamos um novo link para sua caixa de entrada.',
    USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail.',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail.',
    PASSWORD_TOO_SHORT: 'A senha deve ter pelo menos 8 caracteres.',
    INVALID_PASSWORD: 'Senha incorreta.',
    INVALID_EMAIL: 'E-mail inválido.',
  };
  if (err?.status === 429) return 'Muitas tentativas. Aguarde um minuto e tente novamente.';
  if (err?.status === 0 || err?.message === 'Network request failed') {
    return `Sem conexão com o servidor (${API_URL}).`;
  }
  return (err?.code && map[err.code]) || err?.message || 'Não foi possível concluir. Tente novamente.';
}
