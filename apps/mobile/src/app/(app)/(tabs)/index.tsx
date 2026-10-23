import { formatDuration, formatKg, WEEKDAY_LONG, WEEKDAY_SHORT, type WorkoutSummaryDTO } from '@forja/core';
import { Link, router } from 'expo-router';
import { RefreshControl, View } from 'react-native';
import { ActiveSessionBanner } from '@/components/active-session';
import { BrandLogo } from '@/components/brand';
import { StartWorkoutButton } from '@/components/start-button';
import { Banner, Button, Card, Icon, Loading, Overline, Row, Screen, Text, Title, type IconName } from '@/components/ui';
import { api } from '@/lib/api';
import { useTheme } from '@/lib/theme';
import { useApiOnFocus } from '@/lib/use-api';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Stat({ icon, label, value, hint }: { icon: IconName; label: string; value: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <Card style={{ flex: 1, minWidth: '45%', padding: 14 }}>
      <Row gap={6}>
        <Icon name={icon} size={16} color={colors.faint} />
        <Overline tone="faint" style={{ fontSize: 11 }}>
          {label}
        </Overline>
      </Row>
      <Text style={{ fontSize: 28, fontWeight: '900', marginTop: 6, fontVariant: ['tabular-nums'] }}>{value}</Text>
      {hint && (
        <Text tone="faint" style={{ fontSize: 12 }}>
          {hint}
        </Text>
      )}
    </Card>
  );
}

function WorkoutLine({ w }: { w: WorkoutSummaryDTO }) {
  const { colors } = useTheme();
  return (
    <Row gap={12}>
      {!!w.label && (
        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text tone="accent" style={{ fontSize: 20, fontWeight: '900' }}>
            {w.label}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', fontSize: 17 }} numberOfLines={1}>
          {w.name}
        </Text>
        <Text tone="faint" style={{ fontSize: 13 }}>
          {w.exerciseCount} exercícios · {w.totalSets} séries
        </Text>
      </View>
    </Row>
  );
}

export default function Dashboard() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data, error, loading, reload } = useApiOnFocus(() => api.dashboard(tz));

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}>
      <BrandLogo size={18} />
      {error && <Banner>{error}</Banner>}
      {!data ? (
        !error && <Loading />
      ) : (
        <>
          <View>
            <Overline>{WEEKDAY_LONG[data.todayWeekday]}</Overline>
            <Title size={34}>
              {greeting()}, {data.userName.split(' ')[0]}
            </Title>
          </View>

          <ActiveSessionBanner onChange={reload} />

          {!data.activeSession && (
            <Card style={{ gap: 14 }}>
              {data.todayWorkouts[0] ? (
                <>
                  <Overline tone="muted">Treino de hoje</Overline>
                  <WorkoutLine w={data.todayWorkouts[0]} />
                  <StartWorkoutButton workoutId={data.todayWorkouts[0].id} />
                </>
              ) : data.hasWorkouts ? (
                <>
                  <Overline tone="muted">Hoje</Overline>
                  <Text>Nenhum treino programado para hoje.</Text>
                  <Button title="Escolher um treino" variant="secondary" onPress={() => router.push('/treinos')} />
                </>
              ) : (
                <>
                  <Title size={22}>Monte sua primeira ficha</Title>
                  <Text tone="muted">Crie um treino com os exercícios da biblioteca e programe os dias da semana.</Text>
                  <Button title="Criar treino" icon="add" onPress={() => router.push('/treino/novo')} />
                </>
              )}
            </Card>
          )}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Stat icon="flame" label="Sequência" value={`${data.stats.streakDays} ${data.stats.streakDays === 1 ? 'dia' : 'dias'}`} />
            <Stat icon="trophy" label="Concluídos" value={String(data.stats.completedSessions)} hint="treinos no total" />
            <Stat icon="timer" label="Tempo total" value={formatDuration(data.stats.totalTrainingMs)} />
            <Stat
              icon="calendar"
              label="Semana"
              value={data.stats.weekPlannedDays ? `${data.stats.weekSessions}/${data.stats.weekPlannedDays}` : String(data.stats.weekSessions)}
              hint={data.stats.weekPlannedDays ? 'treinos / dias programados' : 'programe dias nos treinos'}
            />
          </View>

          <Card style={{ gap: 8 }}>
            <Title size={18}>Último treino</Title>
            {data.lastSession ? (
              <Link href={`/resumo/${data.lastSession.id}`}>
                <View>
                  <Text style={{ fontWeight: '700' }}>{data.lastSession.workoutName}</Text>
                  <Text tone="muted" style={{ fontSize: 14 }}>
                    {new Date(data.lastSession.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })} ·{' '}
                    {formatDuration(data.lastSession.durationMs)} · {data.lastSession.setCount} séries
                    {data.lastSession.volumeKg > 0 ? ` · ${formatKg(data.lastSession.volumeKg)}` : ''}
                  </Text>
                </View>
              </Link>
            ) : (
              <Text tone="muted">Você ainda não concluiu nenhum treino.</Text>
            )}
          </Card>

          <Card style={{ gap: 10 }}>
            <Title size={18}>Próximos treinos</Title>
            {data.upcoming.length ? (
              data.upcoming.map((u) => (
                <Row key={`${u.date}-${u.workout.id}`} gap={12}>
                  <Text tone="faint" style={{ width: 40, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' }}>
                    {WEEKDAY_SHORT[u.weekday]}
                  </Text>
                  <Text style={{ flex: 1 }} numberOfLines={1}>
                    {u.workout.label ? <Text tone="accent">{u.workout.label} · </Text> : null}
                    {u.workout.name}
                  </Text>
                </Row>
              ))
            ) : (
              <Text tone="muted">Programe dias da semana nos seus treinos para vê-los aqui.</Text>
            )}
          </Card>

          {!data.hasWorkouts && (
            <Banner tone="info">A biblioteca vem com exercícios marcados como DEMO para você testar. Seus treinos e registros começam vazios.</Banner>
          )}
        </>
      )}
    </Screen>
  );
}
