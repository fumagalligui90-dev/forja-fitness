'use client';

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
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flag,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat2,
  SkipForward,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { keepScreenOn, notifyRestOver, requestNotificationPermission, unlockAudio } from '@/lib/alerts';
import { restAlertsEnabled } from '@/lib/preferences';
import { ExercisePicker } from './exercise-picker';
import { Alert, Badge, Button, cn, Dialog, Field, Input, Textarea } from './ui';

interface Draft {
  load: string;
  reps: string;
  notes: string;
}

const parseNum = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() === '' || Number.isNaN(n) ? null : n;
};
const fmtSet = (s: { loadKg: number | null; reps: number | null }) =>
  `${s.loadKg == null ? '— kg' : formatKg(s.loadKg)} × ${s.reps ?? '—'}`;

/** Valores sugeridos para a próxima série: última desta sessão → mesma série da vez anterior → plano. */
function defaultDraft(ex: SessionExerciseDTO): Draft {
  const last = ex.sets.at(-1);
  const prev = ex.previous?.sets[ex.sets.length] ?? ex.previous?.sets.at(-1);
  const load = last?.loadKg ?? prev?.loadKg ?? ex.targetLoadKg;
  const reps = last?.reps ?? prev?.reps ?? ex.repsMax;
  return { load: load == null ? '' : String(load).replace('.', ','), reps: reps == null ? '' : String(reps), notes: '' };
}

