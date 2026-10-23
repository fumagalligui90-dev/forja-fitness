import { exerciseInputSchema, exerciseQuerySchema } from '@forja/core';
import { withUser } from '@/db/client';
import { apiRoute, created, readJson } from '@/server/http';
import { createExercise, listExercises } from '@/server/services/exercises';

export const GET = apiRoute(async ({ req, user, db }) => {
  const query = exerciseQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return withUser(db, user.id, (tx) => listExercises(tx, user.id, query));
});

export const POST = apiRoute(async ({ req, user, db }) => {
  const input = await readJson(req, exerciseInputSchema);
  return created(await withUser(db, user.id, (tx) => createExercise(tx, user.id, input)));
});
