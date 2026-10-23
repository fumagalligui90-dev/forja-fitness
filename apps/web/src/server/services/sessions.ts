import {
  sessionCommandSchema,
  type SessionDTO,
  type SessionExerciseDTO,
  type SessionListItemDTO,
} from '@forja/core';
import { and, asc, desc, eq, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Tx } from '@/db/client';
import {
  exercises,
  sessionExercises,
  setLogRevisions,
  setLogs,
  workoutExercises,
  workouts,
  workoutSessions,
} from '@/db/schema';
import { HttpError, notFound } from '../http';

type Command = z.output<typeof sessionCommandSchema>;
type SessionRow = typeof workoutSessions.$inferSelect;

const OPEN = ['active', 'paused'] as const;

// ------------------------------------------------------------------ leitura

export async function getActiveSession(tx: Tx, userId: string) {
  const [row] = await tx
    .select({
      id: workoutSessions.id,
      workoutName: workoutSessions.workoutName,
      startedAt: workoutSessions.startedAt,
      status: workoutSessions.status,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.ownerId, userId), inArray(workoutSessions.status, OPEN)));
  return row ? { ...row, startedAt: row.startedAt.toISOString() } : null;
}

async function loadSession(tx: Tx, userId: string, id: string, lock = false) {
  const q = tx
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.ownerId, userId)));
  const [row] = lock ? await q.for('update') : await q;
  if (!row) throw notFound('Sessão');
  return row;
}

/** Séries da sessão concluída mais recente de cada exercício (excluindo a atual). */
async function previousPerformance(tx: Tx, userId: string, sessionId: string, exerciseIds: string[]) {
  const result = new Map<string, NonNullable<SessionExerciseDTO['previous']>>();
  if (exerciseIds.length === 0) return result;
  const latest = await tx
    .selectDistinctOn([setLogs.exerciseId], {
      exerciseId: setLogs.exerciseId,
      sessionId: setLogs.sessionId,
      startedAt: workoutSessions.startedAt,
    })
    .from(setLogs)
    .innerJoin(workoutSessions, eq(workoutSessions.id, setLogs.sessionId))
    .where(
      and(
        eq(setLogs.ownerId, userId),
        inArray(setLogs.exerciseId, exerciseIds),
        eq(workoutSessions.status, 'completed'),
        ne(workoutSessions.id, sessionId),
      ),
    )
    .orderBy(setLogs.exerciseId, desc(workoutSessions.startedAt));
  if (latest.length === 0) return result;

  const sets = await tx
    .select({ exerciseId: setLogs.exerciseId, sessionId: setLogs.sessionId, loadKg: setLogs.loadKg, reps: setLogs.reps })
    .from(setLogs)
    .where(
      or(...latest.map((l) => and(eq(setLogs.exerciseId, l.exerciseId), eq(setLogs.sessionId, l.sessionId)))),
    )
    .orderBy(asc(setLogs.setNumber));
  for (const l of latest) {
    result.set(l.exerciseId, {
      performedAt: l.startedAt.toISOString(),
      sets: sets
        .filter((s) => s.exerciseId === l.exerciseId && s.sessionId === l.sessionId)
        .map(({ loadKg, reps }) => ({ loadKg, reps })),
    });
  }
  return result;
}

function sessionToDTO(s: SessionRow, exercisesDTO: SessionExerciseDTO[], now: Date): SessionDTO {
  return {
    id: s.id,
    status: s.status,
    workoutId: s.workoutId,
    workoutName: s.workoutName,
    startedAt: s.startedAt.toISOString(),
    endedAt: s.endedAt?.toISOString() ?? null,
    pausedAt: s.pausedAt?.toISOString() ?? null,
    pausedTotalMs: s.pausedTotalMs,
    currentIndex: s.currentIndex,
    rest: {
      endsAt: s.restEndsAt?.toISOString() ?? null,
      pausedRemainingMs: s.restPausedRemainingMs,
      durationSec: s.restDurationSec,
    },
    notes: s.notes,
    exercises: exercisesDTO,
    serverNow: now.toISOString(),
  };
}

