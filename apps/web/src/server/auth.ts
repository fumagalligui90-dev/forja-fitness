import { ageOn, birthDateSchema, MIN_SIGNUP_AGE, TERMS_VERSION, BRAND } from '@forja/core';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { getDb, type Db } from '@/db/client';
import { authAccounts, authSessions, authVerifications, users } from '@/db/schema';
import { createEmailSender, emailTemplates, type EmailSender } from './email';

export function socialProvidersFromEnv() {
  const env = process.env;
  return {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
      : {}),
    ...(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET
      ? {
          apple: {
            clientId: env.APPLE_CLIENT_ID,
            clientSecret: env.APPLE_CLIENT_SECRET,
            appBundleIdentifier: env.APPLE_APP_BUNDLE_IDENTIFIER,
          },
        }
      : {}),
  };
}

/** Valida nascimento e aceite dos termos. Lança mensagem amigável em português. */
export function validateSignupProfile(birthDate: unknown, termsVersion: unknown, now = new Date()) {
  const parsed = birthDateSchema.safeParse(birthDate);
  if (!parsed.success) throw new APIError('BAD_REQUEST', { message: 'Informe uma data de nascimento válida.' });
  const age = ageOn(parsed.data, now);
  if (age < MIN_SIGNUP_AGE || age > 120) {
    throw new APIError('BAD_REQUEST', {
      message: `É preciso ter pelo menos ${MIN_SIGNUP_AGE} anos para criar uma conta.`,
    });
  }
  if (termsVersion !== TERMS_VERSION) {
    throw new APIError('BAD_REQUEST', { message: 'É preciso aceitar os termos de uso e a política de privacidade.' });
  }
  return parsed.data;
}

export function createAuth(db: Db, sendEmail: EmailSender, baseURL = process.env.BETTER_AUTH_URL) {
  // Envio sem `await`: a resposta não deve revelar (por tempo) se o e-mail existe.
  const dispatch = (msg: Parameters<EmailSender>[0]) =>
    void sendEmail(msg).catch((err) => console.error('[email] falha no envio', err));

  return betterAuth({
    appName: BRAND.name,
    baseURL,
    secret: process.env.BETTER_AUTH_SECRET,
    trustedOrigins: baseURL ? [baseURL] : [],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user: users, session: authSessions, account: authAccounts, verification: authVerifications },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => dispatch({ to: user.email, ...emailTemplates.reset(user.name, url) }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => dispatch({ to: user.email, ...emailTemplates.verify(user.name, url) }),
    },
    socialProviders: socialProvidersFromEnv(),
    user: {
      additionalFields: {
        birthDate: { type: 'string', required: false, input: true },
        termsVersion: { type: 'string', required: false, input: true },
        termsAcceptedAt: { type: 'date', required: false, input: false },
        role: { type: 'string', required: false, defaultValue: 'student', input: false },
      },
      deleteUser: { enabled: true },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      // Ativo por padrão apenas em produção (o Better Auth desliga em dev).
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/request-password-reset': { window: 300, max: 3 },
        '/send-verification-email': { window: 300, max: 3 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            // Cadastro por e-mail exige nascimento + termos. No login social esses
            // dados são coletados depois, em /app/concluir-cadastro.
            if (ctx?.path === '/sign-up/email') {
              const record = user as typeof user & { birthDate?: unknown; termsVersion?: unknown };
              const birthDate = validateSignupProfile(record.birthDate, record.termsVersion);
              return { data: { ...user, birthDate, termsAcceptedAt: new Date(), role: 'student' } };
            }
            return { data: { ...user, birthDate: null, termsVersion: null, role: 'student' } };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthUser = Auth['$Infer']['Session']['user'];

const g = globalThis as unknown as { __forjaAuth?: Auth };

export function getAuth(): Auth {
  if (!g.__forjaAuth) {
    const db = getDb();
    g.__forjaAuth = createAuth(db, createEmailSender(db));
  }
  return g.__forjaAuth;
}
