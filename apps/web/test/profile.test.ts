import { profileInputSchema, preferencesInputSchema } from '@forja/core';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withUser, type DbHandle } from '@/db/client';
import { profiles, users } from '@/db/schema';
import type { AuthUser } from '@/server/auth';
import { getMe, updatePreferences, updateProfile } from '@/server/services/profile';
import { createTestDb, createUser } from './helpers';

const fakeUser = (id: string, name: string) =>
  ({ id, name, email: `${id}@teste.local`, emailVerified: true, role: 'student', birthDate: '1990-01-01', termsAcceptedAt: new Date() }) as unknown as AuthUser;

describe('perfil e preferências', () => {
  let h: DbHandle;
  beforeAll(async () => {
    h = await createTestDb();
    await createUser(h, 'ana', 'Ana');
    await createUser(h, 'bia', 'Bia');
  });
  afterAll(() => h.close());

  it('perfil novo vem com padrões, sem inventar dados', async () => {
    const me = await withUser(h.db, 'ana', (tx) => getMe(tx, fakeUser('ana', 'Ana')));
    expect(me.profile).toEqual({ heightCm: null, weightKg: null, goal: null, experienceLevel: null, trainingDays: [], sessionMinutes: null });
    expect(me.preferences).toEqual({ theme: 'dark', accentColor: null, restAlerts: true });
  });

  it('salva perfil e nome; valida limites', async () => {
    const input = profileInputSchema.parse({
      name: 'Ana Souza',
      heightCm: 168,
      weightKg: 61.25,
      goal: 'hypertrophy',
      experienceLevel: 'intermediate',
      trainingDays: [5, 1, 3, 1],
      sessionMinutes: 60,
    });
    const me = await updateProfile(h.db, fakeUser('ana', 'Ana'), input);
    expect(me.name).toBe('Ana Souza');
    expect(me.profile).toMatchObject({ heightCm: 168, weightKg: 61.3, trainingDays: [1, 3, 5], goal: 'hypertrophy' });
    const [u] = await h.db.select({ name: users.name }).from(users).where(eq(users.id, 'ana'));
    expect(u?.name).toBe('Ana Souza');

    expect(profileInputSchema.safeParse({ ...input, heightCm: 40 }).success).toBe(false);
    expect(profileInputSchema.safeParse({ ...input, weightKg: 1000 }).success).toBe(false);
  });

  it('preferências parciais e isolamento entre usuários', async () => {
    const me = await withUser(h.db, 'ana', (tx) =>
      updatePreferences(tx, fakeUser('ana', 'Ana'), preferencesInputSchema.parse({ theme: 'light', accentColor: '#2EE6A6' })),
    );
    expect(me.preferences).toEqual({ theme: 'light', accentColor: '#2ee6a6', restAlerts: true });
    expect(preferencesInputSchema.safeParse({ accentColor: 'red; drop table' }).success).toBe(false);

    const bia = await withUser(h.db, 'bia', (tx) => getMe(tx, fakeUser('bia', 'Bia')));
    expect(bia.preferences.theme).toBe('dark');
    const visible = await withUser(h.db, 'bia', (tx) => tx.select().from(profiles));
    expect(visible).toHaveLength(0);
    await expect(withUser(h.db, 'bia', (tx) => tx.insert(profiles).values({ userId: 'ana', heightCm: 100 }))).rejects.toThrow();
  });
});
