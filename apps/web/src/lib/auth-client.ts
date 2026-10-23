'use client';

import { inferAdditionalFields } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import type { Auth } from '@/server/auth';

export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
});

/** Traduz códigos de erro do Better Auth para mensagens em português. */
export function authErrorMessage(err: { code?: string; message?: string; status?: number } | null | undefined): string {
  const map: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
    EMAIL_NOT_VERIFIED: 'Confirme seu e-mail antes de entrar. Enviamos um novo link para sua caixa de entrada.',
    USER_ALREADY_EXISTS: 'Já existe uma conta com este e-mail.',
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Já existe uma conta com este e-mail.',
    PASSWORD_TOO_SHORT: 'A senha deve ter pelo menos 8 caracteres.',
    PASSWORD_TOO_LONG: 'Senha muito longa.',
    INVALID_TOKEN: 'Link inválido ou expirado. Solicite um novo.',
    INVALID_PASSWORD: 'Senha incorreta.',
    INVALID_EMAIL: 'E-mail inválido.',
  };
  if (err?.status === 429) return 'Muitas tentativas. Aguarde um minuto e tente novamente.';
  return (err?.code && map[err.code]) || err?.message || 'Não foi possível concluir. Tente novamente.';
}
