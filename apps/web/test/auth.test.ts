import { TERMS_VERSION } from '@forja/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DbHandle } from '@/db/client';
import { createAuth, type Auth } from '@/server/auth';
import type { EmailMessage } from '@/server/email';
import { createTestDb } from './helpers';

describe('autenticação (Better Auth + Postgres)', () => {
  let h: DbHandle;
  let auth: Auth;
  const inbox: EmailMessage[] = [];
  const tokenFrom = (msg: EmailMessage | undefined, re: RegExp) => msg?.text.match(re)?.[1];
  const flush = () => new Promise((r) => setTimeout(r, 20));

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres!!';
    h = await createTestDb();
    auth = createAuth(h.db, async (m) => void inbox.push(m), 'http://localhost:3000');
  });
  afterAll(() => h.close());

  const signUpBody = {
    name: 'Carla Teste',
    email: 'carla@teste.local',
    password: 'senha-forte-123',
    birthDate: '1995-04-10',
    termsVersion: TERMS_VERSION,
  };

  it('recusa cadastro sem aceite dos termos ou menor de idade', async () => {
    await expect(auth.api.signUpEmail({ body: { ...signUpBody, email: 'a@t.local', termsVersion: 'x' } })).rejects.toThrow(/termos/);
    await expect(auth.api.signUpEmail({ body: { ...signUpBody, email: 'b@t.local', birthDate: '2020-01-01' } })).rejects.toThrow(/anos/);
  });

  it('cadastro → verificação de e-mail → login → logout', async () => {
    await auth.api.signUpEmail({ body: signUpBody });
    await flush();
    const verifyMail = inbox.find((m) => m.to === signUpBody.email && /Confirme/.test(m.subject));
    expect(verifyMail).toBeDefined();

    // Login bloqueado até verificar
    await expect(auth.api.signInEmail({ body: { email: signUpBody.email, password: signUpBody.password } })).rejects.toThrow();

    const token = tokenFrom(verifyMail, /token=([^&\s]+)/);
    expect(token).toBeTruthy();
    await auth.api.verifyEmail({ query: { token: token! } });

    const res = await auth.api.signInEmail({
      body: { email: signUpBody.email, password: signUpBody.password },
      asResponse: true,
    });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(/HttpOnly/i);

    const headers = new Headers({ cookie: cookie.split(';')[0]! });
    const session = await auth.api.getSession({ headers });
    expect(session?.user).toMatchObject({ email: signUpBody.email, birthDate: '1995-04-10', role: 'student' });
    expect(session?.user.termsAcceptedAt).toBeTruthy();

    await auth.api.signOut({ headers });
    expect(await auth.api.getSession({ headers })).toBeNull();
  });

  it('senha errada é recusada e o usuário não pode se promover a admin', async () => {
    await expect(auth.api.signInEmail({ body: { email: signUpBody.email, password: 'errada-123456' } })).rejects.toThrow();
    await auth.api
      .signUpEmail({ body: { ...signUpBody, email: 'dani@teste.local', role: 'admin' } as typeof signUpBody })
      .catch(() => null);
    const rows = await h.db.query.users.findMany();
    expect(rows.find((u) => u.email === 'dani@teste.local')?.role ?? 'student').toBe('student');
  });

  it('recuperação de senha por e-mail', async () => {
    await auth.api.requestPasswordReset({ body: { email: signUpBody.email, redirectTo: '/redefinir-senha' } });
    await flush();
    const mail = inbox.findLast((m) => /Redefinição/.test(m.subject));
    const token = tokenFrom(mail, /reset-password\/([^?\s]+)/);
    expect(token).toBeTruthy();
    await auth.api.resetPassword({ body: { token: token!, newPassword: 'nova-senha-456' } });
    const res = await auth.api.signInEmail({ body: { email: signUpBody.email, password: 'nova-senha-456' }, asResponse: true });
    expect(res.status).toBe(200);
  });
});
