import { z } from 'zod';
import { withUser } from '@/db/client';
import { apiRoute, created } from '@/server/http';
import { duplicateWorkout } from '@/server/services/workouts';

export const POST = apiRoute<{ id: string }>(async ({ params, user, db }) => {
  const workoutId = z.uuid().parse(params.id);
  return created(await withUser(db, user.id, (tx) => duplicateWorkout(tx, user.id, workoutId)));
});