export function WorkoutPlayer({ initial }: { initial: SessionDTO }) {
  const router = useRouter();
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
  const [notifPerm, setNotifPerm] = useState<string>('default');
  const [restDoneFlash, setRestDoneFlash] = useState(false);
  const alertedFor = useRef<string | null>(null);
  const draftKey = `forja:draft:${session.id}`;

  // ---------------------------------------------------------------- relógio
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const t = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  useEffect(() => keepScreenOn(), []);
  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) setDrafts(JSON.parse(saved));
    } catch {}
  }, [draftKey]);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(drafts));
    } catch {}
  }, [drafts, draftKey]);

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
  const progress = computeProgress(
    session.exercises.map((e) => ({ plannedSets: e.plannedSets, loggedSets: e.sets.length, skipped: e.skipped })),
  );
  const idx = Math.min(session.currentIndex, session.exercises.length - 1);
  const ex = session.exercises[idx]!;
  const isPaused = session.status === 'paused';

  // Ao voltar para a aba/app, sincroniza com o servidor (o treino pode ter
  // mudado em outro dispositivo ou aba).
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'visible') return;
      api<SessionDTO>(`/sessions/${session.id}`)
        .then((s) => {
          setSkew(Date.parse(s.serverNow) - Date.now());
          if (s.status === 'completed' || s.status === 'abandoned') router.replace(`/app/sessao/${s.id}/resumo`);
          else setSession(s);
        })
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [session.id, router]);

  // Mantém o chip do exercício atual visível na faixa de navegação.
  useEffect(() => {
    document
      .querySelector('nav[aria-label="Exercícios do treino"] [aria-current="step"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [idx]);

  // Aviso único quando o descanso termina naturalmente (não ao pular).
  useEffect(() => {
    const endsAt = session.rest.endsAt;
    if (!endsAt || alertedFor.current === endsAt) return;
    const overBy = serverNow - Date.parse(endsAt);
    if (overBy >= 0) {
      alertedFor.current = endsAt;
      // Ao reabrir o app muito depois do fim do descanso, não toca alarme atrasado.
      if (overBy > 10_000) return;
      if (restAlertsEnabled()) notifyRestOver(ex.name);
      setRestDoneFlash(true);
      const t = setTimeout(() => setRestDoneFlash(false), 4000);
      return () => clearTimeout(t);
    }
  }, [serverNow, session.rest.endsAt, ex.name]);

  // ---------------------------------------------------------------- comandos
  const send = useCallback(
    async (cmd: SessionCommand, tag: string = cmd.type) => {
      setPending(tag);
      setError(null);
      try {
        const s = await api<SessionDTO>(`/sessions/${session.id}/commands`, { method: 'POST', body: cmd });
        setSkew(Date.parse(s.serverNow) - Date.now());
        setSession(s);
        return s;
      } catch (err) {
        setError(errorMessage(err));
        return null;
      } finally {
        setPending(null);
      }
    },
    [session.id],
  );

  const draft = drafts[ex.id] ?? defaultDraft(ex);
  const setDraft = (patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [ex.id]: { ...draft, ...patch } }));
  const step = (key: 'load' | 'reps', delta: number) => {
    const cur = parseNum(draft[key]) ?? 0;
    const next = Math.max(0, Math.round((cur + delta) * 100) / 100);
    setDraft({ [key]: String(next).replace('.', ',') });
  };

  async function logSet() {
    unlockAudio();
    const s = await send(
      { type: 'logSet', sessionExerciseId: ex.id, loadKg: parseNum(draft.load), reps: parseNum(draft.reps), notes: draft.notes },
      'logSet',
    );
    if (s) {
      // Próxima série parte dos valores recém-registrados.
      setDrafts((d) => {
        const { [ex.id]: _, ...rest } = d;
        return rest;
      });
      setExtraSet((m) => ({ ...m, [ex.id]: false }));
    }
  }

  async function finish(notes: string) {
    const s = await send({ type: 'finish', notes });
    if (s) {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
      router.replace(`/app/sessao/${session.id}/resumo`);
    }
  }

  const allPlannedDone = ex.sets.length >= ex.plannedSets;
  const showInputRow = !allPlannedDone || extraSet[ex.id];
  const isLast = idx === session.exercises.length - 1;
  const remainingSets = progress.total - progress.done;

  const restPct = useMemo(() => {
    const total = (session.rest.durationSec ?? 0) * 1000;
    return total > 0 ? Math.min(100, Math.max(0, (rest.remainingMs / total) * 100)) : 0;
  }, [rest.remainingMs, session.rest.durationSec]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      {/* ------------------------------------------------ topo */}
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/app" aria-label="Sair do modo treino (o treino continua salvo)" className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2">
            <X className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted">{session.workoutName}</p>
            <p className="tabular font-display text-3xl font-bold leading-none" aria-label="Tempo de treino">
              {formatClock(elapsed)}
            </p>
          </div>
          {notifPerm === 'default' && (
            <button
              onClick={async () => setNotifPerm(await requestNotificationPermission())}
              aria-label="Ativar aviso de fim do descanso"
              className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2"
            >
              <BellOff className="size-5" />
            </button>
          )}
          {notifPerm === 'granted' && <Bell className="mx-3 size-4 text-faint" aria-label="Avisos ativados" />}
          <Button
            variant="secondary"
            size="lg"
            icon
            aria-label={isPaused ? 'Retomar treino' : 'Pausar treino'}
            loading={pending === 'pause' || pending === 'resume'}
            onClick={() => send({ type: isPaused ? 'resume' : 'pause' })}
          >
            {pending !== 'pause' && pending !== 'resume' && (isPaused ? <Play className="size-5" /> : <Pause className="size-5" />)}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => setFinishOpen(true)} aria-label="Finalizar treino" icon>
            <Flag className="size-5" />
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do treino">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
          </div>
          <span className="tabular w-12 text-right text-sm font-bold">{progress.percent}%</span>
        </div>
        {/* navegação entre exercícios */}
        <nav className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Exercícios do treino">
          {session.exercises.map((e, i) => {
            const done = e.skipped || e.sets.length >= e.plannedSets;
            return (
              <button
                key={e.id}
                onClick={() => i !== idx && send({ type: 'goTo', index: i }, `goTo-${i}`)}
                disabled={isPaused}
                aria-current={i === idx ? 'step' : undefined}
                className={cn(
                  'flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition',
                  i === idx ? 'border-accent bg-accent text-accent-ink' : done ? 'border-success/40 bg-success/10 text-success' : 'border-line text-muted',
                  e.skipped && i !== idx && 'line-through opacity-60',
                )}
              >
                {done && i !== idx ? <Check className="size-3.5" /> : <span>{i + 1}</span>}
                <span className="max-w-[9rem] truncate">{e.name}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* ------------------------------------------------ exercício atual */}
      <main className="flex-1 px-4 pb-48 pt-4">
        {error && (
          <div className="mb-3">
            <Alert>{error}</Alert>
          </div>
        )}

        <div key={ex.id} className="animate-rise">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Exercício {idx + 1} de {session.exercises.length}
          </p>
          <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-none tracking-wide">{ex.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {MUSCLE_GROUP_LABELS[ex.muscleGroup]} · {EQUIPMENT_LABELS[ex.equipment]}
            {ex.technique !== 'normal' && <Badge tone="accent">{TECHNIQUE_LABELS[ex.technique]}</Badge>}
            {ex.originalExerciseId && <Badge tone="warning">Substituído</Badge>}
            {ex.skipped && <Badge tone="warning">Pulado</Badge>}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              ['Séries', String(ex.plannedSets)],
              ['Reps', formatReps(ex.repsMin, ex.repsMax)],
              ['Descanso', ex.restSeconds ? formatClock(ex.restSeconds * 1000) : '—'],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-surface-2 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-faint">{k}</p>
                <p className="tabular font-display text-xl font-bold">{v}</p>
              </div>
            ))}
          </div>

          {(ex.notes || ex.targetLoadKg != null) && (
            <p className="mt-3 text-sm text-muted">
              {ex.targetLoadKg != null && <>Carga alvo: <strong className="text-text">{formatKg(ex.targetLoadKg)}</strong>. </>}
              {ex.notes}
            </p>
          )}
          {ex.previous && (
            <p className="mt-2 text-sm text-muted">
              <span className="font-semibold text-text">Última vez</span> (
              {new Date(ex.previous.performedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}):{' '}
              {ex.previous.sets.map(fmtSet).join(' · ') || 'sem séries'}
            </p>
          )}
          {ex.instructions && (
            <button onClick={() => setShowInstructions((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent" aria-expanded={showInstructions}>
              Como executar <ChevronDown className={cn('size-4 transition', showInstructions && 'rotate-180')} />
            </button>
          )}
          {showInstructions && <p className="mt-2 rounded-xl bg-surface-2 p-3 text-sm text-muted">{ex.instructions}</p>}

          {/* séries */}
          <ol className="mt-5 flex flex-col gap-2" aria-label="Séries">
            {ex.sets.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/5 px-3 py-2.5">
                <span className="grid size-8 place-items-center rounded-full bg-success text-sm font-bold text-bg">
                  <Check className="size-4" />
                </span>
                <span className="flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-faint">Série {s.setNumber}</span>
                  <span className="tabular block text-lg font-bold">{fmtSet(s)}</span>
                  {s.notes && <span className="block text-xs text-muted">{s.notes}</span>}
                </span>
                {s.revision > 1 && <Badge>Editada</Badge>}
                <button
                  onClick={() => setEditing({ ex, set: s })}
                  aria-label={`Editar série ${s.setNumber}`}
                  className="grid size-11 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-text"
                >
                  <Pencil className="size-4" />
                </button>
              </li>
            ))}

            {showInputRow && (
              <li className="rounded-2xl border-2 border-accent bg-accent-soft p-3" aria-current="step">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-accent">
                  Série {ex.sets.length + 1}
                  {ex.sets.length + 1 > ex.plannedSets && ' (extra)'} · meta {formatReps(ex.repsMin, ex.repsMax)} reps
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Stepper
                    label="Carga (kg)"
                    value={draft.load}
                    placeholder="—"
                    decimal
                    onChange={(v) => setDraft({ load: v })}
                    onStep={(d) => step('load', d * 2.5)}
                  />
                  <Stepper label="Repetições" value={draft.reps} onChange={(v) => setDraft({ reps: v })} onStep={(d) => step('reps', d)} />
                </div>
                <Input
                  className="mt-3"
                  placeholder="Observação da série (opcional)"
                  maxLength={300}
                  value={draft.notes}
                  onChange={(e) => setDraft({ notes: e.target.value })}
                  aria-label="Observação da série"
                />
                <Button size="xl" className="mt-3 w-full" onClick={logSet} loading={pending === 'logSet'} disabled={isPaused}>
                  {pending !== 'logSet' && <Check className="size-6" />} Finalizar série
                </Button>
                {draft.load.trim() === '' && <p className="mt-2 text-xs text-muted">Sem carga informada: a série fica fora do cálculo de volume.</p>}
              </li>
            )}

            {Array.from({ length: Math.max(0, ex.plannedSets - ex.sets.length - 1) }, (_, i) => (
              <li key={`p${i}`} className="flex items-center gap-3 rounded-2xl border border-dashed border-line px-3 py-3 text-faint">
                <span className="grid size-8 place-items-center rounded-full border border-line text-sm font-bold">{ex.sets.length + i + 2}</span>
                <span className="text-sm">{formatReps(ex.repsMin, ex.repsMax)} reps</span>
              </li>
            ))}
          </ol>

          {allPlannedDone && !extraSet[ex.id] && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="text-center text-sm font-semibold text-success">Séries planejadas concluídas</p>
              {isLast ? (
                <Button size="xl" onClick={() => setFinishOpen(true)}>
                  <Flag className="size-5" /> Finalizar treino
                </Button>
              ) : (
                <Button size="xl" onClick={() => send({ type: 'goTo', index: idx + 1 })} loading={pending === 'goTo'} disabled={isPaused}>
                  Próximo exercício <ChevronRight className="size-6" />
                </Button>
              )}
              <Button variant="ghost" onClick={() => setExtraSet((m) => ({ ...m, [ex.id]: true }))}>
                <Plus className="size-4" /> Série extra
              </Button>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {ex.sets.length === 0 && (
              <Button variant="secondary" size="sm" onClick={() => setSubstituting(ex)} disabled={isPaused}>
                <Repeat2 className="size-4" /> Substituir exercício
              </Button>
            )}
            {!allPlannedDone && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isPaused}
                loading={pending === 'setSkipped'}
                onClick={() => send({ type: 'setSkipped', sessionExerciseId: ex.id, skipped: !ex.skipped })}
              >
                <SkipForward className="size-4" /> {ex.skipped ? 'Desfazer pulo' : 'Pular exercício'}
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* ------------------------------------------------ rodapé: descanso + navegação */}
      <footer className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-2xl border-t border-line bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        {rest.state !== 'idle' ? (
          <div role="timer" aria-label="Tempo de descanso restante">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent">{rest.state === 'paused' ? 'Descanso pausado' : 'Descanso'}</p>
                <p className="tabular font-display text-5xl font-bold leading-none">{formatClock(rest.remainingMs)}</p>
              </div>
              <Button size="lg" onClick={() => send({ type: 'restSkip' })} disabled={isPaused}>
                <SkipForward className="size-5" /> Pular
              </Button>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className="h-full bg-accent transition-[width] duration-300 ease-linear" style={{ width: `${restPct}%` }} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button variant="secondary" size="lg" aria-label="Menos 15 segundos" onClick={() => send({ type: 'restAdd', seconds: -15 })} disabled={isPaused}>
                <Minus className="size-4" /> 15s
              </Button>
              <Button
                variant="secondary"
                size="lg"
                aria-label={rest.state === 'paused' ? 'Retomar descanso' : 'Pausar descanso'}
                onClick={() => send({ type: rest.state === 'paused' ? 'restResume' : 'restPause' })}
                disabled={isPaused}
              >
                {rest.state === 'paused' ? <Play className="size-5" /> : <Pause className="size-5" />}
              </Button>
              <Button variant="secondary" size="lg" aria-label="Mais 15 segundos" onClick={() => send({ type: 'restAdd', seconds: 15 })} disabled={isPaused}>
                <Plus className="size-4" /> 15s
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="lg" disabled={idx === 0 || isPaused} onClick={() => send({ type: 'goTo', index: idx - 1 })} aria-label="Exercício anterior" icon>
              <ChevronLeft className="size-6" />
            </Button>
            <p className={cn('flex-1 text-center text-sm', restDoneFlash ? 'font-bold text-accent' : 'text-muted')} aria-live="polite">
              {restDoneFlash ? 'Descanso concluído — bora!' : remainingSets > 0 ? `${remainingSets} séries restantes` : 'Tudo registrado'}
            </p>
            <Button variant="secondary" size="lg" disabled={isLast || isPaused} onClick={() => send({ type: 'goTo', index: idx + 1 })} aria-label="Próximo exercício" icon>
              <ChevronRight className="size-6" />
            </Button>
          </div>
        )}
      </footer>

      {/* ------------------------------------------------ treino pausado */}
      {isPaused && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-bg/90 px-6 backdrop-blur-sm">
          <p className="font-display text-5xl font-extrabold uppercase tracking-wide">Treino pausado</p>
          <p className="tabular text-muted">Tempo de treino: {formatClock(elapsed)}</p>
          <Button size="xl" className="w-full max-w-sm" onClick={() => send({ type: 'resume' })} loading={pending === 'resume'}>
            <Play className="size-6" /> Retomar treino
          </Button>
          <Button variant="ghost" onClick={() => setFinishOpen(true)}>
            Finalizar treino
          </Button>
          {error && <Alert>{error}</Alert>}
        </div>
      )}

      <EditSetDialog
        target={editing}
        onClose={() => setEditing(null)}
        onSave={async (values) => {
          if (!editing) return;
          const s = await send({ type: 'editSet', setId: editing.set.id, ...values });
          if (s) setEditing(null);
        }}
        pending={pending === 'editSet'}
      />

      <FinishDialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        remainingSets={remainingSets}
        pending={pending === 'finish'}
        onFinish={finish}
      />

      <ExercisePicker
        open={!!substituting}
        title="Substituir exercício"
        initialMuscle={substituting?.muscleGroup}
        onClose={() => setSubstituting(null)}
        onPick={async ([target]: ExerciseDTO[]) => {
          if (!substituting || !target) return;
          const s = await send({ type: 'substitute', sessionExerciseId: substituting.id, exerciseId: target.id });
          if (s) setSubstituting(null);
        }}
      />
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
  onStep,
  decimal,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onStep: (dir: 1 | -1) => void;
  decimal?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-muted">{label}</p>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-surface">
        <button onClick={() => onStep(-1)} aria-label={`Diminuir ${label}`} className="grid w-12 place-items-center text-muted active:bg-surface-3">
          <Minus className="size-5" />
        </button>
        <input
          inputMode={decimal ? 'decimal' : 'numeric'}
          aria-label={label}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value.replace(decimal ? /[^\d.,]/g : /\D/g, ''))}
          className="tabular h-14 w-full min-w-0 bg-transparent text-center font-display text-3xl font-bold focus:outline-none"
        />
        <button onClick={() => onStep(1)} aria-label={`Aumentar ${label}`} className="grid w-12 place-items-center text-muted active:bg-surface-3">
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

