import {
  DIFFICULTIES,
  EQUIPMENT,
  GOALS,
  MUSCLE_GROUPS,
  SESSION_STATUSES,
  TECHNIQUES,
  THEMES,
} from '@forja/core';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const tz = { withTimezone: true } as const;
const createdAt = () => timestamp(tz).notNull().defaultNow();
const updatedAt = () =>
  timestamp(tz)
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const kg = () => numeric({ precision: 6, scale: 2, mode: 'number' });

// =========================================================== Autenticação
// Tabelas gerenciadas pelo Better Auth (chaves JS seguem o modelo dele).

export const users = pgTable('users', {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  birthDate: date({ mode: 'string' }),
  termsVersion: text(),
  termsAcceptedAt: timestamp(tz),
  role: text().notNull().default('student'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text().notNull().unique(),
    expiresAt: timestamp(tz).notNull(),
    ipAddress: text(),
    userAgent: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp(tz),
    refreshTokenExpiresAt: timestamp(tz),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.userId)],
);

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp(tz).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.identifier)],
);

// =========================================================== Enums

export const muscleGroupEnum = pgEnum('muscle_group', MUSCLE_GROUPS);
export const equipmentEnum = pgEnum('equipment', EQUIPMENT);
export const difficultyEnum = pgEnum('difficulty', DIFFICULTIES);
export const techniqueEnum = pgEnum('technique', TECHNIQUES);
export const sessionStatusEnum = pgEnum('session_status', SESSION_STATUSES);
export const goalEnum = pgEnum('goal', GOALS);
export const themeEnum = pgEnum('theme', THEMES);

// =========================================================== Perfil

/** Dados de treino e preferências do usuário (1:1 com users; criado sob demanda). */
export const profiles = pgTable('profiles', {
  userId: text()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  heightCm: smallint(),
  weightKg: numeric({ precision: 5, scale: 1, mode: 'number' }),
  goal: goalEnum(),
  experienceLevel: difficultyEnum(),
  trainingDays: smallint().array().notNull().default(sql`'{}'::smallint[]`),
  sessionMinutes: smallint(),
  theme: themeEnum().notNull().default('dark'),
  accentColor: text(),
  restAlerts: boolean().notNull().default(true),
  updatedAt: updatedAt(),
});

// =========================================================== Exercícios

/** owner_id NULL = biblioteca global (gerida pelo admin); preenchido = exercício particular. */
export const exercises = pgTable(
  'exercises',
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text().references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text().notNull().default(''),
    muscleGroup: muscleGroupEnum().notNull(),
    equipment: equipmentEnum().notNull(),
    difficulty: difficultyEnum().notNull().default('beginner'),
    instructions: text().notNull().default(''),
    mediaUrl: text(),
    isDemo: boolean().notNull().default(false),
    archivedAt: timestamp(tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.ownerId), index().on(t.muscleGroup), index().on(t.equipment)],
);

export const exerciseFavorites = pgTable(
  'exercise_favorites',
  {
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: uuid()
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.ownerId, t.exerciseId] })],
);

// =========================================================== Treinos (fichas)

export const workouts = pgTable(
  'workouts',
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    label: text().notNull().default(''),
    notes: text().notNull().default(''),
    weekdays: smallint().array().notNull().default(sql`'{}'::smallint[]`),
    archivedAt: timestamp(tz),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.ownerId)],
);

export const workoutExercises = pgTable(
  'workout_exercises',
  {
    id: uuid().primaryKey().defaultRandom(),
    workoutId: uuid()
      .notNull()
      .references(() => workouts.id, { onDelete: 'cascade' }),
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: uuid()
      .notNull()
      .references(() => exercises.id),
    position: smallint().notNull(),
    sets: smallint().notNull(),
    repsMin: smallint().notNull(),
    repsMax: smallint().notNull(),
    targetLoadKg: kg(),
    restSeconds: smallint().notNull(),
    technique: techniqueEnum().notNull().default('normal'),
    notes: text().notNull().default(''),
  },
  (t) => [index().on(t.workoutId, t.position), index().on(t.exerciseId)],
);

