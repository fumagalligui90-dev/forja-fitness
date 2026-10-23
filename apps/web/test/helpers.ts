import path from 'node:path';
import { createDb, type DbHandle } from '@/db/client';
import { users } from '@/db/schema';
import { seedDemoExercises } from '@/db/seed';

/** Banco Postgres (PGlite) novo em memória, com migrações reais e seed demo. */
export async function createTestDb(): Promise<DbHandle> {
  const handle = createDb('pglite://memory', path.join(import.meta.dirname, '..', 'drizzle'));
  await handle.migrate();
  await seedDemoExercises(handle.db);
  return handle;
}

export async function createUser(handle: DbHandle, id: string, name = `Usuário ${id}`) {
  await handle.db.insert(users).values({ id, name, email: `${id}@teste.local`, emailVerified: true });
  return id;
}
