import {
  computeProgress,
  elapsedMs,
  EQUIPMENT_LABELS,
  formatClock,
  formatKg,
  formatReps,
  MUSCLE_GROUP_LABELS,
  restState,
  TECHNIQUE_LABELS,
  type ExerciseDTO,
  type SessionCommand,
  type SessionDTO,
  type SessionExerciseDTO,
  type SetLogDTO,
} from '@forja/core';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExercisePicker } from '@/components/exercise-picker';
import { Stepper } from '@/components/stepper';
import { Badge, Banner, Button, Field, haptic, Icon, Input, Loading, Overline, Row, Text, Title } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { parseNum, toBr } from '@/lib/format';
import { useMe } from '@/lib/me';
import { syncRestAlarm } from '@/lib/notifications';
import { radius, useTheme } from '@/lib/theme';

interface Draft {
  load: string;
  reps: string;
  notes: string;
}

const fmtSet = (s: { loadKg: number | null; reps: number | null }) => `${s.loadKg == null ? '— kg' : formatKg(s.loadKg)} × ${s.reps ?? '—'}`;

/** Sugestão para a próxima série: última desta sessão → mesma série da vez anterior → plano. */
function defaultDraft(ex: SessionExerciseDTO): Draft {
  const last = ex.sets.at(-1);
  const prev = ex.previous?.sets[ex.sets.length] ?? ex.previous?.sets.at(-1);
  const load = last?.loadKg ?? prev?.loadKg ?? ex.targetLoadKg;
  const reps = last?.reps ?? prev?.reps ?? ex.repsMax;
  return { load: load == null ? '' : toBr(load), reps: reps == null ? '' : String(reps), notes: '' };
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [session, setSession] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.sessions
      .get(id)
      .then((s) => (s.status === 'completed' || s.status === 'abandoned' ? router.replace(`/resumo/${id}`) : setSession(s)))
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error)
    return (
      <SafeAreaView style={{ flex: 1, padding: 16, gap: 12 }}>
        <Banner>{error}</Banner>
        <Button title="Voltar" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  if (!session) return <Loading label="Carregando treino…" />;
  return <Player initial={session} />;
}

/**
 * Tela acesa durante o treino. Libera só se a ativação de fato ocorreu (no
 * navegador ela pode falhar ou demorar, e liberar antes lançaria erro).
 */
function useScreenAwake() {
  useEffect(() => {
    const tag = 'forja-session';
    let active = false;
    let disposed = false;
    activateKeepAwakeAsync(tag)
      .then(() => {
        active = true;
        if (disposed) void deactivateKeepAwake(tag).catch(() => {});
      })
      .catch(() => {});
    return () => {
      disposed = true;
      if (active) void deactivateKeepAwake(tag).catch(() => {});
    };
  }, []);
}

