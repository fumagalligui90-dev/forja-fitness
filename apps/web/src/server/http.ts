import type { ApiError } from '@forja/core';
import { z, ZodError } from 'zod';
import { ensureDb, getDb, type Db } from '@/db/client';
import { getAuth, type AuthUser } from './auth';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound = (what = 'Registro') => new HttpError(404, 'not_found', `${what} não encontrado.`);

function errorJson(status: number, body: ApiError) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorResponse(err: unknown): Response {
  if (err instanceof HttpError) return errorJson(err.status, { error: { code: err.code, message: err.message } });
  if (err instanceof ZodError) {
    return errorJson(400, {
      error: {
        code: 'validation',
        message: err.issues[0]?.message ?? 'Dados inválidos.',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }
  // Violação de unicidade (ex.: duas sessões abertas por corrida entre requisições).
  const pgCode = (err as { code?: string; cause?: { code?: string } })?.cause?.code ?? (err as { code?: string })?.code;
  if (pgCode === '23505') {
    return errorJson(409, { error: { code: 'conflict', message: 'Conflito com um registro existente. Atualize a página.' } });
  }
  // Nunca expor detalhes internos ao cliente; o id correlaciona com o log.
  const requestId = crypto.randomUUID().slice(0, 8);
  console.error(`[api] erro ${requestId}`, err);
  return errorJson(500, {
    error: { code: 'internal', message: 'Erro inesperado. Tente novamente.', requestId },
  });
}

/** Proteção CSRF: mutações só com JSON e da mesma origem. */
function assertSameOriginJson(req: Request) {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const type = req.headers.get('content-type') ?? '';
  if (!type.startsWith('application/json')) {
    throw new HttpError(415, 'unsupported_media_type', 'Envie os dados como JSON.');
  }
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin && origin !== process.env.BETTER_AUTH_URL) {
    throw new HttpError(403, 'forbidden_origin', 'Origem não permitida.');
  }
}

export async function readJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, 'invalid_json', 'Corpo da requisição inválido.');
  }
  return schema.parse(body);
}

export interface RouteCtx<P> {
  req: Request;
  params: P;
  user: AuthUser;
  db: Db;
}

/**
 * Envolve um handler da API: CSRF, migração (dev), sessão obrigatória com
 * e-mail verificado e tradução de erros. Retornos simples viram JSON 200.
 */
export function apiRoute<P = Record<string, never>>(handler: (ctx: RouteCtx<P>) => Promise<unknown>) {
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      assertSameOriginJson(req);
      await ensureDb();
      const session = await getAuth().api.getSession({ headers: req.headers });
      if (!session) throw new HttpError(401, 'unauthorized', 'Faça login para continuar.');
      if (!session.user.emailVerified) {
        throw new HttpError(403, 'email_not_verified', 'Confirme seu e-mail para continuar.');
      }
      const result = await handler({ req, params: await ctx.params, user: session.user, db: getDb() });
      if (result instanceof Response) return result;
      return Response.json(result ?? { ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export const created = (data: unknown) => Response.json(data, { status: 201 });
