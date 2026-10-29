'use client';

import {
  exerciseMuscles,
  MUSCLE_LABELS,
  MUSCLE_MAP,
  MUSCLE_MAP_VIEWBOX,
  type ExerciseDTO,
  type Muscle,
} from '@forja/core';
import { Dumbbell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from './ui';

// ------------------------------------------------------------------ Mapa muscular

function Body({ view, primary, secondary }: { view: 'front' | 'back'; primary: Muscle[]; secondary: Muscle[] }) {
  const side = MUSCLE_MAP[view];
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg viewBox={MUSCLE_MAP_VIEWBOX} className="h-auto w-full max-w-32" role="img" aria-label={view === 'front' ? 'Corpo de frente' : 'Corpo de costas'}>
        {side.neutral.map((d, i) => (
          <path key={i} d={d} className="fill-surface-3" />
        ))}
        {side.regions.map(([m, d], i) => (
          <path
            key={i}
            d={d}
            className={cn(
              'transition-colors',
              primary.includes(m) ? 'fill-accent' : secondary.includes(m) ? 'fill-accent/55' : 'fill-[color-mix(in_oklab,var(--surface-3)_70%,var(--faint))]',
            )}
          >
            <title>{MUSCLE_LABELS[m]}</title>
          </path>
        ))}
      </svg>
      <figcaption className="text-[11px] font-semibold uppercase tracking-wider text-faint">{view === 'front' ? 'Frente' : 'Costas'}</figcaption>
    </figure>
  );
}

/** Frente e costas com músculos principais (cheio) e secundários (claro). */
export function MuscleMap({ exercise, className }: { exercise: ExerciseDTO; className?: string }) {
  const { primary, secondary } = exerciseMuscles(exercise);
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <Body view="front" primary={primary} secondary={secondary} />
      <Body view="back" primary={primary} secondary={secondary} />
    </div>
  );
}

export function MuscleChips({ exercise }: { exercise: ExerciseDTO }) {
  const { primary, secondary } = exerciseMuscles(exercise);
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
          <span className="size-2.5 rounded-full bg-accent" aria-hidden /> Principal
        </p>
        <div className="flex flex-wrap gap-1.5">
          {primary.map((m) => (
            <span key={m} className="rounded-lg bg-accent-soft px-2 py-1 text-xs font-semibold text-accent">
              {MUSCLE_LABELS[m]}
            </span>
          ))}
        </div>
      </div>
      {secondary.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            <span className="size-2.5 rounded-full bg-accent/55" aria-hidden /> Secundário
          </p>
          <div className="flex flex-wrap gap-1.5">
            {secondary.map((m) => (
              <span key={m} className="rounded-lg bg-surface-3 px-2 py-1 text-xs font-semibold text-muted">
                {MUSCLE_LABELS[m]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ Fotos / animação

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/**
 * Alterna as fotos de posição inicial e final, formando uma animação simples
 * do movimento. `playing = false` mostra só a primeira (miniaturas).
 */
export function ExerciseAnimation({
  exercise,
  playing = true,
  className,
}: {
  exercise: ExerciseDTO;
  playing?: boolean;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const frames = exercise.images;
  const animate = playing && !reduced && frames.length > 1;

  useEffect(() => {
    if (!animate) {
      setFrame(0);
      return;
    }
    const t = setInterval(() => setFrame((f) => (f + 1) % frames.length), 1100);
    return () => clearInterval(t);
  }, [animate, frames.length]);

  if (frames.length === 0) {
    return (
      <div className={cn('relative grid place-items-center overflow-hidden bg-surface-2', className)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--accent-soft),transparent_70%)]" aria-hidden />
        <MuscleMap exercise={exercise} className="relative w-3/4 max-w-56 py-3" />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-white', className)}>
      {frames.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={i === 0 ? `${exercise.name}: posição inicial` : `${exercise.name}: posição final`}
          loading="lazy"
          decoding="async"
          className={cn(
            'absolute inset-0 size-full object-cover transition-opacity duration-300',
            i === frame ? 'opacity-100' : 'opacity-0',
          )}
        />
      ))}
      {frames.length > 1 && playing && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2 py-1.5 backdrop-blur" aria-hidden>
          {frames.map((_, i) => (
            <span key={i} className={cn('size-1.5 rounded-full transition', i === frame ? 'bg-accent' : 'bg-white/60')} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Miniatura quadrada para listas: primeira foto ou um ícone. */
export function ExerciseThumb({ exercise, className }: { exercise: ExerciseDTO; className?: string }) {
  const src = exercise.images[0];
  return (
    <span className={cn('relative block shrink-0 overflow-hidden rounded-lg bg-surface-3', className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <Dumbbell className="absolute left-1/2 top-1/2 size-1/2 -translate-x-1/2 -translate-y-1/2 text-faint" aria-hidden />
      )}
    </span>
  );
}
