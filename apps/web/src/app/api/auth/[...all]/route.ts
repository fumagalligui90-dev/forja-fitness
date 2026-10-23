import { toNextJsHandler } from 'better-auth/next-js';
import { ensureDb } from '@/db/client';
import { getAuth } from '@/server/auth';

export async function GET(req: Request) {
  await ensureDb();
  return toNextJsHandler(getAuth()).GET(req);
}

export async function POST(req: Request) {
  await ensureDb();
  return toNextJsHandler(getAuth()).POST(req);
}