function Player({ initial }: { initial: SessionDTO }) {
  useScreenAwake();
  const { colors } = useTheme();
  const { me } = useMe();
  const restAlerts = me?.preferences.restAlerts ?? true;

  const [session, setSession] = useState(initial);
  const [skew, setSkew] = useState(() => Date.parse(initial.serverNow) - Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [extraSet, setExtraSet] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<{ ex: SessionExerciseDTO; set: SetLogDTO } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [substituting, setSubstituting] = useState<SessionExerciseDTO | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [restDone, setRestDone] = useState(false);
  const alertedFor = useRef<string | null>(null);
  const chipsRef = useRef<ScrollViewInstance>(null);

  // -------------------------------------------------------------- relógio e sincronização
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const apply = useCallback((s: SessionDTO) => {
    setSkew(Date.parse(s.serverNow) - Date.now());
    if (s.status === 'completed' || s.status === 'abandoned') router.replace(`/resumo/${s.id}`);
    else setSession(s);
  }, []);

  // Ao voltar para o app, recarrega do servidor (o tempo continua certo porque vem de timestamps).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNow(Date.now());
        api.sessions.get(session.id).then(apply).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [session.id, apply]);

  const serverNow = now + skew;
  const elapsed = elapsedMs(
    {
      startedAt: Date.parse(session.startedAt),
      endedAt: session.endedAt ? Date.parse(session.endedAt) : null,
      pausedAt: session.pausedAt ? Date.parse(session.pausedAt) : null,
      pausedTotalMs: session.pausedTotalMs,
    },
    serverNow,
  );
  const rest = restState(
    { endsAt: session.rest.endsAt ? Date.parse(session.rest.endsAt) : null, pausedRemainingMs: session.rest.pausedRemainingMs },
    serverNow,
  );
  const progress = computeProgress(session.exercises.map((e) => ({ plannedSets: e.plannedSets, loggedSets: e.sets.length, skipped: e.skipped })));
  const idx = Math.min(session.currentIndex, session.exercises.length - 1);
  const ex = session.exercises[idx]!;
  const isPaused = session.status === 'paused';
  const isLast = idx === session.exercises.length - 1;
  const remainingSets = progress.total - progress.done;

  // Alarme local do fim do descanso (toca com o app em segundo plano).
  const restEndsAt = rest.state === 'running' ? session.rest.endsAt : null;
  useEffect(() => {
    void syncRestAlarm(restEndsAt, ex.name, restAlerts);
  }, [restEndsAt, ex.name, restAlerts]);
  useEffect(() => () => void syncRestAlarm(null, '', false), []);

  // Aviso em primeiro plano quando o descanso termina naturalmente.
  useEffect(() => {
    const endsAt = session.rest.endsAt;
    if (!endsAt || alertedFor.current === endsAt) return;
    const overBy = serverNow - Date.parse(endsAt);
    if (overBy >= 0) {
      alertedFor.current = endsAt;
      if (overBy > 10_000) return;
      if (restAlerts) haptic('warning');
      setRestDone(true);
      const t = setTimeout(() => setRestDone(false), 4000);
      return () => clearTimeout(t);
    }
  }, [serverNow, session.rest.endsAt, restAlerts]);

  // -------------------------------------------------------------- comandos
  const send = useCallback(
    async (cmd: SessionCommand, tag: string = cmd.type) => {
      setPending(tag);
      setError(null);
      try {
        const s = await api.sessions.command(session.id, cmd);
        apply(s);
        return s;
      } catch (err) {
        setError(errorMessage(err));
        return null;
      } finally {
        setPending(null);
      }
    },
    [session.id, apply],
  );

  const draft = drafts[ex.id] ?? defaultDraft(ex);
  const setDraft = (p: Partial<Draft>) => setDrafts((d) => ({ ...d, [ex.id]: { ...draft, ...p } }));
  const step = (key: 'load' | 'reps', delta: number) => {
    const next = Math.max(0, Math.round(((parseNum(draft[key]) ?? 0) + delta) * 100) / 100);
    setDraft({ [key]: toBr(next) });
  };

  async function logSet() {
    const s = await send({ type: 'logSet', sessionExerciseId: ex.id, loadKg: parseNum(draft.load), reps: parseNum(draft.reps), notes: draft.notes }, 'logSet');
    if (s) {
      haptic('success');
      setDrafts(({ [ex.id]: _, ...rest }) => rest);
      setExtraSet((m) => ({ ...m, [ex.id]: false }));
    }
  }

  async function goTo(i: number) {
    await send({ type: 'goTo', index: i }, `goTo-${i}`);
    chipsRef.current?.scrollTo({ x: Math.max(0, i * 150 - 60), animated: true });
  }

  const allPlannedDone = ex.sets.length >= ex.plannedSets;
  const showInputRow = !allPlannedDone || extraSet[ex.id];
  const restPct = useMemo(() => {
    const total = (session.rest.durationSec ?? 0) * 1000;
    return total > 0 ? Math.min(100, Math.max(0, (rest.remainingMs / total) * 100)) : 0;
  }, [rest.remainingMs, session.rest.durationSec]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* ------------------------------------------------ topo */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 }}>
          <Row>
            <Button icon="close" variant="ghost" square accessibilityLabel="Sair do modo treino (o treino continua salvo)" onPress={() => router.back()} />
            <View style={{ flex: 1 }}>
              <Overline tone="muted" style={{ fontSize: 11 }} numberOfLines={1}>
                {session.workoutName}
              </Overline>
              <Text style={{ fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }} accessibilityLabel={`Tempo de treino ${formatClock(elapsed)}`}>
                {formatClock(elapsed)}
              </Text>
            </View>
            <Button
              icon={isPaused ? 'play' : 'pause'}
              variant="secondary"
              size="lg"
              square
              accessibilityLabel={isPaused ? 'Retomar treino' : 'Pausar treino'}
              loading={pending === 'pause' || pending === 'resume'}
              onPress={() => send({ type: isPaused ? 'resume' : 'pause' })}
            />
            <Button icon="flag" variant="secondary" size="lg" square accessibilityLabel="Finalizar treino" onPress={() => setFinishOpen(true)} />
          </Row>
          <Row gap={10}>
            <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.surface3, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress.percent }}>
              <View style={{ width: `${progress.percent}%`, height: '100%', backgroundColor: colors.accent, borderRadius: 4 }} />
            </View>
            <Text style={{ width: 44, textAlign: 'right', fontWeight: '800', fontVariant: ['tabular-nums'] }}>{progress.percent}%</Text>
          </Row>
          <ScrollView ref={chipsRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {session.exercises.map((e, i) => {
              const done = e.skipped || e.sets.length >= e.plannedSets;
              const cur = i === idx;
              return (
                <Pressable
                  key={e.id}
                  disabled={isPaused || cur}
                  onPress={() => goTo(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: cur }}
                  style={{
                    height: 36,
                    maxWidth: 170,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    borderWidth: 1,
                    borderColor: cur ? colors.accent : done ? `${colors.success}66` : colors.line,
                    backgroundColor: cur ? colors.accent : done ? `${colors.success}1a` : 'transparent',
                  }}
                >
                  {done && !cur ? <Icon name="checkmark" size={14} color={colors.success} /> : <Text style={{ fontSize: 12, fontWeight: '800', color: cur ? colors.accentInk : colors.muted }}>{i + 1}</Text>}
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '700', color: cur ? colors.accentInk : done ? colors.success : colors.muted, flexShrink: 1 }}>
                    {e.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ------------------------------------------------ exercício atual */}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {error && <Banner>{error}</Banner>}
          <View style={{ gap: 6 }}>
            <Overline>
              Exercício {idx + 1} de {session.exercises.length}
            </Overline>
            <Title size={32}>{ex.name}</Title>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>
              <Text tone="muted" style={{ fontSize: 14 }}>
                {MUSCLE_GROUP_LABELS[ex.muscleGroup]} · {EQUIPMENT_LABELS[ex.equipment]}
              </Text>
              {ex.technique !== 'normal' && <Badge label={TECHNIQUE_LABELS[ex.technique]} tone="accent" />}
              {ex.originalExerciseId && <Badge label="Substituído" tone="warning" />}
              {ex.skipped && <Badge label="Pulado" tone="warning" />}
            </Row>
          </View>

          <Row gap={8}>
            {[
              ['Séries', String(ex.plannedSets)],
              ['Reps', formatReps(ex.repsMin, ex.repsMax)],
              ['Descanso', ex.restSeconds ? formatClock(ex.restSeconds * 1000) : '—'],
            ].map(([k, v]) => (
              <View key={k} style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, paddingVertical: 8, alignItems: 'center' }}>
                <Text tone="faint" style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  {k}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{v}</Text>
              </View>
            ))}
          </Row>

          {(!!ex.notes || ex.targetLoadKg != null) && (
            <Text tone="muted" style={{ fontSize: 14 }}>
              {ex.targetLoadKg != null && (
                <>
                  Carga alvo: <Text style={{ fontWeight: '800', fontSize: 14 }}>{formatKg(ex.targetLoadKg)}</Text>.{' '}
                </>
              )}
              {ex.notes}
            </Text>
          )}
          {ex.previous && (
            <Text tone="muted" style={{ fontSize: 14 }}>
              <Text style={{ fontWeight: '800', fontSize: 14 }}>Última vez</Text> (
              {new Date(ex.previous.performedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}): {ex.previous.sets.map(fmtSet).join(' · ') || 'sem séries'}
            </Text>
          )}
          {!!ex.instructions && (
            <Pressable onPress={() => setShowInstructions((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showInstructions }}>
              <Row gap={4}>
                <Text tone="accent" style={{ fontWeight: '700', fontSize: 14 }}>
                  Como executar
                </Text>
                <Icon name={showInstructions ? 'chevron-up' : 'chevron-down'} size={16} color={colors.accent} />
              </Row>
            </Pressable>
          )}
          {showInstructions && (
            <View style={{ backgroundColor: colors.surface2, borderRadius: radius.md, padding: 12 }}>
              <Text tone="muted" style={{ fontSize: 14 }}>
                {ex.instructions}
              </Text>
            </View>
          )}

          {/* séries registradas */}
          {ex.sets.map((s) => (
            <Row key={s.id} gap={12} style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: `${colors.success}4d`, backgroundColor: `${colors.success}0d`, padding: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="checkmark" size={18} color={colors.bg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text tone="faint" style={{ fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                  Série {s.setNumber}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{fmtSet(s)}</Text>
                {!!s.notes && (
                  <Text tone="muted" style={{ fontSize: 12 }}>
                    {s.notes}
                  </Text>
                )}
              </View>
              {s.revision > 1 && <Badge label="Editada" />}
              <Button icon="create-outline" variant="ghost" square accessibilityLabel={`Editar série ${s.setNumber}`} onPress={() => setEditing({ ex, set: s })} />
            </Row>
          ))}

          {/* série atual */}
          {showInputRow && (
            <View style={{ borderRadius: radius.lg, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentSoft, padding: 12, gap: 12 }}>
              <Overline style={{ fontSize: 11 }}>
                Série {ex.sets.length + 1}
                {ex.sets.length + 1 > ex.plannedSets ? ' (extra)' : ''} · meta {formatReps(ex.repsMin, ex.repsMax)} reps
              </Overline>
              <Row gap={10}>
                <Stepper big label="Carga (kg)" decimal placeholder="—" value={draft.load} onChange={(v) => setDraft({ load: v })} onStep={(d) => step('load', d * 2.5)} />
                <Stepper big label="Repetições" value={draft.reps} onChange={(v) => setDraft({ reps: v })} onStep={(d) => step('reps', d)} />
              </Row>
              <Input placeholder="Observação da série (opcional)" value={draft.notes} onChangeText={(notes) => setDraft({ notes })} maxLength={300} />
              <Button title="Finalizar série" icon="checkmark" size="xl" onPress={logSet} loading={pending === 'logSet'} disabled={isPaused} />
              {draft.load.trim() === '' && (
                <Text tone="muted" style={{ fontSize: 12 }}>
                  Sem carga informada: a série fica fora do cálculo de volume.
                </Text>
              )}
            </View>
          )}

          {/* séries futuras */}
          {Array.from({ length: Math.max(0, ex.plannedSets - ex.sets.length - 1) }, (_, i) => (
            <Row key={`p${i}`} gap={12} style={{ borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, padding: 12 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
                <Text tone="faint" style={{ fontWeight: '800' }}>
                  {ex.sets.length + i + 2}
                </Text>
              </View>
              <Text tone="faint">{formatReps(ex.repsMin, ex.repsMax)} reps</Text>
            </Row>
          ))}

          {allPlannedDone && !extraSet[ex.id] && (
            <View style={{ gap: 8 }}>
              <Text tone="success" style={{ textAlign: 'center', fontWeight: '700' }}>
                Séries planejadas concluídas
              </Text>
              {isLast ? (
                <Button title="Finalizar treino" icon="flag" size="xl" onPress={() => setFinishOpen(true)} />
              ) : (
                <Button title="Próximo exercício" icon="chevron-forward" size="xl" onPress={() => goTo(idx + 1)} loading={pending === `goTo-${idx + 1}`} disabled={isPaused} />
              )}
              <Button title="Série extra" icon="add" variant="ghost" onPress={() => setExtraSet((m) => ({ ...m, [ex.id]: true }))} />
            </View>
          )}

          <Row style={{ flexWrap: 'wrap' }}>
            {ex.sets.length === 0 && <Button title="Substituir exercício" icon="swap-horizontal" variant="secondary" size="sm" disabled={isPaused} onPress={() => setSubstituting(ex)} />}
            {!allPlannedDone && (
              <Button
                title={ex.skipped ? 'Desfazer pulo' : 'Pular exercício'}
                icon="play-skip-forward"
                variant="ghost"
                size="sm"
                disabled={isPaused}
                loading={pending === 'setSkipped'}
                onPress={() => send({ type: 'setSkipped', sessionExerciseId: ex.id, skipped: !ex.skipped })}
              />
            )}
          </Row>
        </ScrollView>

        {/* ------------------------------------------------ rodapé: descanso / navegação */}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.surface, padding: 12, gap: 10 }}>
          {rest.state !== 'idle' ? (
            <>
              <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <View accessibilityRole="timer" accessibilityLabel={`Descanso restante ${formatClock(rest.remainingMs)}`}>
                  <Overline style={{ fontSize: 11 }}>{rest.state === 'paused' ? 'Descanso pausado' : 'Descanso'}</Overline>
                  <Text style={{ fontSize: 46, fontWeight: '900', lineHeight: 50, fontVariant: ['tabular-nums'] }}>{formatClock(rest.remainingMs)}</Text>
                </View>
                <Button title="Pular" icon="play-skip-forward" size="lg" disabled={isPaused} onPress={() => send({ type: 'restSkip' })} />
              </Row>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surface3, overflow: 'hidden' }}>
                <View style={{ width: `${restPct}%`, height: '100%', backgroundColor: colors.accent }} />
              </View>
              <Row gap={8}>
                <Button title="15s" icon="remove" variant="secondary" size="lg" style={{ flex: 1 }} accessibilityLabel="Menos 15 segundos" disabled={isPaused} onPress={() => send({ type: 'restAdd', seconds: -15 })} />
                <Button
                  icon={rest.state === 'paused' ? 'play' : 'pause'}
                  variant="secondary"
                  size="lg"
                  style={{ flex: 1 }}
                  accessibilityLabel={rest.state === 'paused' ? 'Retomar descanso' : 'Pausar descanso'}
                  disabled={isPaused}
                  onPress={() => send({ type: rest.state === 'paused' ? 'restResume' : 'restPause' })}
                />
                <Button title="15s" icon="add" variant="secondary" size="lg" style={{ flex: 1 }} accessibilityLabel="Mais 15 segundos" disabled={isPaused} onPress={() => send({ type: 'restAdd', seconds: 15 })} />
              </Row>
            </>
          ) : (
            <Row>
              <Button icon="chevron-back" variant="secondary" size="lg" square accessibilityLabel="Exercício anterior" disabled={idx === 0 || isPaused} onPress={() => goTo(idx - 1)} />
              <Text accessibilityLiveRegion="polite" tone={restDone ? 'accent' : 'muted'} style={{ flex: 1, textAlign: 'center', fontWeight: restDone ? '800' : '500' }}>
                {restDone ? 'Descanso concluído — bora!' : remainingSets > 0 ? `${remainingSets} séries restantes` : 'Tudo registrado'}
              </Text>
              <Button icon="chevron-forward" variant="secondary" size="lg" square accessibilityLabel="Próximo exercício" disabled={isLast || isPaused} onPress={() => goTo(idx + 1)} />
            </Row>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* ------------------------------------------------ treino pausado */}
      {isPaused && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: `${colors.bg}f2`, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 18 }}>
          <Title size={40} style={{ textAlign: 'center' }}>
            Treino pausado
          </Title>
          <Text tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            Tempo de treino: {formatClock(elapsed)}
          </Text>
          <Button title="Retomar treino" icon="play" size="xl" style={{ alignSelf: 'stretch' }} loading={pending === 'resume'} onPress={() => send({ type: 'resume' })} />
          <Button title="Finalizar treino" variant="ghost" onPress={() => setFinishOpen(true)} />
          {error && <Banner>{error}</Banner>}
        </View>
      )}

      <EditSetModal
        target={editing}
        pending={pending === 'editSet'}
        onClose={() => setEditing(null)}
        onSave={async (v) => {
          if (!editing) return;
          if (await send({ type: 'editSet', setId: editing.set.id, ...v })) setEditing(null);
        }}
      />
      <FinishModal visible={finishOpen} remainingSets={remainingSets} pending={pending === 'finish'} onClose={() => setFinishOpen(false)} onFinish={(notes) => send({ type: 'finish', notes })} />
      <ExercisePicker
        visible={!!substituting}
        title="Substituir exercício"
        initialMuscle={substituting?.muscleGroup}
        onClose={() => setSubstituting(null)}
        onPick={async ([target]: ExerciseDTO[]) => {
          if (!substituting || !target) return;
          if (await send({ type: 'substitute', sessionExerciseId: substituting.id, exerciseId: target.id })) setSubstituting(null);
        }}
      />
    </SafeAreaView>
  );
}

