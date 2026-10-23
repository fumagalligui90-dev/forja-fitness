import { workoutInputSchema } from '@forja/core';
import { z } from 'zod';
import { withUser } from '@/db/client';
import { apiRoute, readJson } from '@/server/http';
import { archiveWorkout, getWorkout, updateWorkout } from '@/server/services/workouts';

type P = { id: string };
const id = (p: P) => z.uuid().parse(p.id);

export const GET = apiRoute<P>(async ({ params, user, db }) =>
  withUser(db, user.id, (tx) => getWorkout(tx, user.id, id(params))),
);

export const PUT = apiRoute<P>(async ({ req, params, user, db }) => {
  const input = await readJson(req, workoutInputSchema);
  return withUser(db, user.id, (tx) => updateWorkout(tx, user.id, id(params), input));
});

export const DELETE = apiRoute<P>(async ({ params, user, db }) => {
  await withUser(db, user.id, (tx) => archiveWorkout(tx, user.id, id(params)));
  return { ok: true };
});
