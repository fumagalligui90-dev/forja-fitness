import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withUser, type DbHandle } from '@/db/client';
import { exercises, workouts } from '@/db/schema';
import { createTestDb, createUser } from './helpers';

describe('Row Level Security (isolamento no banco)', () => {
  let h: DbHandle;
  beforeAll(async () => {
    h = await createTestDb();
    await createUser(h, 'ana');
    await createUser(h, 'bia');
  });
  afterAll(() => h.close());

  it('o papel da API não enxerga linhas de outro usuário', async () => {
    await withUser(h.db, 'ana', (tx) => tx.insert(workouts).values({ ownerId: 'ana', name: 'Treino da Ana' }));

    const asBia = await withUser(h.db, 'bia', (tx) => tx.select().from(workouts));
    expect(asBia).toHaveLength(0);

    const asAna = await withUser(h.db, 'ana', (tx) => tx.select().from(workouts));
    expect(asAna.map((w) => w.name)).toEqual(['Treino da Ana']);
  });

  it('recusa gravar linha em nome de outro usuário', async () => {
    await expect(
      withUser(h.db, 'bia', (tx) => tx.insert(workouts).values({ ownerId: 'ana', name: 'Invasão' })),
    ).rejects.toThrow();
  });

  it('update/delete em linha alheia não afeta nada', async () => {
    const updated = await withUser(h.db, 'bia', (tx) =>
      tx.update(workouts).set({ name: 'Alterado' }).where(eq(workouts.ownerId, 'ana')).returning(),
    );
    expect(updated).toHaveLength(0);
    const deleted = await withUser(h.db, 'bia', (tx) => tx.delete(workouts).returning());
    expect(deleted).toHaveLength(0);
  });

  it('biblioteca global é somente leitura para usuários', async () => {
    const globals = await withUser(h.db, 'ana', (tx) => tx.select().from(exercises));
    expect(globals.length).toBeGreaterThan(20);
    const changed = await withUser(h.db, 'ana', (tx) =>
      tx.update(exercises).set({ name: 'Hack' }).returning(),
    );
    expect(changed).toHaveLength(0);
  });

  it('sem app.user_id nada é visível', async () => {
    const rows = await h.db.transaction(async (tx) => {
      await tx.execute(sql`set local role forja_app`);
      return tx.select().from(workouts);
    });
    expect(rows).toHaveLength(0);
  });

  it('o papel da API não acessa tabelas de autenticação', async () => {
    await expect(withUser(h.db, 'ana', (tx) => tx.execute(sql`select * from auth_accounts`))).rejects.toThrow();
  });
});
