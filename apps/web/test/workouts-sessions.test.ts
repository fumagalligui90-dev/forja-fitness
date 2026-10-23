import { computeVolume, elapsedMs, restState } from '@forja/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withUser, type DbHandle } from '@/db/client';
import { HttpError } from '@/server/http';
import { createExercise, listExercises, updateExercise } from '@/server/services/exercises';
import { applyCommand, getActiveSession, getSession, listSessions, startSession } from '@/server/services/sessions';
import { getDashboard } from '@/server/services/dashboard';
import { createWorkout, duplicateWorkout, getWorkout, listWorkouts, updateWorkout } from '@/server/services/workouts';
import { createTestDb, createUser } from './helpers';

let h: DbHandle;
const as = <T>(userId: string, fn: Parameters<typeof withUser<T>>[2]) => withUser(h.db, userId, fn);

beforeAll(async () => {
  h = await createTestDb();
  await createUser(h, 'ana', 'Ana');
  await createUser(h, 'bia', 'Bia');
});
afterAll(() => h.close());

async function demoIds(n: number) {
  const list = await as('ana', (tx) => listExercises(tx, 'ana', { scope: 'all' }));
  return list.slice(0, n).map((e) => e.id);
}

const expectHttp = async (p: Promise<unknown>, status: number) => {
  const err = await p.then(() => null, (e) => e);
  expect(err).toBeInstanceOf(HttpError);
  expect((err as HttpError).status).toBe(status);
};

describe('biblioteca de exercícios', () => {
  it('busca sem acento por nome e por grupo muscular', async () => {
    const byName = await as('ana', (tx) => listExercises(tx, 'ana', { q: 'triceps polia', scope: 'all' }));
    expect(byName.map((e) => e.name)).toEqual([]); // frase inteira não casa
    const byWord = await as('ana', (tx) => listExercises(tx, 'ana', { q: 'TRICEPS', scope: 'all' }));
    expect(byWord.length).toBeGreaterThanOrEqual(3);
    expect(byWord.every((e) => e.muscleGroup === 'triceps' || /tr[ií]ceps/i.test(e.name))).toBe(true);
  });

  it('exercício particular é invisível a outros e global é imutável', async () => {
    const mine = await as('ana', (tx) =>
      createExercise(tx, 'ana', { name: 'Supino da Ana', muscleGroup: 'chest', equipment: 'machine', difficulty: 'beginner', description: '', instructions: '' }),
    );
    expect(mine.isOwn).toBe(true);
    const biaSees = await as('bia', (tx) => listExercises(tx, 'bia', { q: 'Supino da Ana', scope: 'all' }));
    expect(biaSees).toHaveLength(0);

    const [globalEx] = await demoIds(1);
    await expectHttp(
      as('ana', (tx) => updateExercise(tx, 'ana', globalEx!, { name: 'X', muscleGroup: 'chest', equipment: 'machine', difficulty: 'beginner', description: '', instructions: '' })),
      403,
    );
    await expectHttp(
      as('bia', (tx) => updateExercise(tx, 'bia', mine.id, { name: 'X', muscleGroup: 'chest', equipment: 'machine', difficulty: 'beginner', description: '', instructions: '' })),
      404,
    );
  });
});