export async function getSession(tx: Tx, userId: string, id: string, now = new Date()): Promise<SessionDTO> {
  const s = await loadSession(tx, userId, id);
  const items = await tx
    .select()
    .from(sessionExercises)
    .where(eq(sessionExercises.sessionId, id))
    .orderBy(asc(sessionExercises.position));
  const logs = await tx
    .select()
    .from(setLogs)
    .where(eq(setLogs.sessionId, id))
    .orderBy(asc(setLogs.setNumber));
  const previous = await previousPerformance(
    tx,
    userId,
    id,
    [...new Set(items.map((i) => i.exerciseId))],
  );

  return sessionToDTO(
    s,
    items.map((i) => ({
      id: i.id,
      exerciseId: i.exerciseId,
      originalExerciseId: i.originalExerciseId,
      name: i.name,
      muscleGroup: i.muscleGroup,
      equipment: i.equipment,
      instructions: i.instructions,
      position: i.position,
      plannedSets: i.plannedSets,
      repsMin: i.repsMin,
      repsMax: i.repsMax,
      targetLoadKg: i.targetLoadKg,
      restSeconds: i.restSeconds,
      technique: i.technique,
      notes: i.notes,
      skipped: i.skipped,
      sets: logs
        .filter((l) => l.sessionExerciseId === i.id)
        .map((l) => ({
          id: l.id,
          setNumber: l.setNumber,
          loadKg: l.loadKg,
          reps: l.reps,
          notes: l.notes,
          completedAt: l.completedAt.toISOString(),
          revision: l.revision,
        })),
      previous: previous.get(i.exerciseId) ?? null,
    })),
    now,
  );
}

const durationSql = sql<number>`greatest(0, (extract(epoch from (coalesce(${workoutSessions.endedAt}, now()) - ${workoutSessions.startedAt})) * 1000)::bigint - ${workoutSessions.pausedTotalMs})::float8`;

export async function listSessions(
  tx: Tx,
  userId: string,
  opts: { limit?: number; before?: string; status?: 'completed' } = {},
): Promise<SessionListItemDTO[]> {
  const rows = await tx
    .select({
      id: workoutSessions.id,
      status: workoutSessions.status,
      workoutName: workoutSessions.workoutName,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
      durationMs: durationSql,
      setCount: sql<number>`(select count(*)::int from ${setLogs} sl where sl.session_id = "workout_sessions"."id")`,
      volumeKg: sql<number>`(select coalesce(sum(sl.load_kg * sl.reps), 0)::float8 from ${setLogs} sl where sl.session_id = "workout_sessions"."id")`,
    })
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.ownerId, userId),
        opts.status ? eq(workoutSessions.status, opts.status) : inArray(workoutSessions.status, ['completed', 'abandoned']),
        opts.before ? lt(workoutSessions.startedAt, new Date(opts.before)) : undefined,
      ),
    )
    .orderBy(desc(workoutSessions.startedAt))
    .limit(Math.min(opts.limit ?? 20, 100));
  return rows.map((r) => ({
    ...r,
    startedAt: r.startedAt.toISOString(),
    endedAt: r.endedAt?.toISOString() ?? null,
    durationMs: Math.round(Number(r.durationMs)),
    volumeKg: Math.round(Number(r.volumeKg) * 100) / 100,
  }));
}

// ------------------------------------------------------------------ início

export async function startSession(tx: Tx, userId: string, workoutId: string, now = new Date()) {
  const open = await getActiveSession(tx, userId);
  if (open) {
    throw new HttpError(409, 'session_open', `Você já tem um treino em andamento (${open.workoutName}).`);
  }
  const [w] = await tx
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, workoutId), eq(workouts.ownerId, userId), isNull(workouts.archivedAt)));
  if (!w) throw notFound('Treino');

  const items = await tx
    .select({ item: workoutExercises, exercise: exercises })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(asc(workoutExercises.position));
  if (items.length === 0) {
    throw new HttpError(400, 'empty_workout', 'Adicione exercícios ao treino antes de começar.');
  }

  const [s] = await tx
    .insert(workoutSessions)
    .values({ ownerId: userId, workoutId, workoutName: w.name, startedAt: now })
    .returning({ id: workoutSessions.id });

  await tx.insert(sessionExercises).values(
    items.map(({ item, exercise }, position) => ({
      sessionId: s!.id,
      ownerId: userId,
      exerciseId: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      equipment: exercise.equipment,
      instructions: exercise.instructions,
      position,
      plannedSets: item.sets,
      repsMin: item.repsMin,
      repsMax: item.repsMax,
      targetLoadKg: item.targetLoadKg,
      restSeconds: item.restSeconds,
      technique: item.technique,
      notes: item.notes,
    })),
  );
  return getSession(tx, userId, s!.id, now);
}

