import { WEEKDAY_SHORT } from '@forja/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { StartWorkoutButton } from '@/components/start-button';
import { Banner, Button, Card, Empty, Loading, Row, Screen, Text, Title } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useApiOnFocus } from '@/lib/use-api';

export default function Workouts() {
  const { colors } = useTheme();
  const { data, error, loading, reload } = useApiOnFocus(() => api.workouts.list());
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function duplicate(id: string) {
    setBusy(id);
    try {
      await api.workouts.duplicate(id);
      await reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>Treinos</Title>
        <Button title="Novo" icon="add" size="sm" onPress={() => router.push('/treino/novo')} />
      </Row>
      {(error || actionError) && <Banner>{error ?? actionError ?? ''}</Banner>}
      {!data ? (
        !error && <Loading />
      ) : data.length === 0 ? (
        <Empty icon="barbell-outline" title="Nenhum treino ainda" text="Crie fichas como A — Peito e Tríceps, B — Costas e Bíceps, C — Pernas." />
      ) : (
        data.map((w) => (
          <Card key={w.id} style={{ gap: 14 }}>
            <Row gap={12}>
              <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text tone="accent" style={{ fontSize: 24, fontWeight: '900' }}>
                  {w.label || '•'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: '800' }} numberOfLines={1}>
                  {w.name}
                </Text>
                <Text tone="muted" style={{ fontSize: 13 }}>
                  {w.exerciseCount} exercícios · {w.totalSets} séries
                </Text>
                <Text tone="faint" style={{ fontSize: 12 }}>
                  {w.lastPerformedAt ? `Último: ${new Date(w.lastPerformedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : 'Ainda não realizado'}
                </Text>
              </View>
            </Row>
            <Row gap={4}>
              {WEEKDAY_SHORT.map((d, i) => {
                const on = w.weekdays.includes(i);
                return (
                  <View key={d} style={{ flex: 1, borderRadius: 6, paddingVertical: 4, backgroundColor: on ? colors.accent : colors.surface2 }}>
                    <Text style={{ textAlign: 'center', fontSize: 11, fontWeight: '800', color: on ? colors.accentInk : colors.faint }}>{d}</Text>
                  </View>
                );
              })}
            </Row>
            <Row>
              <View style={{ flex: 1 }}>
                {w.exerciseCount > 0 ? (
                  <StartWorkoutButton workoutId={w.id} title="Começar" size="lg" />
                ) : (
                  <Button title="Adicionar exercícios" variant="secondary" size="lg" onPress={() => router.push(`/treino/${w.id}`)} />
                )}
              </View>
              <Button icon="create-outline" variant="secondary" size="lg" square accessibilityLabel={`Editar ${w.name}`} onPress={() => router.push(`/treino/${w.id}`)} />
              <Button icon="copy-outline" variant="secondary" size="lg" square accessibilityLabel={`Duplicar ${w.name}`} loading={busy === w.id} onPress={() => duplicate(w.id)} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