function EditSetDialog({
  target,
  onClose,
  onSave,
  pending,
}: {
  target: { ex: SessionExerciseDTO; set: SetLogDTO } | null;
  onClose: () => void;
  onSave: (v: { loadKg: number | null; reps: number | null; notes: string }) => void;
  pending: boolean;
}) {
  const [load, setLoad] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => {
    if (!target) return;
    setLoad(target.set.loadKg == null ? '' : String(target.set.loadKg));
    setReps(target.set.reps == null ? '' : String(target.set.reps));
    setNotes(target.set.notes);
  }, [target]);

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      title={`Editar série ${target?.set.setNumber ?? ''}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={pending} onClick={() => onSave({ loadKg: parseNum(load), reps: parseNum(reps), notes })}>
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">{target?.ex.name}. O valor anterior fica guardado no histórico da série.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carga (kg)" htmlFor="edit-load">
            <Input id="edit-load" inputMode="decimal" value={load} placeholder="—" onChange={(e) => setLoad(e.target.value.replace(/[^\d.,]/g, ''))} />
          </Field>
          <Field label="Repetições" htmlFor="edit-reps">
            <Input id="edit-reps" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))} />
          </Field>
        </div>
        <Field label="Observação" htmlFor="edit-notes">
          <Input id="edit-notes" maxLength={300} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

function FinishDialog({
  open,
  onClose,
  onFinish,
  remainingSets,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onFinish: (notes: string) => void;
  remainingSets: number;
  pending: boolean;
}) {
  const [notes, setNotes] = useState('');
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Finalizar treino?"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Continuar treinando
          </Button>
          <Button loading={pending} onClick={() => onFinish(notes)}>
            <Flag className="size-4" /> Finalizar treino
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {remainingSets > 0 ? (
          <Alert tone="warning">
            Ainda há {remainingSets} {remainingSets === 1 ? 'série planejada' : 'séries planejadas'} sem registro. Elas não serão contadas.
          </Alert>
        ) : (
          <Alert tone="success">Todas as séries planejadas foram registradas.</Alert>
        )}
        <Field label="Como foi o treino? (opcional)" htmlFor="finish-notes">
          <Textarea id="finish-notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Energia, dores, ajustes para a próxima…" />
        </Field>
      </div>
    </Dialog>
  );
}