// =========================================================== Sessões de treino

export const workoutSessions = pgTable(
  'workout_sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workoutId: uuid().references(() => workouts.id, { onDelete: 'set null' }),
    /** Cópia do nome no início da sessão: o histórico não muda se a ficha for editada. */
    workoutName: text().notNull(),
    status: sessionStatusEnum().notNull().default('active'),
    startedAt: timestamp(tz).notNull().defaultNow(),
    endedAt: timestamp(tz),
    pausedAt: timestamp(tz),
    pausedTotalMs: bigint({ mode: 'number' }).notNull().default(0),
    currentIndex: smallint().notNull().default(0),
    restEndsAt: timestamp(tz),
    restPausedRemainingMs: integer(),
    restDurationSec: smallint(),
    notes: text().notNull().default(''),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index().on(t.ownerId, t.startedAt.desc()),
    // No máximo uma sessão em andamento por usuário.
    uniqueIndex('workout_sessions_one_open_per_user')
      .on(t.ownerId)
      .where(sql`${t.status} in ('active', 'paused')`),
  ],
);

/** Cópia (snapshot) do plano de cada exercício no momento em que a sessão começou. */
export const sessionExercises = pgTable(
  'session_exercises',
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: uuid()
      .notNull()
      .references(() => exercises.id),
    /** Preenchido quando o exercício foi substituído durante a sessão. */
    originalExerciseId: uuid().references(() => exercises.id),
    name: text().notNull(),
    muscleGroup: muscleGroupEnum().notNull(),
    equipment: equipmentEnum().notNull(),
    instructions: text().notNull().default(''),
    position: smallint().notNull(),
    plannedSets: smallint().notNull(),
    repsMin: smallint().notNull(),
    repsMax: smallint().notNull(),
    targetLoadKg: kg(),
    restSeconds: smallint().notNull(),
    technique: techniqueEnum().notNull().default('normal'),
    notes: text().notNull().default(''),
    skipped: boolean().notNull().default(false),
  },
  (t) => [index().on(t.sessionId, t.position)],
);

export const setLogs = pgTable(
  'set_logs',
  {
    id: uuid().primaryKey().defaultRandom(),
    sessionId: uuid()
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    sessionExerciseId: uuid()
      .notNull()
      .references(() => sessionExercises.id, { onDelete: 'cascade' }),
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exerciseId: uuid()
      .notNull()
      .references(() => exercises.id),
    setNumber: smallint().notNull(),
    loadKg: kg(),
    reps: smallint(),
    notes: text().notNull().default(''),
    revision: integer().notNull().default(1),
    completedAt: timestamp(tz).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex().on(t.sessionExerciseId, t.setNumber),
    index().on(t.ownerId, t.exerciseId, t.completedAt.desc()),
    index().on(t.sessionId),
  ],
);

/** Valores anteriores de uma série editada (histórico consistente). */
export const setLogRevisions = pgTable(
  'set_log_revisions',
  {
    id: uuid().primaryKey().defaultRandom(),
    setLogId: uuid()
      .notNull()
      .references(() => setLogs.id, { onDelete: 'cascade' }),
    ownerId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    revision: integer().notNull(),
    loadKg: kg(),
    reps: smallint(),
    notes: text().notNull().default(''),
    replacedAt: timestamp(tz).notNull().defaultNow(),
  },
  (t) => [index().on(t.setLogId)],
);

// =========================================================== Infra

/** Caixa de saída de e-mails em desenvolvimento (sem SMTP configurado). Nunca usada em produção. */
export const devEmails = pgTable('dev_emails', {
  id: uuid().primaryKey().defaultRandom(),
  to: text().notNull(),
  subject: text().notNull(),
  text: text().notNull(),
  createdAt: createdAt(),
});
