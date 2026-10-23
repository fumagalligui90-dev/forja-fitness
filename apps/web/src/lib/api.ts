'use client';

import { ApiClientError, createApiClient } from '@forja/core';

export { ApiClientError };

/** Cliente da API na web: mesma origem, cookie de sessão do navegador. */
export const apiClient = createApiClient({
  baseUrl: '',
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/entrar?next=${encodeURIComponent(window.location.pathname)}`;
    }
  },
});

export const api = apiClient.request;

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado.';
}
