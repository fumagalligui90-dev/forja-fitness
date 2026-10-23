import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { sql, type ExtractTablesWithRelations } from 'drizzle-orm';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT, PgTransaction } from 'drizzle-orm/pg-core';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { Pool } from 'pg';
import * as schema from './schema';
import { seedDemoExercises } from './seed';

type Schema = typeof schema;
export type Db = PgDatabase<PgQueryResultHKT, Schema>;
export type Tx = PgTransaction<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;

export interface DbHandle {
  db: Db;
  kind: 'pglite' | 'postgres';
  migrate(): Promise<void>;
  close(): Promise<void>;
}

const MIGRATIONS = path.join(process.cwd(), 'drizzle');

/**
 * `url` vazio ou `pglite://<dir>` → PGlite (Postgres embutido); `pglite://memory` → em memória (testes).
 * Qualquer `postgres://` → node-postgres.
 */
export function createDb(url = process.env.DATABASE_URL ?? '', migrationsFolder = MIGRATIONS): DbHandle {
  if (!url || url.startsWith('pglite:')) {
    const target = url.replace(/^pglite:\/\//, '') || './.data/pglite';
    if (target !== 'memory') mkdirSync(target, { recursive: true });
    const client = target === 'memory' ? new PGlite() : new PGlite(target);
    const db = drizzlePglite({ client, schema, casing: 'snake_case' });
    return {
      db: db as unknown as Db,
      kind: 'pglite',
      migrate: () => migratePglite(db, { migrationsFolder }),
      close: () => client.close(),
    };
  }
  const pool = new Pool({ connectionString: url, max: 10 });
  const db = drizzlePg({ client: pool, schema, casing: 'snake_case' });
  return {
    db: db as unknown as Db,
    kind: 'postgres',
    migrate: () => migratePg(db, { migrationsFolder }),
    close: () => pool.end(),
  };
}

// Um único handle por processo (sobrevive ao hot reload do Next em dev).
const g = globalThis as unknown as { __forjaDb?: DbHandle; __forjaReady?: Promise<void>; __forjaAuth?: unknown };

export function getDbHandle(): DbHandle {
  g.__forjaDb ??= createDb();
  return g.__forjaDb;
}

export function getDb(): Db {
  return getDbHandle().db;
}

/**
 * Em dev (PGlite) ou com AUTO_MIGRATE=true aplica migrações e o seed de
 * demonstração na primeira requisição. Em produção rode `npm run db:migrate`
 * no deploy.
 */
export function ensureDb(): Promise<void> {
  g.__forjaReady ??= (async () => {
    const handle = getDbHandle();
    if (handle.kind === 'pglite' || process.env.AUTO_MIGRATE === 'true') {
      await handle.migrate();
      await seedDemoExercises(handle.db);
    }
  })().catch((err) => {
    // Permite nova tentativa na próxima requisição com uma conexão nova.
    g.__forjaReady = undefined;
    const broken = g.__forjaDb;
    g.__forjaDb = undefined;
    g.__forjaAuth = undefined;
    void broken?.close().catch(() => {});
    throw err;
  });
  return g.__forjaReady;
}

/**
 * Executa `fn` numa transação com o papel restrito `forja_app` e
 * `app.user_id` definido: as políticas RLS passam a valer.
 */
export function withUser<T>(database: Db, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    await tx.execute(sql`set local role forja_app`);
    return fn(tx);
  });
}
