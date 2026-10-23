import { exerciseInputSchema } from '@forja/core';
import { z } from 'zod';
import { withUser } from '@/db/client';
import { apiRoute, readJson } from '@/server/http';
import { archiveExercise, getExercise, updateExercise } from '@/server/services/exercises';

type P = { id: string };
const id = (p: P) => z.uuid().parse(p.id);

export const GET = apiRoute<P>(async ({ params, user, db }) =>
  withUser(db, user.id, (tx) => getExercise(tx, user.id, id(params))),
);

export const PATCH = apiRoute<P>(async ({ req, params, user, db }) => {
  const input = await readJson(req, exerciseInputSchema);
  return withUser(db, user.id, (tx) => updateExercise(tx, user.id, id(params), input));
});

export const DELETE = apiRoute<P>(async ({ params, user, db }) => {
  await withUser(db, user.id, (tx) => archiveExercise(tx, user.id, id(params)));
  return { ok: true };
});
