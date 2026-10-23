import { z } from 'zod';
import { withUser } from '@/db/client';
import { apiRoute } from '@/server/http';
import { getSession } from '@/server/services/sessions';

export const GET = apiRoute<{ id: string }>(async ({ params, user, db }) => {
  const sessionId = z.uuid().parse(params.id);
  return withUser(db, user.id, (tx) => getSession(tx, user.id, sessionId));
});
