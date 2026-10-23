import { workoutInputSchema, type WorkoutDTO, type WorkoutSummaryDTO } from '@forja/core';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Tx } from '@/db/client';
import { exercises, workoutExercises, workouts, workoutSessions } from '@/db/schema';
import { HttpError, notFound } from '../http';

type WorkoutInput = z.output<typeof workoutInputSchema>;

export async function listWorkouts(tx: Tx): Promise<WorkoutSummaryDTO[]> {
  // RLS restringe às linhas do usuário; o filtro explícito por dono fica nos serviços que recebem ids.
  const rows = await tx
    .select({
      id: workouts.id,
      name: workouts.name,
      label: workouts.label,
      weekdays: workouts.weekdays,
      exerciseCount: sql<number>`(select count(*)::int from ${workoutExercises} we where we.workout_id = "workouts"."id")`,
      totalSets: sql<number>`(select coalesce(sum(we.sets), 0)::int from ${workoutExercises} we where we.workout_id = "workouts"."id")`,
      lastPerformedAt: sql<string | null>`(select max(ws.started_at) from ${workoutSessions} ws where ws.workout_id = "workouts"."id" and ws.status = 'completed')`,
    })
    .from(workouts)
    .where(isNull(workouts.archivedAt))
    .orderBy(asc(workouts.label), asc(workouts.name));
  return rows.map((r) => ({
    ...r,
    lastPerformedAt: r.lastPerformedAt ? new Date(r.lastPerformedAt).toISOString() : null,
  }));
}

export async function getWorkout(tx: Tx, userId: string, id: string): Promise<WorkoutDTO> {
  const [w] = await tx
    .select()
    .from(workouts)
    .where(and(eq(workouts.id, id), eq(workouts.ownerId, userId), isNull(workouts.archivedAt)));
  if (!w) throw notFound('Treino');
  const items = await tx
    .select({ item: workoutExercises, name: exercises.name, muscleGroup: exercises.muscleGroup, equipment: exercises.equipment })
    .from(workoutExercises)
    .innerJoin(exercises, eq(exercises.id, workoutExercises.exerciseId))
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(asc(workoutExercises.position));
  return {
    id: w.id,
    name: w.name,
    label: w.label,
    notes: w.notes,
    weekdays: w.weekdays,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
    exercises: items.map(({ item, name, muscleGroup, equipment }) => ({
      id: item.id,
      exerciseId: item.exerciseId,
      exerciseName: name,
      muscleGroup,
      equipment,
      position: item.position,
      sets: item.sets,
      repsMin: item.repsMin,
      repsMax: item.repsMax,
      targetLoadKg: item.targetLoadKg,
      restSeconds: item.restSeconds,
      technique: item.technique,
      notes: item.notes,
    })),
  };
}

/** Garante que todos os exercícios existem e são visíveis ao usuário (globais ou próprios). */
async function assertExercisesVisible(tx: Tx, ids: string[]) {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const found = await tx.select({ id: exercises.id }).from(exercises).where(inArray(exercises.id, unique));
  if (found.length !== unique.length) {
    throw new HttpError(400, 'invalid_exercise', 'Um ou mais exercícios não existem ou não estão disponíveis.');
  }
}

async function writeItems(tx: Tx, userId: string, workoutId: string, items: WorkoutInput['exercises']) {
  await tx.delete(workoutExercises).where(eq(workoutExercises.workoutId, workoutId));
  if (items.length === 0) return;
  await tx.insert(workoutExercises).values(
    items.map((e, position) => ({ ...e, workoutId, ownerId: userId, position })),
  );
}

export async function createWorkout(tx: Tx, userId: string, input: WorkoutInput) {
  await assertExercisesVisible(tx, input.exercises.map((e) => e.exerciseId));
  const { exercises: items, ...fields } = input;
  const [w] = await tx.insert(workouts).values({ ...fields, ownerId: userId }).returning({ id: workouts.id });
  await writeItems(tx, userId, w!.id, items);
  return getWorkout(tx, userId, w!.id);
}

/**
 * Substitui a ficha inteira numa única transação: se algo falhar, a versão
 * anterior permanece intacta. Sessões já realizadas não mudam (são snapshots).
 */
export async function updateWorkout(tx: Tx, userId: string, id: string, input: WorkoutInput) {
  await getWorkout(tx, userId, id);
  await assertExercisesVisible(tx, input.exercises.map((e) => e.exerciseId));
  const { exercises: items, ...fields } = input;
  await tx.update(workouts).set(fields).where(eq(workouts.id, id));
  await writeItems(tx, userId, id, items);
  return getWorkout(tx, userId, id);
}

export async function archiveWorkout(tx: Tx, userId: string, id: string) {
  await getWorkout(tx, userId, id);
  await tx.update(workouts).set({ archivedAt: new Date() }).where(eq(workouts.id, id));
}

export async function duplicateWorkout(tx: Tx, userId: string, id: string) {
  const src = await getWorkout(tx, userId, id);
  return createWorkout(tx, userId, {
    name: `${src.name} (cópia)`.slice(0, 60),
    label: src.label,
    notes: src.notes,
    weekdays: [],
    exercises: src.exercises.map(({ exerciseId, sets, repsMin, repsMax, targetLoadKg, restSeconds, technique, notes }) => ({
      exerciseId,
      sets,
      repsMin,
      repsMax,
      targetLoadKg,
      restSeconds,
      technique,
      notes,
    })),
  });
}
