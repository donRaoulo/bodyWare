import { parseJson } from './database';
import { ExerciseSession } from './types';

type SessionType = ExerciseSession['type'];

export function toSessionPayload(exercise: ExerciseSession): Record<string, unknown> | null {
  switch (exercise.type) {
    case 'strength':
      return exercise.strength ? { sets: exercise.strength.sets ?? [] } : null;
    case 'cardio':
      return exercise.cardio ? { ...exercise.cardio } : null;
    case 'endurance':
      return exercise.endurance ? { ...exercise.endurance } : null;
    case 'stretch':
      return exercise.stretch ? { completed: Boolean(exercise.stretch.completed) } : null;
    case 'counter':
      return exercise.counter ? { value: Number(exercise.counter.value ?? 0) } : null;
    default:
      return null;
  }
}

export function fromSessionPayloadRow(row: any): ExerciseSession {
  const type = (row.exercise_type ?? row.type) as SessionType;
  const payload =
    parseJson<Record<string, unknown>>(row.payload) ??
    // Legacy fallback to support pre-v2 rows while migrating.
    parseJson<Record<string, unknown>>(
      row.strength_data ?? row.cardio_data ?? row.endurance_data ?? row.stretch_data ?? row.counter_data
    ) ??
    {};

  const exerciseSession: ExerciseSession = {
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    type,
  };

  if (type === 'strength') {
    const sets = Array.isArray((payload as any).sets) ? ((payload as any).sets as Array<{ weight: number; reps: number }>) : [];
    exerciseSession.strength = { sets };
  }

  if (type === 'cardio') {
    exerciseSession.cardio = {
      time: Number((payload as any).time ?? 0),
      level: Number((payload as any).level ?? 0),
      distance: Number((payload as any).distance ?? 0),
    };
  }

  if (type === 'endurance') {
    exerciseSession.endurance = {
      time: Number((payload as any).time ?? 0),
      distance: Number((payload as any).distance ?? 0),
      pace: Number((payload as any).pace ?? 0),
    };
  }

  if (type === 'stretch') {
    exerciseSession.stretch = {
      completed: Boolean((payload as any).completed),
    };
  }

  if (type === 'counter') {
    exerciseSession.counter = {
      value: Number((payload as any).value ?? 0),
    };
  }

  return exerciseSession;
}
