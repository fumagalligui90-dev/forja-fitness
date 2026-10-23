import { sessionCommandSchema } from '@forja/core';
import { z } from 'zod';
import { withUser } from '@/db/client';
import { apiRoute, readJson } from '@/server/http';
import { applyCommand } from '@/server/services/sessions';

/**
 * Todas as ações da sessão ativa (registrar/editar série, descanso, pausa,
 * navegação, substituição, finalizar). Cada comando é persistido na hora e a
 * resposta traz o estado completo da sessão.
 */
export const POST = apiRoute<{ id: string }>(async ({ req, params, user, db }) => {
  const sessionId = z.uuid().parse(params.id);
  const cmd = await readJson(req, sessionCommandSchema);
  return withUser(db, user.id, (tx) => applyCommand(tx, user.id, sessionId, cmd));
});
