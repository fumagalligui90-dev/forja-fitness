'use client';

import type { SessionDTO } from '@forja/core';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WorkoutPlayer } from '@/components/workout-player';
import { Alert, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SessionDTO>(`/sessions/${id}`)
      .then((s) => {
        if (s.status === 'completed' || s.status === 'abandoned') router.replace(`/app/sessao/${id}/resumo`);
        else setSession(s);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [id, router]);

  if (error)
    return (
      <div className="p-4">
        <Alert>{error}</Alert>
      </div>
    );
  if (!session) return <Spinner label="Carregando treino…" />;
  return <WorkoutPlayer initial={session} />;
}
