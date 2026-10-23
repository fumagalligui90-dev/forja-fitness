import { describe, expect, it } from 'vitest';
import {
  computeProgress,
  computeVolume,
  elapsedMs,
  formatClock,
  formatDuration,
  restState,
} from '../src/session';

describe('computeVolume', () => {
  it('soma carga × repetições', () => {
    const r = computeVolume([
      { loadKg: 60, reps: 10 },
      { loadKg: 62.5, reps: 8 },
    ]);
    expect(r).toEqual({ volumeKg: 1100, countedSets: 2, missingSets: 0, totalReps: 18 });
  });

  it('não inventa dados ausentes: séries sem carga ou reps ficam fora e são sinalizadas', () => {
    const r = computeVolume([
      { loadKg: 40, reps: 12 },
      { loadKg: null, reps: 15 },
      { loadKg: 40, reps: null },
    ]);
    expect(r.volumeKg).toBe(480);
    expect(r.countedSets).toBe(1);
    expect(r.missingSets).toBe(2);
    expect(r.totalReps).toBe(27);
  });

  it('carga zero informada conta como série válida com volume 0', () => {
    expect(computeVolume([{ loadKg: 0, reps: 20 }])).toMatchObject({ volumeKg: 0, countedSets: 1, missingSets: 0 });
  });

  it('evita erro de ponto flutuante', () => {
    expect(computeVolume([{ loadKg: 22.1, reps: 3 }]).volumeKg).toBe(66.3);
  });
});

describe('computeProgress', () => {
  it('limita séries extras a 100% do exercício e conta pulados como resolvidos', () => {
    const p = computeProgress([
      { plannedSets: 3, loggedSets: 5, skipped: false },
      { plannedSets: 4, loggedSets: 1, skipped: false },
      { plannedSets: 3, loggedSets: 0, skipped: true },
    ]);
    expect(p).toEqual({ done: 7, total: 10, percent: 70 });
  });

  it('treino sem séries planejadas = 0%', () => {
    expect(computeProgress([]).percent).toBe(0);
  });
});

describe('relógios', () => {
  const t0 = 1_000_000;
  it('desconta pausas acumuladas e congela durante a pausa', () => {
    const clock = { startedAt: t0, endedAt: null, pausedAt: null, pausedTotalMs: 60_000 };
    expect(elapsedMs(clock, t0 + 300_000)).toBe(240_000);
    expect(elapsedMs({ ...clock, pausedAt: t0 + 100_000 }, t0 + 999_999)).toBe(40_000);
    expect(elapsedMs({ ...clock, endedAt: t0 + 200_000 }, t0 + 999_999)).toBe(140_000);
  });

  it('descanso: rodando, pausado e encerrado', () => {
    expect(restState({ endsAt: t0 + 30_000, pausedRemainingMs: null }, t0)).toEqual({ state: 'running', remainingMs: 30_000 });
    expect(restState({ endsAt: null, pausedRemainingMs: 12_000 }, t0)).toEqual({ state: 'paused', remainingMs: 12_000 });
    expect(restState({ endsAt: t0 - 1, pausedRemainingMs: null }, t0).state).toBe('idle');
    expect(restState({ endsAt: null, pausedRemainingMs: null }, t0).state).toBe('idle');
  });

  it('formatação', () => {
    expect(formatClock(754_000)).toBe('12:34');
    expect(formatClock(3_754_000)).toBe('1:02:34');
    expect(formatClock(5_000)).toBe('0:05');
    expect(formatDuration(3_900_000)).toBe('1h 05min');
    expect(formatDuration(20_000)).toBe('1min');
    expect(formatDuration(0)).toBe('0min');
  });
});
