import { and, eq, isNull } from 'drizzle-orm';
import type { Db } from './client';
import { EXERCISE_CATALOG, RENAMED } from './exercise-catalog';
import { exercises } from './schema';

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * Idempotente. Só mexe na biblioteca global de demonstração (owner_id NULL,
 * is_demo = true): insere o que falta e atualiza nome, músculos, fotos e
 * instruções dos que já existem. Exercícios, treinos e históricos dos usuários
 * não são tocados, e nada é apagado.
 */
export async function seedDemoExercises(db: Db): Promise<number> {
  const existing = await db
    .select()
    .from(exercises)
    .where(and(isNull(exercises.ownerId), eq(exercises.isDemo, true)));
  const bySlug = new Map(existing.filter((e) => e.slug).map((e) => [e.slug!, e]));
  const byName = new Map(existing.map((e) => [RENAMED[e.name] ?? e.name, e]));

  const toInsert: (typeof exercises.$inferInsert)[] = [];
  for (const [slug, name, muscleGroup, equipment, difficulty, primaryMuscles, secondaryMuscles, hasImages, instructions] of EXERCISE_CATALOG) {
    const images = hasImages ? [`/exercicios/${slug}/0.webp`, `/exercicios/${slug}/1.webp`] : [];
    const values = { slug, name, muscleGroup, equipment, difficulty, instructions, primaryMuscles, secondaryMuscles, images };
    const row = bySlug.get(slug) ?? byName.get(name);
    if (!row) {
      toInsert.push({ ...values, description: '', isDemo: true, ownerId: null });
      continue;
    }
    const changed =
      row.slug !== slug ||
      row.name !== name ||
      row.muscleGroup !== muscleGroup ||
      row.equipment !== equipment ||
      row.difficulty !== difficulty ||
      row.instructions !== instructions ||
      !sameList(row.primaryMuscles, primaryMuscles) ||
      !sameList(row.secondaryMuscles, secondaryMuscles) ||
      !sameList(row.images, images);
    if (changed) await db.update(exercises).set(values).where(eq(exercises.id, row.id));
  }
  if (toInsert.length) await db.insert(exercises).values(toInsert);
  return toInsert.length;
}
