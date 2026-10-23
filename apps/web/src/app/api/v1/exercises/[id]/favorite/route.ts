import { z } from 'zod';
import { withUser } from '@/db/client';
import { apiRoute, readJson } from '@/server/http';
import { setFavorite } from '@/server/services/exercises';

export const PUT = apiRoute<{ id: string }>(async ({ req, params, user, db }) => {
  const { favorite } = await readJson(req, z.object({ favorite: z.boolean() }));
  const exerciseId = z.uuid().parse(params.id);
  return withUser(db, user.id, (tx) => setFavorite(tx, user.id, exerciseId, favorite));
});
