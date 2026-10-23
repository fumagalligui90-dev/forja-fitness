import { computeVolume, elapsedMs, formatClock, formatDuration, formatKg, MUSCLE_GROUP_LABELS } from '@forja/core';
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { Badge, Banner, Button, Card, Icon, Loading, Overline, Row, Screen, Text, Title, type IconName } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useApiOnFocus } from '@/lib/use-api';

export default function Summary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: s, error } = useApiOnFocus(() => api.sessions.get(id), [id]);

  if (error) return <Screen edges={[]}>{<Banner>{error}</Banner>}</Screen>;
  if (!s) return <Loading />;

  const duration = elapsedMs(
    { startedAt: Date.parse(s.startedAt), endedAt: s.endedAt ? Date.parse(s.endedAt) : null, pausedAt: s.pausedAt ? Date.parse(s.pausedAt) : null, pausedTotalMs: s.pausedTotalMs },
    Date.parse(s.serverNow),
  );
  const total = computeVolume(s.exercises.flatMap((e) => e.sets));
  const doneExercises = s.exercises.filter((e) => e.sets.length > 0).length;
  const totalSets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
  const stats: { icon: IconName; label: string; value: string; sub?: string }[] = [
    { icon: 'timer-outline', label: 'Duração', value: formatDuration(duration), sub: formatClock(duration) },
    { icon: 'barbell-outline', label: 'Exercícios', value: `${doneExercises}/${s.exercises.length}` },
    { icon: 'layers-outline', label: 'Séries', value: String(totalSets), sub: `${total.totalReps} repetições` },
    { icon: 'scale-outline', label: 'Volume estimado', value: formatKg(total.volumeKg) },
  ];

  return (
    <Screen edges={[]}>
      <View>
        <Overline>{s.status === 'completed' ? 'Treino concluído' : s.status === 'abandoned' ? 'Treino descartado' : 'Treino em andamento'}</Overline>
        <Title size={32}>{s.workoutName}</Title>
        <Text tone="muted" style={{ fontSize: 14 }}>
          {new Date(s.startedAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      {(s.status === 'active' || s.status === 'paused') && <Button title="Voltar ao treino" icon="play" onPress={() => router.replace(`/sessao/${s.id}`)} />}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {stats.map((st) => (
          <Card key={st.label} style={{ flex: 1, minWidth: '45%', padding: 14 }}>
            <Row gap={6}>
              <Icon name={st.icon} size={16} color={colors.faint} />
              <Overline tone="faint" style={{ fontSize: 11 }}>
                {st.label}
              </Overline>
            </Row>
            <Text style={{ fontSize: 26, fontWeight: '900', marginTop: 6, fontVariant: ['tabular-nums'] }}>{st.value}</Text>
            {st.sub && (
              <Text tone="faint" style={{ fontSize: 12 }}>
                {st.sub}
              </Text>
            )}
          </Card>
        ))}
      </View>

      {total.missingSets > 0 && (
        <Banner tone="warning">
          {`${total.missingSets} ${total.missingSets === 1 ? 'série não tem' : 'séries não têm'} carga ou repetições registradas e ${total.missingSets === 1 ? 'ficou' : 'ficaram'} fora do volume. Nenhum valor foi estimado.`}
        </Banner>
      )}

      <Title size={20}>Por exercício</Title>
      {s.exercises.map((e) => {
        const v = computeVolume(e.sets);
        return (
          <Card key={e.id} style={{ gap: 8 }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>{e.name}</Text>
                <Text tone="faint" style={{ fontSize: 12 }}>
                  {MUSCLE_GROUP_LABELS[e.muscleGroup]}
                </Text>
              </View>
              <Row gap={4} style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {e.skipped && <Badge label="Pulado" tone="warning" />}
                {e.originalExerciseId && <Badge label="Substituído" tone="warning" />}
                <Badge label={`${e.sets.length}/${e.plannedSets}`} tone={e.sets.length >= e.plannedSets ? 'success' : 'neutral'} />
              </Row>
            </Row>
            {e.sets.length > 0 ? (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {e.sets.map((set) => (
                    <View key={set.id} style={{ backgroundColor: colors.surface2, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 13, fontVariant: ['tabular-nums'] }}>
                        {set.loadKg == null ? '—' : formatKg(set.loadKg)} × {set.reps ?? '—'}
                      </Text>
                    </View>
                  ))}
                </View>
                <Text tone="muted" style={{ fontSize: 13 }}>
                  Volume: <Text style={{ fontWeight: '800', fontSize: 13 }}>{formatKg(v.volumeKg)}</Text>
                  {v.missingSets > 0 ? <Text tone="warning" style={{ fontSize: 13 }}>{` · ${v.missingSets} sem dados completos`}</Text> : null}
                </Text>
              </>
            ) : (
              <Text tone="faint" style={{ fontSize: 13 }}>
                Nenhuma série registrada.
              </Text>
            )}
          </Card>
        );
      })}

      {!!s.notes && (
        <Card style={{ gap: 4 }}>
          <Text tone="faint" style={{ fontSize: 13, fontWeight: '700' }}>
            Observações
          </Text>
          <Text>{s.notes}</Text>
        </Card>
      )}
      <Text tone="faint" style={{ fontSize: 12 }}>
        Volume estimado = soma de carga × repetições das séries com ambos os valores. Indicadores descrevem o que foi registrado e não garantem resultado.
      </Text>
      <Button title="Voltar ao início" size="lg" onPress={() => router.navigate('/')} />
    </Screen>
  );
}