describe('treinos', () => {
  it('cria, edita atomicamente, duplica e isola entre usuários', async () => {
    const [e1, e2, e3] = await demoIds(3);
    const w = await as('ana', (tx) =>
      createWorkout(tx, 'ana', {
        name: 'Peito e Tríceps',
        label: 'A',
        notes: '',
        weekdays: [1, 4],
        exercises: [
          { exerciseId: e1!, sets: 3, repsMin: 8, repsMax: 12, targetLoadKg: 40, restSeconds: 90, technique: 'normal', notes: '' },
          { exerciseId: e2!, sets: 4, repsMin: 10, repsMax: 10, targetLoadKg: null, restSeconds: 60, technique: 'drop_set', notes: 'última com drop' },
        ],
      }),
    );
    expect(w.exercises.map((e) => e.position)).toEqual([0, 1]);

    // Reordenar + trocar exercício
    const updated = await as('ana', (tx) =>
      updateWorkout(tx, 'ana', w.id, {
        name: 'Peito e Tríceps',
        label: 'A',
        notes: '',
        weekdays: [1, 4],
        exercises: [
          { exerciseId: e3!, sets: 2, repsMin: 12, repsMax: 15, targetLoadKg: 10, restSeconds: 45, technique: 'normal', notes: '' },
          { exerciseId: e1!, sets: 3, repsMin: 8, repsMax: 12, targetLoadKg: 40, restSeconds: 90, technique: 'normal', notes: '' },
        ],
      }),
    );
    expect(updated.exercises.map((e) => e.exerciseId)).toEqual([e3, e1]);

    // Edição inválida (exercício inexistente) não destrói a versão anterior
    await expectHttp(
      as('ana', (tx) =>
        updateWorkout(tx, 'ana', w.id, {
          name: 'Quebrado',
          label: 'A',
          notes: '',
          weekdays: [],
          exercises: [{ exerciseId: '00000000-0000-4000-8000-000000000000', sets: 1, repsMin: 1, repsMax: 1, targetLoadKg: null, restSeconds: 0, technique: 'normal', notes: '' }],
        }),
      ),
      400,
    );
    const still = await as('ana', (tx) => getWorkout(tx, 'ana', w.id));
    expect(still.name).toBe('Peito e Tríceps');
    expect(still.exercises).toHaveLength(2);

    const copy = await as('ana', (tx) => duplicateWorkout(tx, 'ana', w.id));
    expect(copy.name).toBe('Peito e Tríceps (cópia)');
    expect(copy.exercises).toHaveLength(2);

    const summaries = await as('ana', (tx) => listWorkouts(tx));
    expect(summaries.find((s) => s.id === w.id)).toMatchObject({ exerciseCount: 2, totalSets: 5, lastPerformedAt: null });

    await expectHttp(as('bia', (tx) => getWorkout(tx, 'bia', w.id)), 404);
    expect(await as('bia', (tx) => listWorkouts(tx))).toHaveLength(0);
  });
});

