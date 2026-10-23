'use client';

import type { SessionDTO } from '@forja/core';
import { Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiClientError, errorMessage } from '@/lib/api';
import { Alert, Button, type ButtonProps } from './ui';

/** Cria a sessão no servidor e abre o modo treino. */
export function StartWorkoutButton({
  workoutId,
  label = 'Começar treino',
  ...props
}: { workoutId: string; label?: string } & Omit<ButtonProps, 'onClick'>) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const s = await api<SessionDTO>('/sessions', { method: 'POST', body: { workoutId } });
      router.push(`/app/sessao/${s.id}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'session_open') {
        const { session } = await api<{ session: { id: string } | null }>('/sessions/active');
        if (session) return router.push(`/app/sessao/${session.id}`);
      }
      setError(errorMessage(err));
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button size="xl" onClick={start} loading={pending} {...props}>
        {!pending && <Play className="size-5 fill-current" aria-hidden />}
        {label}
      </Button>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}
