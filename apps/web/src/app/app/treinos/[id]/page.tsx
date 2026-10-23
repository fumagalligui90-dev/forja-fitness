'use client';

import type { WorkoutDTO } from '@forja/core';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WorkoutEditor } from '@/components/workout-editor';
import { Alert, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';

export default function EditWorkoutPage() {
  const { id } = useParams<{ id: string }>();
  const [workout, setWorkout] = useState<WorkoutDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<WorkoutDTO>(`/workouts/${id}`)
      .then(setWorkout)
      .catch((e) => setError(errorMessage(e)));
  }, [id]);

  if (error) return <Alert>{error}</Alert>;
  if (!workout) return <Spinner />;
  return <WorkoutEditor initial={workout} />;
}
