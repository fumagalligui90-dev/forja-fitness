import { startSessionSchema } from '@forja/core';
import { z } from 'zod';
import { withUser } from '@/db/client';
import { apiRoute, created, readJson } from '@/server/http';
import { listSessions, startSession } from '@/server/services/sessions';

const listQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.iso.datetime().optional(),
});

/** Histórico de sessões encerradas (concluídas ou descartadas), paginado por data. */
export const GET = apiRoute(async ({ req, user, db }) => {
  const q = listQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  return withUser(db, user.id, (tx) => listSessions(tx, user.id, q));
});

/** Inicia uma sessão a partir de um treino. 409 se já houver uma em andamento. */
export const POST = apiRoute(async ({ req, user, db }) => {
  const { workoutId } = await readJson(req, startSessionSchema);
  return created(await withUser(db, user.id, (tx) => startSession(tx, user.id, workoutId)));
});
