import { preferencesInputSchema, profileInputSchema, type MeDTO } from '@forja/core';
import { eq, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { Db, Tx } from '@/db/client';
import { profiles, users } from '@/db/schema';
import type { AuthUser } from '../auth';

type ProfileRow = typeof profiles.$inferSelect;

const DEFAULTS: Omit<ProfileRow, 'userId' | 'updatedAt'> = {
  heightCm: null,
  weightKg: null,
  goal: null,
  experienceLevel: null,
  trainingDays: [],
  sessionMinutes: null,
  theme: 'dark',
  accentColor: null,
  restAlerts: true,
};

function toDTO(user: Pick<AuthUser, 'id' | 'name' | 'email'> & Record<string, unknown>, p: Omit<ProfileRow, 'userId' | 'updatedAt'>): MeDTO {
  const termsAcceptedAt = user.termsAcceptedAt as Date | string | null | undefined;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    birthDate: (user.birthDate as string | null | undefined) ?? null,
    role: (user.role as string | undefined) ?? 'student',
    termsAcceptedAt: termsAcceptedAt ? new Date(termsAcceptedAt).toISOString() : null,
    profile: {
      heightCm: p.heightCm,
      weightKg: p.weightKg,
      goal: p.goal,
      experienceLevel: p.experienceLevel,
      trainingDays: p.trainingDays,
      sessionMinutes: p.sessionMinutes,
    },
    preferences: { theme: p.theme, accentColor: p.accentColor, restAlerts: p.restAlerts },
  };
}

async function loadProfile(tx: Tx, userId: string) {
  const [row] = await tx.select().from(profiles).where(eq(profiles.userId, userId));
  return row ?? { ...DEFAULTS };
}

export async function getMe(tx: Tx, user: AuthUser): Promise<MeDTO> {
  return toDTO(user, await loadProfile(tx, user.id));
}

/**
 * Atualiza nome (tabela users, fora do alcance do papel restrito) e perfil
 * (tabela profiles, sob RLS) numa única transação: primeiro o nome, filtrado
 * pelo id da sessão; depois troca para `forja_app` e grava o perfil.
 */
export async function updateProfile(db: Db, user: AuthUser, input: z.output<typeof profileInputSchema>): Promise<MeDTO> {
  const { name, ...fields } = input;
  return db.transaction(async (tx) => {
    if (name !== user.name) await tx.update(users).set({ name }).where(eq(users.id, user.id));
    await tx.execute(sql`select set_config('app.user_id', ${user.id}, true)`);
    await tx.execute(sql`set local role forja_app`);
    await tx
      .insert(profiles)
      .values({ userId: user.id, ...fields })
      .onConflictDoUpdate({ target: profiles.userId, set: fields });
    return toDTO({ ...user, name }, await loadProfile(tx, user.id));
  });
}

export async function updatePreferences(tx: Tx, user: AuthUser, input: z.output<typeof preferencesInputSchema>): Promise<MeDTO> {
  if (Object.keys(input).length === 0) return getMe(tx, user);
  await tx
    .insert(profiles)
    .values({ userId: user.id, ...input })
    .onConflictDoUpdate({ target: profiles.userId, set: input });
  return toDTO(user, await loadProfile(tx, user.id));
}
