import { ApiClientError } from '@forja/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/lib/api';
import { Banner, Button, type ButtonProps } from './ui';

/** Cria a sessão no servidor e abre o modo treino (ou retoma a que estiver aberta). */
export function StartWorkoutButton({ workoutId, title = 'Começar treino', ...props }: { workoutId: string } & Omit<ButtonProps, 'onPress'>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const s = await api.sessions.start(workoutId);
      router.push(`/sessao/${s.id}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'session_open') {
        const { session } = await api.sessions.active();
        if (session) router.push(`/sessao/${session.id}`);
      } else setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <Button title={title} icon="play" size="xl" loading={pending} onPress={start} {...props} />
      {error && <Banner>{error}</Banner>}
    </View>
  );
}
