'use client';

import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  type Equipment,
  type ExerciseDTO,
  type MuscleGroup,
} from '@forja/core';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { cn, Input, Select } from './ui';

export interface ExerciseFilter {
  q: string;
  muscleGroup: MuscleGroup | '';
  equipment: Equipment | '';
  scope: 'all' | 'mine' | 'favorites';
}

export const emptyFilter: ExerciseFilter = { q: '', muscleGroup: '', equipment: '', scope: 'all' };

/** Busca na API com debounce; recarrega quando `reloadKey` muda. */
export function useExercises(filter: ExerciseFilter, reloadKey = 0) {
  const [items, setItems] = useState<ExerciseDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams();
    if (filter.q.trim()) params.set('q', filter.q.trim());
    if (filter.muscleGroup) params.set('muscleGroup', filter.muscleGroup);
    if (filter.equipment) params.set('equipment', filter.equipment);
    params.set('scope', filter.scope);
    const t = setTimeout(() => {
      api<ExerciseDTO[]>(`/exercises?${params}`, { signal: ctrl.signal })
        .then((r) => {
          setItems(r);
          setError(null);
        })
        .catch((e) => {
          if ((e as Error).name !== 'AbortError') setError(errorMessage(e));
        });
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [filter.q, filter.muscleGroup, filter.equipment, filter.scope, reloadKey]);
  return { items, error, setItems };
}

export function ExerciseFilters({ value, onChange }: { value: ExerciseFilter; onChange: (f: ExerciseFilter) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
        <Input
          type="search"
          placeholder="Buscar por nome, músculo ou equipamento"
          aria-label="Buscar exercícios"
          value={value.q}
          onChange={(e) => onChange({ ...value, q: e.target.value })}
          className="pl-10"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Select
          aria-label="Grupo muscular"
          value={value.muscleGroup}
          onChange={(e) => onChange({ ...value, muscleGroup: e.target.value as MuscleGroup | '' })}
        >
          <option value="">Todos os músculos</option>
          {MUSCLE_GROUPS.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_GROUP_LABELS[m]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Equipamento"
          value={value.equipment}
          onChange={(e) => onChange({ ...value, equipment: e.target.value as Equipment | '' })}
        >
          <option value="">Todo equipamento</option>
          {EQUIPMENT.map((m) => (
            <option key={m} value={m}>
              {EQUIPMENT_LABELS[m]}
            </option>
          ))}
        </Select>
        <div className="col-span-2 flex rounded-xl border border-line bg-surface-2 p-1 sm:col-span-1" role="tablist">
          {(
            [
              ['all', 'Todos'],
              ['favorites', 'Favoritos'],
              ['mine', 'Meus'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              role="tab"
              aria-selected={value.scope === k}
              onClick={() => onChange({ ...value, scope: k })}
              className={cn(
                'flex-1 rounded-lg py-1.5 text-sm font-semibold transition',
                value.scope === k ? 'bg-surface-3 text-text' : 'text-faint hover:text-text',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
