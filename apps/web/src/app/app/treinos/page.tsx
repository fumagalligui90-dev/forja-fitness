'use client';

import { WEEKDAY_SHORT, type WorkoutDTO, type WorkoutSummaryDTO } from '@forja/core';
import { Copy, Dumbbell, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StartWorkoutButton } from '@/components/start-workout-button';
import { Alert, Button, Card, cn, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function WorkoutsPage() {
  const [items, setItems] = useState<WorkoutSummaryDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () =>
    api<WorkoutSummaryDTO[]>('/workouts')
      .then(setItems)
      .catch((e) => setError(errorMessage(e)));

  useEffect(() => {
    load();
  }, []);

  async function duplicate(id: string) {
    setBusy(id);
    try {
      await api<WorkoutDTO>(`/workouts/${id}/duplicate`, { method: 'POST', body: {} });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Treinos"
        subtitle="Suas fichas de treinamento."
        actions={
          <Link href="/app/treinos/novo" className="inline-flex h-11 items-center gap-2 rounded-xl bg-accent px-4 font-semibold text-accent-ink">
            <Plus className="size-4" /> Novo treino
          </Link>
        }
      />
      {error && <Alert>{error}</Alert>}
      {!items ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon={<Dumbbell className="size-8" />} title="Nenhum treino ainda">
          Crie fichas como <strong>A — Peito e Tríceps</strong>, <strong>B — Costas e Bíceps</strong>, <strong>C — Pernas</strong>.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((w) => (
            <Card key={w.id} className="flex flex-col gap-4 p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft font-display text-2xl font-bold text-accent">
                  {w.label || <Dumbbell className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold">{w.name}</h2>
                  <p className="text-sm text-muted">
                    {w.exerciseCount} exercícios · {w.totalSets} séries
                  </p>
                  <p className="text-xs text-faint">
                    {w.lastPerformedAt
                      ? `Último: ${new Date(w.lastPerformedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
                      : 'Ainda não realizado'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1" aria-label="Dias programados">
                {WEEKDAY_SHORT.map((d, i) => (
                  <span
                    key={d}
                    className={cn(
                      'flex-1 rounded-md py-1 text-center text-[11px] font-bold uppercase',
                      w.weekdays.includes(i) ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-faint',
                    )}
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="mt-auto flex gap-2">
                <div className="flex-1">
                  {w.exerciseCount > 0 ? (
                    <StartWorkoutButton workoutId={w.id} label="Começar" size="lg" className="w-full" />
                  ) : (
                    <Link
                      href={`/app/treinos/${w.id}`}
                      className="flex h-14 items-center justify-center rounded-2xl border border-dashed border-line text-sm text-muted"
                    >
                      Adicione exercícios
                    </Link>
                  )}
                </div>
                <Link
                  href={`/app/treinos/${w.id}`}
                  aria-label={`Editar ${w.name}`}
                  className="grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 hover:bg-surface-3"
                >
                  <Pencil className="size-5" />
                </Link>
                <Button
                  variant="secondary"
                  size="lg"
                  icon
                  aria-label={`Duplicar ${w.name}`}
                  loading={busy === w.id}
                  onClick={() => duplicate(w.id)}
                >
                  {busy !== w.id && <Copy className="size-5" />}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
