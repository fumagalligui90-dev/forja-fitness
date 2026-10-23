import type { Metadata } from 'next';
import { WorkoutEditor } from '@/components/workout-editor';

export const metadata: Metadata = { title: 'Novo treino' };

export default function NewWorkoutPage() {
  return <WorkoutEditor />;
}
