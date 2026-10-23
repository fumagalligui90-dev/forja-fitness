import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { users } from '@/db/schema';
import { validateSignupProfile } from '@/server/auth';
import { apiRoute, HttpError, readJson } from '@/server/http';

/** Conclui o cadastro de quem entrou por login social: nascimento + aceite dos termos. */
export const POST = apiRoute(async ({ req, user, db }) => {
  const body = await readJson(req, z.object({ birthDate: z.string(), termsVersion: z.string() }));
  let birthDate: string;
  try {
    birthDate = validateSignupProfile(body.birthDate, body.termsVersion);
  } catch (err) {
    throw new HttpError(400, 'validation', (err as Error).message);
  }
  await db
    .update(users)
    .set({ birthDate, termsVersion: body.termsVersion, termsAcceptedAt: new Date() })
    .where(eq(users.id, user.id));
  return { ok: true };
});
