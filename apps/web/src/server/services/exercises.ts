import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  exerciseInputSchema,
  exerciseQuerySchema,
  type ExerciseDTO,
} from '@forja/core';
import { and, asc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { z } from 'zod';
import type { Tx } from '@/db/client';
import { exerciseFavorites, exercises } from '@/db/schema';
import { HttpError, notFound } from '../http';

/** Minúsculas e sem acentos: "Tríceps" → "triceps". */
export function normalizeSearch(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
const ACCENTED = 'áàâãäéèêëíìîïóòôõöúùûüç';
const PLAIN = 'aaaaaeeeeiiiiooooouuuuc';

type Row = typeof exercises.$inferSelect;

function toDTO(row: Row, userId: string, isFavorite: boolean): ExerciseDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    muscleGroup: row.muscleGroup,
    equipment: row.equipment,
    difficulty: row.difficulty,
    instructions: row.instructions,
    mediaUrl: row.mediaUrl,
    isOwn: row.ownerId === userId,
    isDemo: row.isDemo,
    isFavorite,
  };
}

export async function listExercises(
  tx: Tx,
  userId: string,
  query: z.output<typeof exerciseQuerySchema>,
): Promise<ExerciseDTO[]> {
  const conds: SQL[] = [isNull(exercises.archivedAt)];
  if (query.muscleGroup) conds.push(eq(exercises.muscleGroup, query.muscleGroup));
  if (query.equipment) conds.push(eq(exercises.equipment, query.equipment));
  if (query.scope === 'mine') conds.push(eq(exercises.ownerId, userId));
  if (query.scope === 'favorites') conds.push(sql`${exerciseFavorites.exerciseId} is not null`);

  const q = query.q ? normalizeSearch(query.q) : '';
  if (q) {
    // Busca por nome (sem acento) ou pelo rótulo do grupo muscular / equipamento.
    const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const muscles = MUSCLE_GROUPS.filter((m) => normalizeSearch(MUSCLE_GROUP_LABELS[m]).includes(q));
    const equips = EQUIPMENT.filter((e) => normalizeSearch(EQUIPMENT_LABELS[e]).includes(q));
    const nameMatch = sql`translate(lower(${exercises.name}), ${ACCENTED}, ${PLAIN}) like ${pattern}`;
    conds.push(
      or(
        nameMatch,
        muscles.length ? inArray(exercises.muscleGroup, muscles) : undefined,
        equips.length ? inArray(exercises.equipment, equips) : undefined,
      )!,
    );
  }

  const rows = await tx
    .select({ exercise: exercises, favoriteId: exerciseFavorites.exerciseId })
    .from(exercises)
    .leftJoin(
      exerciseFavorites,
      and(eq(exerciseFavorites.exerciseId, exercises.id), eq(exerciseFavorites.ownerId, userId)),
    )
    .where(and(...conds))
    .orderBy(asc(exercises.name))
    .limit(300);
  return rows.map((r) => toDTO(r.exercise, userId, r.favoriteId != null));
}

/** Exercício visível ao usuário (global ou próprio; RLS garante). */
export async function getExercise(tx: Tx, userId: string, id: string): Promise<ExerciseDTO> {
  const [row] = await tx
    .select({ exercise: exercises, favoriteId: exerciseFavorites.exerciseId })
    .from(exercises)
    .leftJoin(
      exerciseFavorites,
      and(eq(exerciseFavorites.exerciseId, exercises.id), eq(exerciseFavorites.ownerId, userId)),
    )
    .where(eq(exercises.id, id));
  if (!row) throw notFound('Exercício');
  return toDTO(row.exercise, userId, row.favoriteId != null);
}

export async function createExercise(tx: Tx, userId: string, input: z.output<typeof exerciseInputSchema>) {
  const [row] = await tx
    .insert(exercises)
    .values({ ...input, ownerId: userId, isDemo: false })
    .returning();
  return toDTO(row!, userId, false);
}

async function getOwn(tx: Tx, userId: string, id: string) {
  const [row] = await tx.select().from(exercises).where(eq(exercises.id, id));
  if (!row || row.archivedAt) throw notFound('Exercício');
  if (row.ownerId !== userId) {
    throw new HttpError(403, 'forbidden', 'Exercícios da biblioteca global não podem ser alterados.');
  }
  return row;
}

export async function updateExercise(
  tx: Tx,
  userId: string,
  id: string,
  input: z.output<typeof exerciseInputSchema>,
) {
  await getOwn(tx, userId, id);
  await tx.update(exercises).set(input).where(eq(exercises.id, id));
  return getExercise(tx, userId, id);
}

/** Arquiva (não apaga): treinos e históricos que usam o exercício continuam íntegros. */
export async function archiveExercise(tx: Tx, userId: string, id: string) {
  await getOwn(tx, userId, id);
  await tx.update(exercises).set({ archivedAt: new Date() }).where(eq(exercises.id, id));
}

export async function setFavorite(tx: Tx, userId: string, id: string, favorite: boolean) {
  await getExercise(tx, userId, id);
  if (favorite) {
    await tx.insert(exerciseFavorites).values({ ownerId: userId, exerciseId: id }).onConflictDoNothing();
  } else {
    await tx
      .delete(exerciseFavorites)
      .where(and(eq(exerciseFavorites.ownerId, userId), eq(exerciseFavorites.exerciseId, id)));
  }
  return { favorite };
}
