import { headers } from 'next/headers';
import { ensureDb } from '@/db/client';
import { getAuth } from './auth';

/** Sessão do usuário em Server Components (validada no banco, não só no cookie). */
export async function getServerSession() {
  await ensureDb();
  return getAuth().api.getSession({ headers: await headers() });
}
