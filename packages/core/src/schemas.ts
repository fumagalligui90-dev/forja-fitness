import { z } from 'zod';
import { DIFFICULTIES, EQUIPMENT, GOALS, MUSCLE_GROUPS, TECHNIQUES, THEMES } from './constants';

const text = (max: number) => z.string().trim().max(max);

/** Carga em kg, arredondada a 2 casas. `null` = não informada (nunca inventamos valor). */
export const loadKgSchema = z
  .number()
  .min(0, 'A carga não pode ser negativa')
  .max(1000, 'Carga acima do limite')
  .transform((v) => Math.round(v * 100) / 100);

export const repsSchema = z.int('Repetições devem ser um número inteiro').min(0).max(500);

// ---------------------------------------------------------------- Auth

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha muito longa');

export const birthDateSchema = z.iso.date('Data de nascimento inválida');

// ---------------------------------------------------------------- Perfil e preferências

const weekdaysSchema = z
  .array(z.int().min(0).max(6))
  .max(7)
  .default([])
  .transform((d) => [...new Set(d)].sort((a, b) => a - b));

export const profileInputSchema = z.object({
  name: text(80).min(2, 'Informe seu nome'),
  heightCm: z.int('Altura em centímetros, sem vírgula').min(100, 'Altura mínima: 100 cm').max(250, 'Altura máxima: 250 cm').nullable(),
  weightKg: z
    .number()
    .min(25, 'Peso mínimo: 25 kg')
    .max(350, 'Peso máximo: 350 kg')
    .transform((v) => Math.round(v * 10) / 10)
    .nullable(),
  goal: z.enum(GOALS).nullable(),
  experienceLevel: z.enum(DIFFICULTIES).nullable(),
  trainingDays: weekdaysSchema,
  sessionMinutes: z.int().min(10, 'Mínimo de 10 minutos').max(240, 'Máximo de 240 minutos').nullable(),
});
export type ProfileInput = z.input<typeof profileInputSchema>;

export const preferencesInputSchema = z
  .object({
    theme: z.enum(THEMES),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida')
      .transform((c) => c.toLowerCase())
      .nullable(),
    restAlerts: z.boolean(),
  })
  .partial();
export type PreferencesInput = z.input<typeof preferencesInputSchema>;

// ---------------------------------------------------------------- Exercícios

export const exerciseInputSchema = z.object({
  name: text(80).min(2, 'Informe o nome do exercício'),
  description: text(1000).default(''),
  muscleGroup: z.enum(MUSCLE_GROUPS),
  equipment: z.enum(EQUIPMENT),
  difficulty: z.enum(DIFFICULTIES).default('beginner'),
  instructions: text(3000).default(''),
});
export type ExerciseInput = z.input<typeof exerciseInputSchema>;

export const exerciseQuerySchema = z.object({
  q: text(80).optional(),
  muscleGroup: z.enum(MUSCLE_GROUPS).optional(),
  equipment: z.enum(EQUIPMENT).optional(),
  scope: z.enum(['all', 'mine', 'favorites']).default('all'),
});

// ---------------------------------------------------------------- Treinos

export const workoutExerciseInputSchema = z
  .object({
    exerciseId: z.uuid(),
    sets: z.int().min(1, 'Mínimo de 1 série').max(20),
    repsMin: z.int().min(1).max(100),
    repsMax: z.int().min(1).max(100),
    targetLoadKg: loadKgSchema.nullable().default(null),
    restSeconds: z.int().min(0).max(900),
    technique: z.enum(TECHNIQUES).default('normal'),
    notes: text(500).default(''),
  })
  .refine((v) => v.repsMax >= v.repsMin, {
    message: 'Repetições máximas devem ser ≥ mínimas',
    path: ['repsMax'],
  });

export const workoutInputSchema = z.object({
  name: text(60).min(1, 'Dê um nome ao treino'),
  label: text(3).default(''),
  notes: text(1000).default(''),
  weekdays: weekdaysSchema,
  exercises: z.array(workoutExerciseInputSchema).max(40, 'Máximo de 40 exercícios'),
});
export type WorkoutInput = z.input<typeof workoutInputSchema>;

// ---------------------------------------------------------------- Sessão

export const startSessionSchema = z.object({ workoutId: z.uuid() });

const setValues = {
  loadKg: loadKgSchema.nullable(),
  reps: repsSchema.nullable(),
  notes: text(300).default(''),
};

export const sessionCommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('logSet'), sessionExerciseId: z.uuid(), ...setValues }),
  z.object({ type: z.literal('editSet'), setId: z.uuid(), ...setValues }),
  z.object({ type: z.literal('restPause') }),
  z.object({ type: z.literal('restResume') }),
  z.object({ type: z.literal('restSkip') }),
  z.object({ type: z.literal('restAdd'), seconds: z.int().min(-300).max(300) }),
  z.object({ type: z.literal('pause') }),
  z.object({ type: z.literal('resume') }),
  z.object({ type: z.literal('goTo'), index: z.int().min(0).max(39) }),
  z.object({ type: z.literal('setSkipped'), sessionExerciseId: z.uuid(), skipped: z.boolean() }),
  z.object({ type: z.literal('substitute'), sessionExerciseId: z.uuid(), exerciseId: z.uuid() }),
  z.object({
    type: z.literal('finish'),
    notes: text(1000).default(''),
    /** Sessão esquecida aberta: encerra no horário da última série, não "agora". */
    endAtLastSet: z.boolean().default(false),
  }),
  z.object({ type: z.literal('abandon') }),
]);
export type SessionCommand = z.input<typeof sessionCommandSchema>;
