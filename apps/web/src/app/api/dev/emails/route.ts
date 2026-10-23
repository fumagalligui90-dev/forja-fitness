import { desc } from 'drizzle-orm';
import { ensureDb, getDb } from '@/db/client';
import { devEmails } from '@/db/schema';

/** Caixa de e-mails de desenvolvimento. Inexistente em produção ou com SMTP configurado. */
export async function GET() {
  if (process.env.NODE_ENV === 'production' || process.env.SMTP_URL) {
    return new Response('Not found', { status: 404 });
  }
  await ensureDb();
  const rows = await getDb().select().from(devEmails).orderBy(desc(devEmails.createdAt)).limit(30);
  return Response.json(rows, { headers: { 'Cache-Control': 'no-store' } });
}
