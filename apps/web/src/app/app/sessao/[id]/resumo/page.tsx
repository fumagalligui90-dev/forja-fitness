'use client';

import {
  computeVolume,
  elapsedMs,
  formatClock,
  formatDuration,
  formatKg,
  MUSCLE_GROUP_LABELS,
  type SessionDTO,
} from '@forja/core';
import { AlertTriangle, ArrowLeft, Check, Dumbbell, Layers, Timer, Weight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function SessionSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<SessionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SessionDTO>(`/sessions/${id}`)
      .then(setS)
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) return <Alert>{error}</Alert>;
  if (!s) return <Spinner />;

  const open = s.status === 'active' || s.status === 'paused';
  const duration = elapsedMs(
    {
      startedAt: Date.parse(s.startedAt),
      endedAt: s.endedAt ? Date.parse(s.endedAt) : null,
      pausedAt: s.pausedAt ? Date.parse(s.pausedAt) : null,
      pausedTotalMs: s.pausedTotalMs,
    },
    Date.parse(s.serverNow),
  );
  const perExercise = s.exercises.map((e) => ({ e, v: computeVolume(e.sets) }));
  const total = computeVolume(s.exercises.flatMap((e) => e.sets));
  const doneExercises = s.exercises.filter((e) => e.sets.length > 0).length;
  const totalSets = s.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <div className="animate-rise flex flex-col gap-6">
      <Link href="/app/historico" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Histórico
      </Link>

      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          {s.status === 'completed' ? 'Treino concluído' : s.status === 'abandoned' ? 'Treino descartado' : 'Treino em andamento'}
        </p>
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">{s.workoutName}</h1>
        <p className="text-sm text-muted">
          {new Date(s.startedAt).toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {open && (
        <Alert tone="warning">
          Este treino ainda está aberto.{' '}
          <Link href={`/app/sessao/${s.id}`} className="font-semibold underline">
            Voltar ao treino
          </Link>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Timer, label: 'Duração', value: formatDuration(duration), sub: formatClock(duration) },
          { icon: Dumbbell, label: 'Exercícios', value: `${doneExercises}/${s.exercises.length}` },
          { icon: Layers, label: 'Séries', value: String(totalSets), sub: `${total.totalReps} repetições` },
          { icon: Weight, label: 'Volume estimado', value: formatKg(total.volumeKg) },
        ].map(({ icon: Icon, label, value, sub }) => (
          <Card key={label} className="p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-faint">
              <Icon className="size-4" /> {label}
            </p>
            <p className="tabular mt-2 font-display text-3xl font-bold">{value}</p>
            {sub && <p className="tabular text-xs text-faint">{sub}</p>}
          </Card>
        ))}
      </div>

      {total.missingSets > 0 && (
        <Alert tone="warning">
          <span className="inline-flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {total.missingSets} {total.missingSets === 1 ? 'série não tem' : 'séries não têm'} carga ou repetições registradas e{' '}
            {total.missingSets === 1 ? 'ficou' : 'ficaram'} fora do volume. Nenhum valor foi estimado.
          </span>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Por exercício</h2>
        {perExercise.map(({ e, v }) => (
          <Card key={e.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{e.name}</p>
                <p className="text-xs text-faint">{MUSCLE_GROUP_LABELS[e.muscleGroup]}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {e.skipped && <Badge tone="warning">Pulado</Badge>}
                {e.originalExerciseId && <Badge tone="warning">Substituído</Badge>}
                <Badge tone={e.sets.length >= e.plannedSets ? 'success' : 'neutral'}>
                  {e.sets.length}/{e.plannedSets} séries
                </Badge>
              </div>
            </div>
            {e.sets.length > 0 ? (
              <>
                <ol className="mt-3 flex flex-wrap gap-2">
                  {e.sets.map((set) => (
                    <li key={set.id} className="tabular rounded-lg bg-surface-2 px-2.5 py-1 text-sm">
                      <Check className="mr-1 inline size-3.5 text-success" />
                      {set.loadKg == null ? '—' : formatKg(set.loadKg)} × {set.reps ?? '—'}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-sm text-muted">
                  Volume: <strong className="tabular text-text">{formatKg(v.volumeKg)}</strong>
                  {v.missingSets > 0 && <span className="text-warning"> · {v.missingSets} sem dados completos</span>}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-faint">Nenhuma série registrada.</p>
            )}
          </Card>
        ))}
      </div>

      {s.notes && (
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-faint">Observações</h2>
          <p className="whitespace-pre-line">{s.notes}</p>
        </Card>
      )}

      <p className="text-xs text-faint">
        Volume estimado = soma de carga × repetições das séries com ambos os valores registrados. Indicadores descrevem o que foi
        registrado e não representam garantia de resultado.
      </p>

      <Link href="/app" className="inline-flex h-14 items-center justify-center rounded-2xl bg-accent font-display text-lg font-bold uppercase tracking-wide text-accent-ink">
        Voltar ao início
      </Link>
    </div>
  );
}
