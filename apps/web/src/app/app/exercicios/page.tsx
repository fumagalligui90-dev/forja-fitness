'use client';

import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, type ExerciseDTO } from '@forja/core';
import { ChevronDown, Library, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { emptyFilter, ExerciseFilters, useExercises } from '@/components/exercise-filters';
import { ExerciseFormDialog } from '@/components/exercise-form';
import { Alert, Badge, Button, Card, cn, Dialog, EmptyState, PageHeader, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function ExercisesPage() {
  const [filter, setFilter] = useState(emptyFilter);
  const [reload, setReload] = useState(0);
  const { items, error, setItems } = useExercises(filter, reload);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseDTO | null>(null);
  const [archiving, setArchiving] = useState<ExerciseDTO | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
        subtitle="Biblioteca global + seus exercícios particulares."
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
          items.map((e) => (
            <Card key={e.id} className="overflow-hidden">
              <div className="flex items-center gap-2 p-3 pl-4">
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                  aria-expanded={expanded === e.id}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      {MUSCLE_GROUP_LABELS[e.muscleGroup]} · {EQUIPMENT_LABELS[e.equipment]} · {DIFFICULTY_LABELS[e.difficulty]}
                      {e.isOwn && <Badge tone="accent">Meu</Badge>}
                      {e.isDemo && <Badge title="Conteúdo de demonstração">Demo</Badge>}
                    </span>
                  </span>
                  <ChevronDown className={cn('size-5 shrink-0 text-faint transition', expanded === e.id && 'rotate-180')} />
                </button>
                <button
                  onClick={() => toggleFavorite(e)}
                  aria-label={e.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                  aria-pressed={e.isFavorite}
                  className="grid size-11 place-items-center rounded-xl hover:bg-surface-2"
                >
                  <Star className={cn('size-5', e.isFavorite ? 'fill-accent text-accent' : 'text-faint')} />
                </button>
              </div>
              {expanded === e.id && (
                <div className="border-t border-line px-4 py-3 text-sm text-muted">
                  {e.description && <p className="mb-2">{e.description}</p>}
                  <p className="whitespace-pre-line">{e.instructions || 'Sem instruções cadastradas.'}</p>
                  <p className="mt-2 text-xs text-faint">Mídia demonstrativa: indisponível (aguardando conteúdo licenciado).</p>
                  {e.isOwn && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" /> Editar
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setArchiving(e)}>
                        <Trash2 className="size-4" /> Remover
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

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