// ------------------------------------------------------------------ comandos

const closed = () => new HttpError(409, 'session_closed', 'Este treino já foi encerrado.');
const paused = () => new HttpError(409, 'session_paused', 'Retome o treino para continuar.');

async function getSessionExercise(tx: Tx, sessionId: string, id: string) {
  const [row] = await tx
    .select()
    .from(sessionExercises)
    .where(and(eq(sessionExercises.id, id), eq(sessionExercises.sessionId, sessionId)));
  if (!row) throw notFound('Exercício da sessão');
  return row;
}

/** Aplica um comando à sessão (com lock da linha) e devolve o estado atualizado. */
export async function applyCommand(
  tx: Tx,
  userId: string,
  sessionId: string,
  cmd: Command,
  now = new Date(),
): Promise<SessionDTO> {
  const s = await loadSession(tx, userId, sessionId, true);
  const isOpen = s.status === 'active' || s.status === 'paused';
  if (!isOpen) throw closed();

  const patch: Partial<typeof workoutSessions.$inferInsert> = {};
  const restRunningMs = s.restEndsAt && s.restEndsAt > now ? s.restEndsAt.getTime() - now.getTime() : null;

  // Comandos que exigem o treino em andamento (não pausado).
  const needsActive = ['logSet', 'restPause', 'restResume', 'restSkip', 'restAdd', 'goTo', 'setSkipped', 'substitute'];
  if (s.status === 'paused' && needsActive.includes(cmd.type)) throw paused();

  switch (cmd.type) {
    case 'logSet': {
      const se = await getSessionExercise(tx, sessionId, cmd.sessionExerciseId);
      const [{ next } = { next: 1 }] = await tx
        .select({ next: sql<number>`coalesce(max(${setLogs.setNumber}), 0)::int + 1` })
        .from(setLogs)
        .where(eq(setLogs.sessionExerciseId, se.id));
      await tx.insert(setLogs).values({
        sessionId,
        sessionExerciseId: se.id,
        ownerId: userId,
        exerciseId: se.exerciseId,
        setNumber: next,
        loadKg: cmd.loadKg,
        reps: cmd.reps,
        notes: cmd.notes,
        completedAt: now,
      });
      if (se.skipped) await tx.update(sessionExercises).set({ skipped: false }).where(eq(sessionExercises.id, se.id));
      patch.currentIndex = se.position;
      // Finalizar a série inicia o descanso configurado automaticamente.
      if (se.restSeconds > 0) {
        patch.restEndsAt = new Date(now.getTime() + se.restSeconds * 1000);
        patch.restPausedRemainingMs = null;
        patch.restDurationSec = se.restSeconds;
      } else {
        patch.restEndsAt = null;
        patch.restPausedRemainingMs = null;
      }
      break;
    }
    case 'editSet': {
      const [log] = await tx
        .select()
        .from(setLogs)
        .where(and(eq(setLogs.id, cmd.setId), eq(setLogs.sessionId, sessionId)));
      if (!log) throw notFound('Série');
      // Preserva os valores anteriores antes de sobrescrever.
      await tx.insert(setLogRevisions).values({
        setLogId: log.id,
        ownerId: userId,
        revision: log.revision,
        loadKg: log.loadKg,
        reps: log.reps,
        notes: log.notes,
        replacedAt: now,
      });
      await tx
        .update(setLogs)
        .set({ loadKg: cmd.loadKg, reps: cmd.reps, notes: cmd.notes, revision: log.revision + 1 })
        .where(eq(setLogs.id, log.id));
      break;
    }
    case 'restPause':
      if (restRunningMs != null) {
        patch.restEndsAt = null;
        patch.restPausedRemainingMs = restRunningMs;
      }
      break;
    case 'restResume':
      if (s.restPausedRemainingMs != null) {
        patch.restEndsAt = new Date(now.getTime() + s.restPausedRemainingMs);
        patch.restPausedRemainingMs = null;
      }
      break;
    case 'restSkip':
      patch.restEndsAt = null;
      patch.restPausedRemainingMs = null;
      break;
    case 'restAdd': {
      const deltaMs = cmd.seconds * 1000;
      if (s.restPausedRemainingMs != null) {
        patch.restPausedRemainingMs = Math.max(0, s.restPausedRemainingMs + deltaMs);
      } else if (restRunningMs != null) {
        const remaining = restRunningMs + deltaMs;
        patch.restEndsAt = remaining > 0 ? new Date(now.getTime() + remaining) : null;
      }
      break;
    }
    case 'pause':
      if (s.status === 'active') {
        patch.status = 'paused';
        patch.pausedAt = now;
        // Pausar o treino congela o descanso em andamento.
        if (restRunningMs != null) {
          patch.restEndsAt = null;
          patch.restPausedRemainingMs = restRunningMs;
        }
      }
      break;
    case 'resume':
      if (s.status === 'paused') {
        patch.status = 'active';
        patch.pausedTotalMs = s.pausedTotalMs + (s.pausedAt ? now.getTime() - s.pausedAt.getTime() : 0);
        patch.pausedAt = null;
        if (s.restPausedRemainingMs != null) {
          patch.restEndsAt = new Date(now.getTime() + s.restPausedRemainingMs);
          patch.restPausedRemainingMs = null;
        }
      }
      break;
    case 'goTo': {
      const [{ count } = { count: 0 }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(sessionExercises)
        .where(eq(sessionExercises.sessionId, sessionId));
      if (cmd.index >= count) throw new HttpError(400, 'invalid_index', 'Exercício inexistente nesta sessão.');
      patch.currentIndex = cmd.index;
      break;
    }
    case 'setSkipped': {
      const se = await getSessionExercise(tx, sessionId, cmd.sessionExerciseId);
      await tx.update(sessionExercises).set({ skipped: cmd.skipped }).where(eq(sessionExercises.id, se.id));
      break;
    }
    case 'substitute': {
      const se = await getSessionExercise(tx, sessionId, cmd.sessionExerciseId);
      const [{ logged } = { logged: 0 }] = await tx
        .select({ logged: sql<number>`count(*)::int` })
        .from(setLogs)
        .where(eq(setLogs.sessionExerciseId, se.id));
      if (logged > 0) {
        throw new HttpError(409, 'has_sets', 'Já há séries registradas neste exercício; não é possível substituí-lo.');
      }
      const [target] = await tx
        .select()
        .from(exercises)
        .where(and(eq(exercises.id, cmd.exerciseId), isNull(exercises.archivedAt)));
      if (!target) throw notFound('Exercício');
      await tx
        .update(sessionExercises)
        .set({
          originalExerciseId: se.originalExerciseId ?? se.exerciseId,
          exerciseId: target.id,
          name: target.name,
          muscleGroup: target.muscleGroup,
          equipment: target.equipment,
          instructions: target.instructions,
        })
        .where(eq(sessionExercises.id, se.id));
      break;
    }
    case 'finish':
    case 'abandon': {
      patch.status = cmd.type === 'finish' ? 'completed' : 'abandoned';
      let endedAt = now;
      if (cmd.type === 'finish' && cmd.endAtLastSet) {
        const [{ last } = { last: null }] = await tx
          .select({ last: sql<Date | null>`max(${setLogs.completedAt})` })
          .from(setLogs)
          .where(eq(setLogs.sessionId, sessionId));
        endedAt = last ? new Date(last) : s.startedAt;
      }
      patch.endedAt = endedAt;
      if (s.status === 'paused' && s.pausedAt && s.pausedAt < endedAt) {
        patch.pausedTotalMs = s.pausedTotalMs + (endedAt.getTime() - s.pausedAt.getTime());
      }
      patch.pausedAt = null;
      patch.restEndsAt = null;
      patch.restPausedRemainingMs = null;
      if (cmd.type === 'finish') patch.notes = cmd.notes;
      break;
    }
  }

  if (Object.keys(patch).length > 0) {
    await tx.update(workoutSessions).set(patch).where(eq(workoutSessions.id, sessionId));
  }
  return getSession(tx, userId, sessionId, now);
}
