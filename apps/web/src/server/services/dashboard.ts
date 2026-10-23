import { localDateKey, localWeekday, trainingStreak, type DashboardDTO } from '@forja/core';
import { and, eq, gte, sql } from 'drizzle-orm';
import type { Tx } from '@/db/client';
import { workoutSessions } from '@/db/schema';
import { getActiveSession, listSessions } from './sessions';
import { listWorkouts } from './workouts';

const DAY = 86_400_000;

/** Indicadores do dashboard calculados a partir dos dados reais do usuário, no fuso dele. */
export async function getDashboard(
  tx: Tx,
  user: { id: string; name: string },
  tz: string,
  now = new Date(),
): Promise<DashboardDTO> {
  const workouts = await listWorkouts(tx);
  const todayWeekday = localWeekday(now, tz);
  const todayKey = localDateKey(now, tz);

  const upcoming: DashboardDTO['upcoming'] = [];
  for (let offset = 1; offset <= 7 && upcoming.length < 5; offset++) {
    const day = new Date(now.getTime() + offset * DAY);
    const weekday = localWeekday(day, tz);
    for (const w of workouts.filter((w) => w.weekdays.includes(weekday))) {
      if (upcoming.length < 5) upcoming.push({ date: localDateKey(day, tz), weekday, workout: w });
    }
  }

  const [totals] = await tx
    .select({
      count: sql<number>`count(*)::int`,
      totalMs: sql<number>`coalesce(sum(greatest(0, extract(epoch from (${workoutSessions.endedAt} - ${workoutSessions.startedAt})) * 1000 - ${workoutSessions.pausedTotalMs})), 0)::float8`,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.ownerId, user.id), eq(workoutSessions.status, 'completed')));

  // Dias com treino concluído nos últimos 400 dias (para sequência e semana).
  const recent = await tx
    .select({ startedAt: workoutSessions.startedAt })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.ownerId, user.id),
        eq(workoutSessions.status, 'completed'),
        gte(workoutSessions.startedAt, new Date(now.getTime() - 400 * DAY)),
      ),
    );
  const dayKeys = recent.map((r) => localDateKey(r.startedAt, tz));

  // Semana de segunda a domingo, no fuso do usuário.
  const daysSinceMonday = (todayWeekday + 6) % 7;
  const weekStartKey = localDateKey(new Date(now.getTime() - daysSinceMonday * DAY), tz);
  const weekSessions = dayKeys.filter((k) => k >= weekStartKey && k <= todayKey).length;
  const weekPlannedDays = new Set(workouts.flatMap((w) => w.weekdays)).size;

  const [lastSession] = await listSessions(tx, user.id, { limit: 1, status: 'completed' });

  return {
    userName: user.name,
    todayWeekday,
    todayWorkouts: workouts.filter((w) => w.weekdays.includes(todayWeekday)),
    upcoming,
    activeSession: await getActiveSession(tx, user.id),
    lastSession: lastSession ?? null,
    stats: {
      completedSessions: totals?.count ?? 0,
      totalTrainingMs: Math.round(Number(totals?.totalMs ?? 0)),
      streakDays: trainingStreak(dayKeys, todayKey),
      weekSessions,
      weekPlannedDays,
    },
    hasWorkouts: workouts.length > 0,
  };
}
