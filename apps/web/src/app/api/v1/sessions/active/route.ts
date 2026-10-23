import { withUser } from '@/db/client';
import { apiRoute } from '@/server/http';
import { getActiveSession } from '@/server/services/sessions';

/** Sessão em andamento (ou pausada) do usuário, para oferecer retomada. */
export const GET = apiRoute(async ({ user, db }) => ({
  session: await withUser(db, user.id, (tx) => getActiveSession(tx, user.id)),
}));