describe('modo treino', () => {
  it('fluxo completo: início, séries, descanso, pausa, edição, resumo', async () => {
    const [e1, e2] = await demoIds(2);
    const w = await as('ana', (tx) =>
      createWorkout(tx, 'ana', {
        name: 'Treino B',
        label: 'B',
        notes: '',
        weekdays: [],
        exercises: [
          { exerciseId: e1!, sets: 2, repsMin: 10, repsMax: 10, targetLoadKg: 20, restSeconds: 60, technique: 'normal', notes: '' },
          { exerciseId: e2!, sets: 1, repsMin: 15, repsMax: 15, targetLoadKg: null, restSeconds: 0, technique: 'normal', notes: '' },
        ],
      }),
    );
    const t0 = new Date('2026-10-20T10:00:00Z');
    const at = (sec: number) => new Date(t0.getTime() + sec * 1000);

    let s = await as('ana', (tx) => startSession(tx, 'ana', w.id, t0));
    expect(s.status).toBe('active');
    expect(s.exercises).toHaveLength(2);
    const [x1, x2] = s.exercises;

    // Não pode abrir outra sessão
    await expectHttp(as('ana', (tx) => startSession(tx, 'ana', w.id, at(1))), 409);
    // Outro usuário não acessa a sessão
    await expectHttp(as('bia', (tx) => getSession(tx, 'bia', s.id)), 404);

    // Finalizar série → descanso automático de 60 s
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'logSet', sessionExerciseId: x1!.id, loadKg: 20, reps: 10, notes: '' }, at(30)));
    expect(s.exercises[0]!.sets).toHaveLength(1);
    expect(s.status).toBe('active'); // finalizar série NÃO finaliza o treino
    expect(restState({ endsAt: Date.parse(s.rest.endsAt!), pausedRemainingMs: null }, at(40).getTime()))
      .toEqual({ state: 'running', remainingMs: 50_000 });

    // Pausar descanso, retomar, adicionar 15 s
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'restPause' }, at(40)));
    expect(s.rest.pausedRemainingMs).toBe(50_000);
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'restResume' }, at(100)));
    expect(Date.parse(s.rest.endsAt!)).toBe(at(150).getTime());
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'restAdd', seconds: 15 }, at(100)));
    expect(Date.parse(s.rest.endsAt!)).toBe(at(165).getTime());

    // Pausar o treino inteiro congela descanso e bloqueia registro
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'pause' }, at(110)));
    expect(s.status).toBe('paused');
    expect(s.rest.pausedRemainingMs).toBe(55_000);
    await expectHttp(
      as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'logSet', sessionExerciseId: x1!.id, loadKg: 20, reps: 10, notes: '' }, at(120))),
      409,
    );
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'resume' }, at(410)));
    expect(s.pausedTotalMs).toBe(300_000);
    expect(Date.parse(s.rest.endsAt!)).toBe(at(465).getTime());

    // Retomada após "fechar o app": a sessão aberta continua disponível
    expect((await as('ana', (tx) => getActiveSession(tx, 'ana')))?.id).toBe(s.id);

    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'restSkip' }, at(420)));
    expect(s.rest.endsAt).toBeNull();
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'logSet', sessionExerciseId: x1!.id, loadKg: 22.5, reps: 8, notes: '' }, at(500)));

    // Editar série guarda histórico
    const firstSet = s.exercises[0]!.sets[0]!;
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'editSet', setId: firstSet.id, loadKg: 21, reps: 10, notes: 'corrigido' }, at(510)));
    expect(s.exercises[0]!.sets[0]).toMatchObject({ loadKg: 21, reps: 10, revision: 2 });

    // Próximo exercício, série sem carga (peso corporal) → sem descanso configurado
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'goTo', index: 1 }, at(520)));
    expect(s.currentIndex).toBe(1);
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'logSet', sessionExerciseId: x2!.id, loadKg: null, reps: 15, notes: '' }, at(560)));
    expect(s.rest.endsAt).toBeNull();

    // Finalizar o treino
    s = await as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'finish', notes: 'Bom treino', endAtLastSet: false }, at(600)));
    expect(s.status).toBe('completed');
    expect(elapsedMs({ startedAt: t0.getTime(), endedAt: Date.parse(s.endedAt!), pausedAt: null, pausedTotalMs: s.pausedTotalMs }, 0)).toBe(300_000);
    const vol = computeVolume(s.exercises.flatMap((e) => e.sets));
    expect(vol).toMatchObject({ volumeKg: 21 * 10 + 22.5 * 8, countedSets: 2, missingSets: 1 });

    // Sessão encerrada não aceita comandos
    await expectHttp(as('ana', (tx) => applyCommand(tx, 'ana', s.id, { type: 'pause' }, at(700))), 409);

    const [hist] = await as('ana', (tx) => listSessions(tx, 'ana'));
    expect(hist).toMatchObject({ id: s.id, setCount: 3, volumeKg: 390, durationMs: 300_000 });

    // Próxima sessão mostra carga/reps anteriores
    const next = await as('ana', (tx) => startSession(tx, 'ana', w.id, at(86_400)));
    expect(next.exercises[0]!.previous?.sets).toEqual([
      { loadKg: 21, reps: 10 },
      { loadKg: 22.5, reps: 8 },
    ]);

    // Substituição só antes de registrar séries
    const [, , e3] = await demoIds(3);
    const sub = await as('ana', (tx) => applyCommand(tx, 'ana', next.id, { type: 'substitute', sessionExerciseId: next.exercises[1]!.id, exerciseId: e3! }, at(86_410)));
    expect(sub.exercises[1]).toMatchObject({ exerciseId: e3, originalExerciseId: e2 });

    // Descartar sessão
    const ab = await as('ana', (tx) => applyCommand(tx, 'ana', next.id, { type: 'abandon' }, at(86_500)));
    expect(ab.status).toBe('abandoned');
    expect(await as('ana', (tx) => getActiveSession(tx, 'ana'))).toBeNull();

    // Sessão esquecida aberta: finalizar encerra no horário da última série, não "agora"
    const forgotten = await as('ana', (tx) => startSession(tx, 'ana', w.id, at(87_000)));
    await as('ana', (tx) =>
      applyCommand(tx, 'ana', forgotten.id, { type: 'logSet', sessionExerciseId: forgotten.exercises[0]!.id, loadKg: 20, reps: 10, notes: '' }, at(87_600)),
    );
    const closedLate = await as('ana', (tx) =>
      applyCommand(tx, 'ana', forgotten.id, { type: 'finish', notes: '', endAtLastSet: true }, at(87_000 + 36_000)),
    );
    expect(Date.parse(closedLate.endedAt!)).toBe(at(87_600).getTime());
    await as('ana', (tx) => applyCommand(tx, 'ana', forgotten.id, { type: 'abandon' }, at(87_000 + 36_001))).catch(() => null);

    // Dashboard reflete os dados reais
    const dash = await as('ana', (tx) => getDashboard(tx, { id: 'ana', name: 'Ana' }, 'America/Sao_Paulo', at(90_000)));
    expect(dash.stats.completedSessions).toBe(2);
    expect(dash.stats.totalTrainingMs).toBe(300_000 + 600_000);
    expect(dash.lastSession?.id).toBe(forgotten.id);
    expect(dash.activeSession).toBeNull();
  });
});
