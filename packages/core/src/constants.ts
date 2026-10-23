export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'full_body',
  'cardio',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peito',
  back: 'Costas',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraços',
  quads: 'Quadríceps',
  hamstrings: 'Posteriores de coxa',
  glutes: 'Glúteos',
  calves: 'Panturrilhas',
  abs: 'Abdômen',
  full_body: 'Corpo inteiro',
  cardio: 'Cardio',
};

export const EQUIPMENT = [
  'dumbbell',
  'barbell',
  'machine',
  'cable',
  'bodyweight',
  'band',
  'kettlebell',
  'other',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  dumbbell: 'Halteres',
  barbell: 'Barra',
  machine: 'Máquina',
  cable: 'Cabo / polia',
  bodyweight: 'Peso corporal',
  band: 'Elástico',
  kettlebell: 'Kettlebell',
  other: 'Outros',
};

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export const TECHNIQUES = ['normal', 'drop_set', 'bi_set', 'rest_pause', 'pyramid'] as const;
export type Technique = (typeof TECHNIQUES)[number];

export const TECHNIQUE_LABELS: Record<Technique, string> = {
  normal: 'Normal',
  drop_set: 'Drop-set',
  bi_set: 'Bi-set',
  rest_pause: 'Rest-pause',
  pyramid: 'Pirâmide',
};

export const GOALS = ['hypertrophy', 'weight_loss', 'conditioning', 'strength', 'health'] as const;
export type Goal = (typeof GOALS)[number];

export const GOAL_LABELS: Record<Goal, string> = {
  hypertrophy: 'Hipertrofia',
  weight_loss: 'Emagrecimento',
  conditioning: 'Condicionamento',
  strength: 'Força',
  health: 'Saúde e bem-estar',
};

/** Nível de experiência do usuário (mesma escala da dificuldade dos exercícios). */
export const EXPERIENCE_LABELS: Record<Difficulty, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

export const SESSION_STATUSES = ['active', 'paused', 'completed', 'abandoned'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/** 0 = domingo … 6 = sábado (mesma convenção de Date.getDay()). */
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const WEEKDAY_LONG = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;
