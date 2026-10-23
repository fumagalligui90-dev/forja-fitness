import { formatDuration } from '@forja/core';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { Icon, Text } from './ui';

type Active = { id: string; workoutName: string; startedAt: string; status: string };

/** Sessões abertas há mais que isso disparam a pergunta "retomar ou encerrar?". */
const STALE_MS = 3 * 60 * 60 * 1000;
const asked = new Set<string>();

/**
 * Faixa "treino em andamento" (recuperação de sessão interrompida) e, para
 * sessões antigas, pergunta se o usuário quer retomar, salvar ou descartar.
 */
export function ActiveSessionBanner({ onChange }: { onChange?: () => void }) {
  const { colors } = useTheme();
  const [active, setActive] = useState<Active | null>(null);

  const close = useCallback(
    async (s: Active, type: 'finish' | 'abandon') => {
      await api.sessions.command(s.id, type === 'finish' ? { type, notes: '', endAtLastSet: true } : { type });
      setActive(null);
      onChange?.();
      if (type === 'finish') router.push(`/resumo/${s.id}`);
    },
    [onChange],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      api.sessions
        .active()
        .then(({ session }) => {
          if (cancelled) return;
          setActive(session);
          if (session && Date.now() - Date.parse(session.startedAt) > STALE_MS && !asked.has(session.id)) {
            asked.add(session.id);
            Alert.alert(
              'Treino antigo em aberto',
              `"${session.workoutName}" foi iniciado há ${formatDuration(Date.now() - Date.parse(session.startedAt))} e não foi encerrado.`,
              [
                { text: 'Descartar', style: 'destructive', onPress: () => void close(session, 'abandon') },
                { text: 'Finalizar e salvar', onPress: () => void close(session, 'finish') },
                { text: 'Retomar', style: 'cancel', onPress: () => router.push(`/sessao/${session.id}`) },
              ],
            );
          }
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [close]),
  );

  if (!active) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Retomar treino ${active.workoutName}`}
      onPress={() => router.push(`/sessao/${active.id}`)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1, borderRadius: 14, padding: 14 }}
    >
      <Icon name="flash" color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text tone="accent" style={{ fontWeight: '800' }}>
          {active.status === 'paused' ? 'Treino pausado' : 'Treino em andamento'}
        </Text>
        <Text tone="muted" style={{ fontSize: 13 }} numberOfLines={1}>
          {active.workoutName} · toque para retomar
        </Text>
      </View>
      <Icon name="chevron-forward" color={colors.accent} />
    </Pressable>
  );
}
