/**
 * Cálculos puros da sessão de treino. Todo estado temporal é derivado de
 * timestamps gravados no servidor, então o resultado é o mesmo após trocar de
 * tela, minimizar o app ou recarregar a página.
 */

export interface SessionClock {
  startedAt: number;
  endedAt: number | null;
  pausedAt: number | null;
  pausedTotalMs: number;
}

/** Tempo de treino efetivo (descontando pausas do treino inteiro). */
export function elapsedMs(s: SessionClock, now: number): number {
  const end = s.endedAt ?? s.pausedAt ?? now;
  return Math.max(0, end - s.startedAt - s.pausedTotalMs);
}

export interface RestClock {
  endsAt: number | null;
  pausedRemainingMs: number | null;
}

export type RestState =
  | { state: 'idle'; remainingMs: 0 }
  | { state: 'running'; remainingMs: number }
  | { state: 'paused'; remainingMs: number };

export function restState(r: RestClock, now: number): RestState {
  if (r.pausedRemainingMs != null) return { state: 'paused', remainingMs: r.pausedRemainingMs };
  if (r.endsAt != null && r.endsAt > now) return { state: 'running', remainingMs: r.endsAt - now };
  return { state: 'idle', remainingMs: 0 };
}

export interface ProgressExercise {
  plannedSets: number;
  loggedSets: number;
  skipped: boolean;
}

/**
 * Progresso = séries concluídas / séries planejadas. Séries extras não passam
 * de 100% do exercício; exercício pulado conta como resolvido.
 */
export function computeProgress(exercises: ProgressExercise[]) {
  let total = 0;
  let done = 0;
  for (const e of exercises) {
    total += e.plannedSets;
    done += e.skipped ? e.plannedSets : Math.min(e.loggedSets, e.plannedSets);
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export interface VolumeSet {
  loadKg: number | null;
  reps: number | null;
}

/**
 * Volume = Σ carga × repetições. Séries sem carga OU sem repetições não entram
 * na soma e são contadas em `missingSets`, para a interface sinalizar o dado
 * ausente em vez de estimá-lo.
 */
export function computeVolume(sets: VolumeSet[]) {
  let volumeKg = 0;
  let countedSets = 0;
  let missingSets = 0;
  let totalReps = 0;
  for (const s of sets) {
    if (s.reps != null) totalReps += s.reps;
    if (s.loadKg == null || s.reps == null) {
      missingSets++;
      continue;
    }
    volumeKg += s.loadKg * s.reps;
    countedSets++;
  }
  return { volumeKg: Math.round(volumeKg * 100) / 100, countedSets, missingSets, totalReps };
}

// ---------------------------------------------------------------- Formatação

/** 754000 → "12:34"; 3_754_000 → "1:02:34" */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 3_900_000 → "1h 05min"; 45_000 → "1min" (arredonda para cima até 1 min). */
export function formatDuration(ms: number): string {
  const minutes = Math.max(ms > 0 ? 1 : 0, Math.round(ms / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

export function formatKg(kg: number): string {
  return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
}

export function formatReps(min: number, max: number): string {
  return min === max ? `${min}` : `${min}–${max}`;
}
