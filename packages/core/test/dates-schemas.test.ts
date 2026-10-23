import { describe, expect, it } from 'vitest';
import { ageOn, localDateKey, localWeekday, trainingStreak } from '../src/dates';
import { sessionCommandSchema, workoutInputSchema } from '../src/schemas';

describe('datas', () => {
  it('usa o fuso do usuário para o dia local', () => {
    const instant = new Date('2026-10-23T01:30:00Z'); // 22:30 do dia 22 em São Paulo
    expect(localDateKey(instant, 'America/Sao_Paulo')).toBe('2026-10-22');
    expect(localWeekday(instant, 'America/Sao_Paulo')).toBe(4); // quinta
    expect(localDateKey(instant, 'UTC')).toBe('2026-10-23');
  });

  it('sequência termina hoje ou ontem', () => {
    const days = ['2026-10-20', '2026-10-21', '2026-10-22'];
    expect(trainingStreak(days, '2026-10-22')).toBe(3);
    expect(trainingStreak(days, '2026-10-23')).toBe(3);
    expect(trainingStreak(days, '2026-10-24')).toBe(0);
    expect(trainingStreak([], '2026-10-24')).toBe(0);
  });

  it('idade completa', () => {
    expect(ageOn('2010-10-24', new Date('2026-10-23T12:00:00Z'))).toBe(15);
    expect(ageOn('2010-10-23', new Date('2026-10-23T12:00:00Z'))).toBe(16);
  });
});

describe('schemas', () => {
  const ex = '0b9f6c1e-6a4e-4a8c-9a59-1d7e0c1f2a3b';

  it('treino: normaliza dias e rejeita faixa de reps invertida', () => {
    const ok = workoutInputSchema.parse({
      name: ' Peito e Tríceps ',
      weekdays: [5, 1, 1],
      exercises: [{ exerciseId: ex, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 }],
    });
    expect(ok.name).toBe('Peito e Tríceps');
    expect(ok.weekdays).toEqual([1, 5]);
    expect(ok.exercises[0]?.technique).toBe('normal');
    expect(ok.exercises[0]?.targetLoadKg).toBeNull();

    const bad = workoutInputSchema.safeParse({
      name: 'X',
      exercises: [{ exerciseId: ex, sets: 3, repsMin: 12, repsMax: 8, restSeconds: 60 }],
    });
    expect(bad.success).toBe(false);
  });

  it('comando de série aceita carga ausente mas não negativa', () => {
    expect(sessionCommandSchema.safeParse({ type: 'logSet', sessionExerciseId: ex, loadKg: null, reps: 10 }).success).toBe(true);
    expect(sessionCommandSchema.safeParse({ type: 'logSet', sessionExerciseId: ex, loadKg: -5, reps: 10 }).success).toBe(false);
    expect(sessionCommandSchema.safeParse({ type: 'hack' }).success).toBe(false);
  });
});
