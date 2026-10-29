'use client';

import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, type Difficulty, type ExerciseDTO } from '@forja/core';
import { Library, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { emptyFilter, ExerciseFilters, useExercises } from '@/components/exercise-filters';
import { ExerciseFormDialog } from '@/components/exercise-form';
import { ExerciseAnimation, MuscleChips, MuscleMap } from '@/components/exercise-visuals';
import { Alert, Badge, Button, cn, Dialog, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function ExercisesPage() {
  const [filter, setFilter] = useState(emptyFilter);
  const [reload, setReload] = useState(0);
  const { items, error, setItems } = useExercises(filter, reload);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseDTO | null>(null);
  const [archiving, setArchiving] = useState<ExerciseDTO | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const opened = items?.find((x) => x.id === openId) ?? null;

  async function toggleFavorite(e: ExerciseDTO) {
    // Atualização otimista, revertida em caso de erro.
    setItems((list) => list?.map((x) => (x.id === e.id ? { ...x, isFavorite: !e.isFavorite } : x)) ?? null);
    try {
      await api(`/exercises/${e.id}/favorite`, { method: 'PUT', body: { favorite: !e.isFavorite } });
    } catch (err) {
      setItems((list) => list?.map((x) => (x.id === e.id ? { ...x, isFavorite: e.isFavorite } : x)) ?? null);
      setActionError(errorMessage(err));
    }
  }

  async function archive() {
    if (!archiving) return;
    try {
      await api(`/exercises/${archiving.id}`, { method: 'DELETE' });
      setArchiving(null);
      setReload((n) => n + 1);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        title="Exercícios"
        subtitle="Veja como fazer cada movimento e quais músculos ele trabalha."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo exercício
          </Button>
        }
      />
      <ExerciseFilters value={filter} onChange={setFilter} />

      <div className="mt-5 flex flex-col gap-2">
        {actionError && <Alert>{actionError}</Alert>}
        {error && <Alert>{error}</Alert>}
        {!items ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState icon={<Library className="size-8" />} title="Nada por aqui">
            {filter.scope === 'favorites'
              ? 'Toque na estrela de um exercício para favoritá-lo.'
              : filter.scope === 'mine'
                ? 'Crie exercícios próprios para equipamentos ou variações que não estão na biblioteca.'
                : 'Nenhum exercício corresponde à busca.'}
          </EmptyState>
        ) : (
          <>
            <p className="text-xs text-faint">
              {items.length} {items.length === 1 ? 'exercício' : 'exercícios'}
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((e) => (
                <li key={e.id}>
                  <ExerciseCard exercise={e} onOpen={() => setOpenId(e.id)} onFavorite={() => toggleFavorite(e)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ExerciseDetailDialog
        exercise={opened}
        onClose={() => setOpenId(null)}
        onFavorite={() => opened && toggleFavorite(opened)}
        onEdit={() => {
          if (!opened) return;
          setEditing(opened);
          setOpenId(null);
          setFormOpen(true);
        }}
        onArchive={() => {
          if (!opened) return;
          setArchiving(opened);
          setOpenId(null);
        }}
      />

      <ExerciseFormDialog
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          setReload((n) => n + 1);
        }}
      />

      <Dialog
        open={!!archiving}
        onClose={() => setArchiving(null)}
        title="Remover exercício"
        footer={
          <>
            <Button variant="ghost" onClick={() => setArchiving(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={archive}>
              Remover
            </Button>
          </>
        }
      >
        <p className="text-muted">
          <strong className="text-text">{archiving?.name}</strong> deixará de aparecer na biblioteca. Treinos e históricos que já o usam
          continuam intactos.
        </p>
      </Dialog>
    </div>
  );
}

const DIFFICULTY_DOTS: Record<Difficulty, number> = { beginner: 1, intermediate: 2, advanced: 3 };

function DifficultyMeter({ value }: { value: Difficulty }) {
  return (
    <span className="inline-flex items-center gap-1" title={DIFFICULTY_LABELS[value]}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={cn('h-1.5 w-3 rounded-full', n <= DIFFICULTY_DOTS[value] ? 'bg-accent' : 'bg-surface-3')} />
      ))}
      <span className="sr-only">{DIFFICULTY_LABELS[value]}</span>
    </span>
  );
}

function FavoriteButton({ exercise, onClick, className }: { exercise: ExerciseDTO; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={exercise.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      aria-pressed={exercise.isFavorite}
      className={cn('grid size-10 place-items-center rounded-xl transition', className)}
    >
      <Star className={cn('size-5', exercise.isFavorite ? 'fill-accent text-accent' : 'text-current')} />
    </button>
  );
}

function ExerciseCard({ exercise: e, onOpen, onFavorite }: { exercise: ExerciseDTO; onOpen: () => void; onFavorite: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:-translate-y-0.5 hover:border-faint hover:shadow-xl hover:shadow-black/30"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      <button onClick={onOpen} className="flex flex-1 flex-col text-left" aria-label={`Ver ${e.name}`}>
        <ExerciseAnimation exercise={e} playing={hover} className="aspect-[4/3] w-full" />
        <span className="flex flex-1 flex-col gap-1.5 p-3">
          <span className="line-clamp-2 text-sm font-semibold leading-snug">{e.name}</span>
          <span className="mt-auto flex items-center justify-between gap-2 text-xs text-muted">
            <span className="truncate">
              {MUSCLE_GROUP_LABELS[e.muscleGroup]} · {EQUIPMENT_LABELS[e.equipment]}
            </span>
            <DifficultyMeter value={e.difficulty} />
          </span>
        </span>
      </button>
      <FavoriteButton
        exercise={e}
        onClick={onFavorite}
        className="absolute right-1.5 top-1.5 bg-black/45 text-white backdrop-blur hover:bg-black/65"
      />
      {e.isOwn && (
        <Badge tone="accent" className="pointer-events-none absolute left-2 top-2">
          Meu
        </Badge>
      )}
    </div>
  );
}

function ExerciseDetailDialog({
  exercise: e,
  onClose,
  onFavorite,
  onEdit,
  onArchive,
}: {
  exercise: ExerciseDTO | null;
  onClose: () => void;
  onFavorite: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const steps = (e?.instructions ?? '')
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <Dialog open={!!e} onClose={onClose} title={e?.name ?? ''} wide>
      {e && (
        <div className="flex flex-col gap-5">
          <div className={cn('grid items-start gap-4', e.images.length > 0 && 'sm:grid-cols-[1.35fr_1fr]')}>
            {e.images.length > 0 && <ExerciseAnimation exercise={e} className="aspect-[4/3] w-full rounded-xl" />}
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Músculos trabalhados</p>
              <MuscleMap exercise={e} className={cn('px-2', e.images.length === 0 && 'mx-auto w-full max-w-xs')} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge>{MUSCLE_GROUP_LABELS[e.muscleGroup]}</Badge>
            <Badge>{EQUIPMENT_LABELS[e.equipment]}</Badge>
            <Badge className="gap-2">
              {DIFFICULTY_LABELS[e.difficulty]} <DifficultyMeter value={e.difficulty} />
            </Badge>
            {e.isOwn && <Badge tone="accent">Meu</Badge>}
            <span className="flex-1" />
            <Button size="sm" variant="secondary" onClick={onFavorite} aria-pressed={e.isFavorite}>
              <Star className={cn('size-4', e.isFavorite && 'fill-accent text-accent')} />
              {e.isFavorite ? 'Favorito' : 'Favoritar'}
            </Button>
          </div>

          <MuscleChips exercise={e} />

          <section>
            <h3 className="mb-2 font-display text-lg font-bold uppercase tracking-wide">Como fazer</h3>
            {e.description && <p className="mb-2 text-sm text-muted">{e.description}</p>}
            {steps.length ? (
              <ol className="flex flex-col gap-2">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted">Sem instruções cadastradas.</p>
            )}
          </section>

          {e.images.length > 0 && (
            <p className="text-[11px] text-faint">
              Fotos:{' '}
              <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer" className="underline hover:text-muted">
                Free Exercise DB
              </a>{' '}
              (domínio público).
            </p>
          )}

          {e.isOwn && (
            <div className="flex gap-2 border-t border-line pt-4">
              <Button size="sm" variant="secondary" onClick={onEdit}>
                <Pencil className="size-4" /> Editar
              </Button>
              <Button size="sm" variant="danger" onClick={onArchive}>
                <Trash2 className="size-4" /> Remover
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
