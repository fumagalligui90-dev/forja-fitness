'use client';

import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  type ExerciseDTO,
  type ExerciseInput,
} from '@forja/core';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { Alert, Button, Dialog, Field, Input, Select, Textarea } from './ui';

const blank: Required<ExerciseInput> = {
  name: '',
  description: '',
  muscleGroup: 'chest',
  equipment: 'dumbbell',
  difficulty: 'beginner',
  instructions: '',
};

/** Cria ou edita um exercício particular do usuário. */
export function ExerciseFormDialog({
  open,
  onClose,
  onSaved,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (e: ExerciseDTO) => void;
  editing?: ExerciseDTO | null;
}) {
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(
      editing
        ? {
            name: editing.name,
            description: editing.description,
            muscleGroup: editing.muscleGroup,
            equipment: editing.equipment,
            difficulty: editing.difficulty,
            instructions: editing.instructions,
          }
        : blank,
    );
  }, [open, editing]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const saved = editing
        ? await api<ExerciseDTO>(`/exercises/${editing.id}`, { method: 'PATCH', body: form })
        : await api<ExerciseDTO>('/exercises', { method: 'POST', body: form });
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Editar exercício' : 'Novo exercício'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="exercise-form" loading={pending}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="exercise-form" onSubmit={save} className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Nome" htmlFor="ex-name">
          <Input id="ex-name" required maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grupo muscular" htmlFor="ex-muscle">
            <Select
              id="ex-muscle"
              value={form.muscleGroup}
              onChange={(e) => setForm({ ...form, muscleGroup: e.target.value as typeof form.muscleGroup })}
            >
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_GROUP_LABELS[m]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Equipamento" htmlFor="ex-equip">
            <Select
              id="ex-equip"
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value as typeof form.equipment })}
            >
              {EQUIPMENT.map((m) => (
                <option key={m} value={m}>
                  {EQUIPMENT_LABELS[m]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Nível" htmlFor="ex-level">
          <Select
            id="ex-level"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value as typeof form.difficulty })}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Descrição (opcional)" htmlFor="ex-desc">
          <Textarea id="ex-desc" maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Instruções de execução (opcional)" htmlFor="ex-instr">
          <Textarea id="ex-instr" maxLength={3000} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} />
        </Field>
      </form>
    </Dialog>
  );
}
