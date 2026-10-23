import { workoutInputSchema } from '@forja/core';
import { withUser } from '@/db/client';
import { apiRoute, created, readJson } from '@/server/http';
import { createWorkout, listWorkouts } from '@/server/services/workouts';

export const GET = apiRoute(async ({ user, db }) => withUser(db, user.id, (tx) => listWorkouts(tx)));

export const POST = apiRoute(async ({ req, user, db }) => {
  const input = await readJson(req, workoutInputSchema);
  return created(await withUser(db, user.id, (tx) => createWorkout(tx, user.id, input)));
});
