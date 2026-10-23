'use client';

import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, type ExerciseDTO } from '@forja/core';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { emptyFilter, ExerciseFilters, useExercises, type ExerciseFilter } from './exercise-filters';
import { Alert, Badge, Button, cn, Dialog, Spinner } from './ui';

/**
 * Seletor de exercícios da biblioteca. `multiple` permite adicionar vários de
 * uma vez (montagem de treino); sem ele, escolhe um (substituição na sessão).
 */
export function ExercisePicker({
  open,
  onClose,
  onPick,
  multiple,
  title = 'Adicionar exercícios',
  initialMuscle,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (items: ExerciseDTO[]) => void;
  multiple?: boolean;
  title?: string;
  initialMuscle?: ExerciseDTO['muscleGroup'];
}) {
  const [filter, setFilter] = useState<ExerciseFilter>(emptyFilter);
  const { items, error } = useExercises(filter);
  const [selected, setSelected] = useState<Map<string, ExerciseDTO>>(new Map());

  // A cada abertura, recomeça a busca (no grupo muscular sugerido, se houver).
  useEffect(() => {
    if (open) {
      setFilter({ ...emptyFilter, muscleGroup: initialMuscle ?? '' });
      setSelected(new Map());
    }
  }, [open, initialMuscle]);

  function toggle(e: ExerciseDTO) {
    if (!multiple) {
      onPick([e]);
      return;
    }
    const next = new Map(selected);
    if (next.has(e.id)) next.delete(e.id);
    else next.set(e.id, e);
    setSelected(next);
  }

  function confirm() {
    onPick([...selected.values()]);
    setSelected(new Map());
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        multiple ? (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={confirm} disabled={selected.size === 0}>
              Adicionar {selected.size > 0 && `(${selected.size})`}
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4">
        <ExerciseFilters value={filter} onChange={setFilter} />
        {error && <Alert>{error}</Alert>}
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Nenhum exercício encontrado.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {items.map((e) => {
              const isSel = selected.has(e.id);
              return (
                <li key={e.id}>
                  <button
                    onClick={() => toggle(e)}
                    aria-pressed={multiple ? isSel : undefined}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition',
                      isSel ? 'border-accent bg-accent-soft' : 'border-line bg-surface-2 hover:border-faint',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{e.name}</span>
                      <span className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-muted">
                        {MUSCLE_GROUP_LABELS[e.muscleGroup]} · {EQUIPMENT_LABELS[e.equipment]}
                        {e.isOwn && <Badge tone="accent">Meu</Badge>}
                        {e.isDemo && <Badge>Demo</Badge>}
                      </span>
                    </span>
                    {multiple && (
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-md border',
                          isSel ? 'border-accent bg-accent text-accent-ink' : 'border-line',
                        )}
                      >
                        {isSel && <Check className="size-4" />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
