'use client';

import {
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  formatDuration,
  formatKg,
  type DashboardDTO,
  type WorkoutSummaryDTO,
} from '@forja/core';
import { CalendarDays, ChevronRight, Dumbbell, Flame, History, Library, Plus, Timer, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StartWorkoutButton } from '@/components/start-workout-button';
import { Alert, Card, EmptyState, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Flame; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-faint">
        <Icon className="size-4" aria-hidden /> {label}
      </div>
      <p className="tabular mt-2 font-display text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </Card>
  );
}

function WorkoutLine({ w }: { w: WorkoutSummaryDTO }) {
  return (
    <span className="flex items-center gap-3">
      {w.label && (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft font-display text-lg font-bold text-accent">
          {w.label}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold">{w.name}</span>
        <span className="block text-xs text-faint">
          {w.exerciseCount} exercícios · {w.totalSets} séries
        </span>
      </span>
    </span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    api<DashboardDTO>(`/dashboard?tz=${encodeURIComponent(tz)}`)
      .then(setData)
      .catch((e) => setError(errorMessage(e)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;

  const firstName = data.userName.split(' ')[0];
  const today = data.todayWorkouts[0];
  const { stats } = data;

  return (
    <div className="animate-rise flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{WEEKDAY_LONG[data.todayWeekday]}</p>
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide sm:text-5xl">
          {greeting()}, {firstName}
        </h1>
      </div>

      {/* Treino do dia */}
      <Card className="relative overflow-hidden p-5 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent/10 blur-2xl" />
        {data.activeSession ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Treino em andamento</p>
            <p className="font-display text-3xl font-bold uppercase">{data.activeSession.workoutName}</p>
            <Link
              href={`/app/sessao/${data.activeSession.id}`}
              className="inline-flex h-16 items-center justify-center rounded-2xl bg-accent font-display text-lg font-bold uppercase tracking-wide text-accent-ink"
            >
              Retomar treino
            </Link>
          </div>
        ) : today ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted">Treino de hoje</p>
            <WorkoutLine w={today} />
            {data.todayWorkouts.length > 1 && (
              <p className="text-xs text-faint">
                Também programado hoje: {data.todayWorkouts.slice(1).map((w) => w.name).join(', ')}
              </p>
            )}
            <StartWorkoutButton workoutId={today.id} />
          </div>
        ) : data.hasWorkouts ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted">Hoje</p>
            <p className="text-lg">Nenhum treino programado para hoje.</p>
            <Link href="/app/treinos" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Escolher um treino para começar <ChevronRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="font-display text-2xl font-bold uppercase">Monte sua primeira ficha</p>
            <p className="text-muted">Crie um treino com os exercícios da biblioteca e programe os dias da semana.</p>
            <Link
              href="/app/treinos/novo"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-5 font-bold text-accent-ink"
            >
              <Plus className="size-5" /> Criar treino
            </Link>
          </div>
        )}
      </Card>

      {/* Indicadores (dados reais) */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Flame} label="Sequência" value={`${stats.streakDays} ${stats.streakDays === 1 ? 'dia' : 'dias'}`} />
        <Stat icon={Trophy} label="Concluídos" value={String(stats.completedSessions)} hint="treinos no total" />
        <Stat icon={Timer} label="Tempo total" value={formatDuration(stats.totalTrainingMs)} />
        <Stat
          icon={CalendarDays}
          label="Meta da semana"
          value={stats.weekPlannedDays ? `${stats.weekSessions}/${stats.weekPlannedDays}` : String(stats.weekSessions)}
          hint={stats.weekPlannedDays ? 'treinos / dias programados' : 'programe dias nos treinos'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Último treino</h2>
          {data.lastSession ? (
            <Link href={`/app/sessao/${data.lastSession.id}/resumo`} className="group flex items-center justify-between gap-3">
              <span>
                <span className="block font-semibold">{data.lastSession.workoutName}</span>
                <span className="block text-sm text-muted">
                  {new Date(data.lastSession.startedAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })} ·{' '}
                  {formatDuration(data.lastSession.durationMs)} · {data.lastSession.setCount} séries
                  {data.lastSession.volumeKg > 0 && ` · ${formatKg(data.lastSession.volumeKg)}`}
                </span>
              </span>
              <ChevronRight className="size-5 text-faint group-hover:text-text" />
            </Link>
          ) : (
            <p className="text-sm text-muted">Você ainda não concluiu nenhum treino.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Próximos treinos</h2>
          {data.upcoming.length ? (
            <ul className="flex flex-col gap-3">
              {data.upcoming.map((u) => (
                <li key={`${u.date}-${u.workout.id}`} className="flex items-center gap-3">
                  <span className="w-10 shrink-0 text-xs font-bold uppercase text-faint">{WEEKDAY_SHORT[u.weekday]}</span>
                  <Link href={`/app/treinos/${u.workout.id}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent">
                    {u.workout.label && <span className="text-accent">{u.workout.label} · </span>}
                    {u.workout.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Programe dias da semana nos seus treinos para vê-los aqui.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { href: '/app/treinos', label: 'Treinos', icon: Dumbbell },
          { href: '/app/exercicios', label: 'Exercícios', icon: Library },
          { href: '/app/historico', label: 'Histórico', icon: History },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface py-5 font-semibold hover:border-accent/50"
          >
            <Icon className="size-6 text-accent" aria-hidden />
            {label}
          </Link>
        ))}
      </div>

      {!data.hasWorkouts && (
        <EmptyState title="Dados de demonstração">
          A biblioteca vem com exercícios marcados como <strong>DEMO</strong> para você testar. Seus treinos e registros começam vazios.
        </EmptyState>
      )}
    </div>
  );
}
