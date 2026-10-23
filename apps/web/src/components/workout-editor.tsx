'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  TECHNIQUE_LABELS,
  TECHNIQUES,
  WEEKDAY_SHORT,
  workoutInputSchema,
  type ExerciseDTO,
  type Technique,
  type WorkoutDTO,
} from '@forja/core';
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, Plus, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { ExercisePicker } from './exercise-picker';
import { Alert, Button, Card, cn, Dialog, Field, Input, Select, Textarea } from './ui';

interface Item {
  uid: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: ExerciseDTO['muscleGroup'];
  equipment: ExerciseDTO['equipment'];
  sets: string;
  repsMin: string;
  repsMax: string;
  targetLoadKg: string;
  restSeconds: number;
  technique: Technique;
  notes: string;
}

const REST_OPTIONS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
const uid = () => Math.random().toString(36).slice(2, 10);

function fromDTO(w?: WorkoutDTO): Item[] {
  return (
    w?.exercises.map((e) => ({
      uid: uid(),
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      sets: String(e.sets),
      repsMin: String(e.repsMin),
      repsMax: String(e.repsMax),
      targetLoadKg: e.targetLoadKg == null ? '' : String(e.targetLoadKg),
      restSeconds: e.restSeconds,
      technique: e.technique,
      notes: e.notes,
    })) ?? []
  );
}

