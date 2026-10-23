/** Contratos (DTOs) da API /api/v1 — compartilhados entre servidor, web e app. */
import type { Difficulty, Equipment, MuscleGroup, SessionStatus, Technique } from './constants';

export interface ApiError {
  error: { code: string; message: string; issues?: { path: string; message: string }[]; requestId?: string };
}

export interface ExerciseDTO {
  id: string;
  name: string;
  description: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  difficulty: Difficulty;
  instructions: string;
  mediaUrl: string | null;
  /** true = criado pelo próprio usuário; false = biblioteca global */
  isOwn: boolean;
  isDemo: boolean;
  isFavorite: boolean;
}

export interface WorkoutExerciseDTO {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  position: number;
  sets: number;
  repsMin: number;
  repsMax: number;
  targetLoadKg: number | null;
  restSeconds: number;
  technique: Technique;
  notes: string;
}

export interface WorkoutDTO {
  id: string;
  name: string;
  label: string;
  notes: string;
  weekdays: number[];
  exercises: WorkoutExerciseDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSummaryDTO {
  id: string;
  name: string;
  label: string;
  weekdays: number[];
  exerciseCount: number;
  totalSets: number;
  lastPerformedAt: string | null;
}

export interface SetLogDTO {
  id: string;
  setNumber: number;
  loadKg: number | null;
  reps: number | null;
  notes: string;
  completedAt: string;
  revision: number;
}

export interface SessionExerciseDTO {
  id: string;
  exerciseId: string;
  originalExerciseId: string | null;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: Equipment;
  instructions: string;
  position: number;
  plannedSets: number;
  repsMin: number;
  repsMax: number;
  targetLoadKg: number | null;
  restSeconds: number;
  technique: Technique;
  notes: string;
  skipped: boolean;
  sets: SetLogDTO[];
  /** Séries da última sessão concluída com este exercício (null se nunca feito). */
  previous: { performedAt: string; sets: { loadKg: number | null; reps: number | null }[] } | null;
}

export interface SessionDTO {
  id: string;
  status: SessionStatus;
  workoutId: string | null;
  workoutName: string;
  startedAt: string;
  endedAt: string | null;
  pausedAt: string | null;
  pausedTotalMs: number;
  currentIndex: number;
  rest: { endsAt: string | null; pausedRemainingMs: number | null; durationSec: number | null };
  notes: string;
  exercises: SessionExerciseDTO[];
  /** Relógio do servidor no momento da resposta, para corrigir desvio do relógio do cliente. */
  serverNow: string;
}

export interface SessionListItemDTO {
  id: string;
  status: SessionStatus;
  workoutName: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number;
  setCount: number;
  volumeKg: number;
}

export interface DashboardDTO {
  userName: string;
  todayWeekday: number;
  todayWorkouts: WorkoutSummaryDTO[];
  upcoming: { date: string; weekday: number; workout: WorkoutSummaryDTO }[];
  activeSession: { id: string; workoutName: string; startedAt: string; status: SessionStatus } | null;
  lastSession: SessionListItemDTO | null;
  stats: {
    completedSessions: number;
    totalTrainingMs: number;
    streakDays: number;
    weekSessions: number;
    weekPlannedDays: number;
  };
  hasWorkouts: boolean;
}
