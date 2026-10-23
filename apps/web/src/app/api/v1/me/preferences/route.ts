import { preferencesInputSchema } from '@forja/core';
import { withUser } from '@/db/client';
import { apiRoute, readJson } from '@/server/http';
import { updatePreferences } from '@/server/services/profile';

/** Tema, cor de destaque e avisos de descanso — sincronizados entre web e app. */
export const PATCH = apiRoute(async ({ req, user, db }) => {
  const input = await readJson(req, preferencesInputSchema);
  return withUser(db, user.id, (tx) => updatePreferences(tx, user, input));
});