const restLabel = (s: number) => (s === 0 ? 'Sem descanso' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}min${s % 60 ? ` ${s % 60}s` : ''}`);
const num = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')));

export function WorkoutEditor({ initial }: { initial?: WorkoutDTO }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [items, setItems] = useState<Item[]>(() => fromDTO(initial));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Avisa antes de sair com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  const touch = () => {
    setDirty(true);
    setSaved(false);
  };
  const update = (id: string, patch: Partial<Item>) => {
    setItems((list) => list.map((i) => (i.uid === id ? { ...i, ...patch } : i)));
    touch();
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    setItems((list) => arrayMove(list, from, to));
    touch();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.uid === e.active.id);
    const to = items.findIndex((i) => i.uid === e.over!.id);
    move(from, to);
  }

  function addExercises(list: ExerciseDTO[]) {
    setItems((cur) => [
      ...cur,
      ...list.map((e) => ({
        uid: uid(),
        exerciseId: e.id,
        exerciseName: e.name,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        sets: '3',
        repsMin: e.muscleGroup === 'cardio' ? '1' : '8',
        repsMax: e.muscleGroup === 'cardio' ? '1' : '12',
        targetLoadKg: '',
        restSeconds: e.muscleGroup === 'cardio' ? 0 : 90,
        technique: 'normal' as const,
        notes: '',
      })),
    ]);
    setPickerOpen(false);
    touch();
  }

  async function save() {
    setError(null);
    const payload = {
      name,
      label,
      notes,
      weekdays,
      exercises: items.map((i) => ({
        exerciseId: i.exerciseId,
        sets: num(i.sets),
        repsMin: num(i.repsMin),
        repsMax: num(i.repsMax),
        targetLoadKg: i.targetLoadKg.trim() === '' ? null : num(i.targetLoadKg),
        restSeconds: i.restSeconds,
        technique: i.technique,
        notes: i.notes,
      })),
    };
    // Mesma validação do servidor (schema compartilhado), para feedback imediato.
    const check = workoutInputSchema.safeParse(payload);
    if (!check.success) {
      const issue = check.error.issues[0]!;
      const idx = issue.path[0] === 'exercises' ? Number(issue.path[1]) : -1;
      const where = idx >= 0 && items[idx] ? `${items[idx]!.exerciseName}: ` : '';
      const msg = issue.code === 'invalid_type' ? 'preencha os números' : issue.message;
      return setError(`${where}${msg}`);
    }
    setSaving(true);
    try {
      const w = initial
        ? await api<WorkoutDTO>(`/workouts/${initial.id}`, { method: 'PUT', body: payload })
        : await api<WorkoutDTO>('/workouts', { method: 'POST', body: payload });
      setDirty(false);
      setSaved(true);
      if (!initial) router.replace(`/app/treinos/${w.id}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!initial) return;
    try {
      await api(`/workouts/${initial.id}`, { method: 'DELETE' });
      setDirty(false);
      router.replace('/app/treinos');
    } catch (err) {
      setError(errorMessage(err));
      setConfirmDelete(false);
    }
  }

  return (
    <div className="pb-24">
      <Link href="/app/treinos" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4" /> Treinos
      </Link>
      <h1 className="mb-6 font-display text-3xl font-extrabold uppercase tracking-wide sm:text-4xl">
        {initial ? 'Editar treino' : 'Novo treino'}
      </h1>

      <Card className="mb-6 flex flex-col gap-4 p-4 sm:p-5">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Field label="Letra" htmlFor="w-label">
            <Select
              id="w-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                touch();
              }}
              className="w-20"
            >
              <option value="">—</option>
              {LABELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nome do treino" htmlFor="w-name">
            <Input
              id="w-name"
              placeholder="Ex.: Peito e Tríceps"
              maxLength={60}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                touch();
              }}
            />
          </Field>
        </div>
        <Field label="Dias da semana" hint="O treino aparece como “treino do dia” nesses dias.">
          <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Dias da semana">
            {WEEKDAY_SHORT.map((d, i) => {
              const on = weekdays.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    setWeekdays(on ? weekdays.filter((x) => x !== i) : [...weekdays, i]);
                    touch();
                  }}
                  className={cn(
                    'h-11 rounded-xl text-sm font-bold uppercase transition',
                    on ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted hover:text-text',
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Observações (opcional)" htmlFor="w-notes">
          <Textarea
            id="w-notes"
            maxLength={1000}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              touch();
            }}
          />
        </Field>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Exercícios ({items.length})</h2>
        <Button variant="secondary" onClick={() => setPickerOpen(true)}>
          <Plus className="size-4" /> Adicionar
        </Button>
      </div>

      {items.length === 0 ? (
        <button
          onClick={() => setPickerOpen(true)}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-10 text-muted hover:border-accent hover:text-text"
        >
          <Plus className="size-6" /> Adicionar exercícios da biblioteca
        </button>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.uid)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-3">
              {items.map((item, idx) => (
                <SortableItem
                  key={item.uid}
                  item={item}
                  index={idx}
                  total={items.length}
                  onChange={(p) => update(item.uid, p)}
                  onMove={(to) => move(idx, to)}
                  onRemove={() => {
                    setItems((l) => l.filter((i) => i.uid !== item.uid));
                    touch();
                  }}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      {initial && (
        <div className="mt-8">
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="size-4" /> Excluir treino
          </Button>
        </div>
      )}

      {/* Barra de salvar fixa (acima da navegação inferior no celular). */}
      <div className="fixed inset-x-0 bottom-16 z-20 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div className="min-w-0 flex-1 text-sm">
            {error ? (
              <span className="text-danger" role="alert">
                {error}
              </span>
            ) : saved ? (
              <span className="text-success">Treino salvo.</span>
            ) : dirty ? (
              <span className="text-warning">Alterações não salvas</span>
            ) : null}
          </div>
          <Button onClick={save} loading={saving} size="lg">
            {!saving && <Save className="size-5" />} Salvar
          </Button>
        </div>
      </div>

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={addExercises} multiple />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir treino"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={remove}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-muted">O treino sai da sua lista. As sessões já realizadas continuam no histórico.</p>
      </Dialog>
    </div>
  );
}

function SortableItem({
  item,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  item: Item;
  index: number;
  total: number;
  onChange: (p: Partial<Item>) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const numInput = (key: 'sets' | 'repsMin' | 'repsMax' | 'targetLoadKg', label: string, opts: { decimal?: boolean; placeholder?: string } = {}) => (
    <Field label={label} htmlFor={`${item.uid}-${key}`}>
      <Input
        id={`${item.uid}-${key}`}
        inputMode={opts.decimal ? 'decimal' : 'numeric'}
        placeholder={opts.placeholder}
        value={item[key]}
        onChange={(e) => onChange({ [key]: e.target.value.replace(opts.decimal ? /[^\d.,]/g : /\D/g, '') })}
        className="tabular text-center text-base"
      />
    </Field>
  );

  return (
    <li ref={setNodeRef} style={style} className={cn('rounded-2xl border border-line bg-surface', isDragging && 'relative z-10 shadow-2xl ring-2 ring-accent')}>
      <div className="flex items-center gap-2 border-b border-line px-2 py-2">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Arrastar ${item.exerciseName}`}
          className="grid size-10 cursor-grab touch-none place-items-center rounded-lg text-faint hover:bg-surface-2 hover:text-text active:cursor-grabbing"
        >
          <GripVertical className="size-5" />
        </button>
        <span className="font-display text-lg font-bold text-accent">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.exerciseName}</p>
          <p className="text-xs text-faint">
            {MUSCLE_GROUP_LABELS[item.muscleGroup]} · {EQUIPMENT_LABELS[item.equipment]}
          </p>
        </div>
        <button onClick={() => onMove(index - 1)} disabled={index === 0} aria-label="Mover para cima" className="grid size-9 place-items-center rounded-lg text-faint hover:bg-surface-2 disabled:opacity-30">
          <ArrowUp className="size-4" />
        </button>
        <button onClick={() => onMove(index + 1)} disabled={index === total - 1} aria-label="Mover para baixo" className="grid size-9 place-items-center rounded-lg text-faint hover:bg-surface-2 disabled:opacity-30">
          <ArrowDown className="size-4" />
        </button>
        <button onClick={onRemove} aria-label={`Remover ${item.exerciseName}`} className="grid size-9 place-items-center rounded-lg text-faint hover:bg-danger/15 hover:text-danger">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
        {numInput('sets', 'Séries')}
        <div className="grid grid-cols-2 gap-2">
          {numInput('repsMin', 'Reps mín.')}
          {numInput('repsMax', 'Reps máx.')}
        </div>
        {numInput('targetLoadKg', 'Carga (kg)', { decimal: true, placeholder: '—' })}
        <Field label="Descanso" htmlFor={`${item.uid}-rest`}>
          <Select id={`${item.uid}-rest`} value={item.restSeconds} onChange={(e) => onChange({ restSeconds: Number(e.target.value) })}>
            {(REST_OPTIONS.includes(item.restSeconds) ? REST_OPTIONS : [...REST_OPTIONS, item.restSeconds].sort((a, b) => a - b)).map((s) => (
              <option key={s} value={s}>
                {restLabel(s)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Técnica" htmlFor={`${item.uid}-tech`}>
          <Select id={`${item.uid}-tech`} value={item.technique} onChange={(e) => onChange({ technique: e.target.value as Technique })}>
            {TECHNIQUES.map((t) => (
              <option key={t} value={t}>
                {TECHNIQUE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="col-span-2 sm:col-span-3">
          <Field label="Observações" htmlFor={`${item.uid}-notes`}>
            <Input id={`${item.uid}-notes`} maxLength={500} placeholder="Ex.: cadência 3-1-1, pegada fechada" value={item.notes} onChange={(e) => onChange({ notes: e.target.value })} />
          </Field>
        </div>
      </div>
    </li>
  );
}
