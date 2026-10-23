import { isValidTimeZone } from '@forja/core';
import { withUser } from '@/db/client';
import { apiRoute } from '@/server/http';
import { getDashboard } from '@/server/services/dashboard';

export const GET = apiRoute(async ({ req, user, db }) => {
  const tzParam = new URL(req.url).searchParams.get('tz') ?? '';
  const tz = isValidTimeZone(tzParam) ? tzParam : 'America/Sao_Paulo';
  return withUser(db, user.id, (tx) => getDashboard(tx, user, tz));
});
