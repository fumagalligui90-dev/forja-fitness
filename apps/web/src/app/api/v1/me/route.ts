import { profileInputSchema } from '@forja/core';
import { withUser } from '@/db/client';
import { apiRoute, readJson } from '@/server/http';
import { getMe, updateProfile } from '@/server/services/profile';

/** Dados da conta + perfil de treino + preferências. */
export const GET = apiRoute(async ({ user, db }) => withUser(db, user.id, (tx) => getMe(tx, user)));

/** Atualiza nome e perfil de treino (altura, peso, objetivo, nível, disponibilidade). */
export const PUT = apiRoute(async ({ req, user, db }) => {
  const input = await readJson(req, profileInputSchema);
  return updateProfile(db, user, input);
});
