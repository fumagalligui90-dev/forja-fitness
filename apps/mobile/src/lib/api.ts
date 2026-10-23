import { createApiClient } from '@forja/core';
import { Platform } from 'react-native';
import { authHeaders } from './auth';
import { API_URL } from './config';

/** Mesmo cliente tipado da web, autenticado com o cookie guardado no SecureStore. */
export const api = createApiClient({
  baseUrl: API_URL,
  headers: authHeaders,
  credentials: Platform.OS === 'web' ? 'include' : 'omit',
});

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado.';
}