function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#000a' }}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, gap: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Title size={22}>{title}</Title>
            <Button icon="close" variant="ghost" square accessibilityLabel="Fechar" onPress={onClose} />
          </Row>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function EditSetModal({
  target,
  pending,
  onClose,
  onSave,
}: {
  target: { ex: SessionExerciseDTO; set: SetLogDTO } | null;
  pending: boolean;
  onClose: () => void;
  onSave: (v: { loadKg: number | null; reps: number | null; notes: string }) => void;
}) {
  const [load, setLoad] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (!target) return;
    setLoad(target.set.loadKg == null ? '' : toBr(target.set.loadKg));
    setReps(target.set.reps == null ? '' : String(target.set.reps));
    setNotes(target.set.notes);
  }, [target]);
  return (
    <Sheet visible={!!target} onClose={onClose} title={`Editar série ${target?.set.setNumber ?? ''}`}>
      <Text tone="muted" style={{ fontSize: 14 }}>
        {target?.ex.name}. O valor anterior fica guardado no histórico da série.
      </Text>
      <Row gap={10}>
        <Stepper label="Carga (kg)" decimal placeholder="—" value={load} onChange={setLoad} onStep={(d) => setLoad(toBr(Math.max(0, (parseNum(load) ?? 0) + d * 2.5)))} />
        <Stepper label="Repetições" value={reps} onChange={setReps} onStep={(d) => setReps(String(Math.max(0, (parseNum(reps) ?? 0) + d)))} />
      </Row>
      <Field label="Observação">
        <Input value={notes} onChangeText={setNotes} maxLength={300} />
      </Field>
      <Button title="Salvar" size="lg" loading={pending} onPress={() => onSave({ loadKg: parseNum(load), reps: parseNum(reps), notes })} />
    </Sheet>
  );
}

function FinishModal({
  visible,
  remainingSets,
  pending,
  onClose,
  onFinish,
}: {
  visible: boolean;
  remainingSets: number;
  pending: boolean;
  onClose: () => void;
  onFinish: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  return (
    <Sheet visible={visible} onClose={onClose} title="Finalizar treino?">
      {remainingSets > 0 ? (
        <Banner tone="warning">{`Ainda há ${remainingSets} ${remainingSets === 1 ? 'série planejada' : 'séries planejadas'} sem registro. Elas não serão contadas.`}</Banner>
      ) : (
        <Banner tone="success">Todas as séries planejadas foram registradas.</Banner>
      )}
      <Field label="Como foi o treino? (opcional)">
        <Input value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholder="Energia, dores, ajustes para a próxima…" style={{ minHeight: 80, paddingTop: 12 }} />
      </Field>
      <Button title="Finalizar treino" icon="flag" size="lg" loading={pending} onPress={() => onFinish(notes)} />
      <Button title="Continuar treinando" variant="ghost" onPress={onClose} />
    </Sheet>
  );
}
