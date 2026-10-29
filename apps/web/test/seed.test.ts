import { and, eq, isNull } from 'drizzle-orm';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createDb } from '@/db/client';
import { EXERCISE_CATALOG } from '@/db/exercise-catalog';
import { exercises } from '@/db/schema';
import { seedDemoExercises } from '@/db/seed';
import { createUser } from './helpers';

describe('seed da biblioteca de exercícios', () => {
  it('atualiza demos antigos pelo nome, sem duplicar nem tocar em exercícios de usuários', async () => {
    const handle = createDb('pglite://memory', path.join(import.meta.dirname, '..', 'drizzle'));
    await handle.migrate();
    const { db } = handle;
    // Estado de um banco criado pela versão anterior do seed (38 demos, sem fotos).
    const [old] = await db
      .insert(exercises)
      .values({ name: 'Elevação de pernas', muscleGroup: 'abs', equipment: 'bodyweight', instructions: 'antigo', isDemo: true })
      .returning();
    const userId = await createUser(handle, 'u1');
    await db.insert(exercises).values({ name: 'Supino reto com barra', muscleGroup: 'chest', equipment: 'barbell', ownerId: userId });

    expect(await seedDemoExercises(db)).toBe(EXERCISE_CATALOG.length - 1);
    expect(await seedDemoExercises(db)).toBe(0);

    const globals = await db.select().from(exercises).where(isNull(exercises.ownerId));
    expect(globals).toHaveLength(EXERCISE_CATALOG.length);
    const [renamed] = await db.select().from(exercises).where(eq(exercises.id, old!.id));
    expect(renamed!.name).toBe('Elevação de pernas na barra');
    expect(renamed!.images).toEqual(['/exercicios/hanging-leg-raise/0.webp', '/exercicios/hanging-leg-raise/1.webp']);
    expect(renamed!.primaryMuscles).toContain('abdominals');

    const [mine] = await db.select().from(exercises).where(and(eq(exercises.ownerId, userId)));
    expect(mine!.images).toEqual([]);
    await handle.close();
  });
});
