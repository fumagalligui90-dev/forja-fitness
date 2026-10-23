'use client';

import type { ApiError } from '@forja/core';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public issues: { path: string; message: string }[] = [],
  ) {
    super(message);
  }
}

/** Cliente da API /api/v1 (o app móvel usará o mesmo contrato). */
export async function api<T>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: init.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiClientError('Sem conexão com o servidor. Verifique sua internet e tente novamente.', 0, 'network');
  }
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = `/entrar?next=${encodeURIComponent(window.location.pathname)}`;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data as ApiError | null)?.error;
    throw new ApiClientError(e?.message ?? 'Erro inesperado.', res.status, e?.code ?? 'unknown', e?.issues);
  }
  return data as T;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Erro inesperado.';
}
