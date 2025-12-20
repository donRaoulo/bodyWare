export type ExerciseType = 'strength' | 'cardio' | 'endurance' | 'stretch';

export interface Exercise {
  id: string;
  userId?: string | null;
  name: string;
  type: ExerciseType;
  createdAt: Date;
  isDefault: boolean;
}

export interface WorkoutTemplate {
  id: string;
  userId: string;
  name: string;
  exerciseIds: string[];
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  templateId: string;
  templateName: string;
  date: Date;
  exercises: ExerciseSession[];
  createdAt: Date;
}

export interface ExerciseSession {
  exerciseId: string;
  exerciseName: string;
  type: ExerciseType;
  strength?: {
    sets: {
      weight: number;
      reps: number;
    }[];
  };
  cardio?: {
    time: number; // minutes
    level: number; // 1-10
    distance: number; // km
  };
  endurance?: {
    time: number; // minutes
    distance: number; // km
    pace: number; // min/km
  };
  stretch?: {
    completed: boolean;
  };
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: Date;
  weight?: number; // kg
  chest?: number; // cm
  waist?: number; // cm
  hips?: number; // cm
  upperArm?: number; // cm
  forearm?: number; // cm
  thigh?: number; // cm
  calf?: number; // cm
}

export interface UserSettings {
  id: string;
  userId: string;
  dashboardSessionLimit: number;
  darkMode: boolean;
}

export interface PendingExerciseSelection {
  templateId: string;
  mode: 'create' | 'edit';
  exerciseIds: string[];
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Exercise type display configuration
export const EXERCISE_TYPE_CONFIG = {
  strength: {
    label: 'Kraft',
    color: '#58a6ff',
    gradient: 'linear-gradient(135deg, #58a6ff, #1f6feb)',
    icon: 'fitness_center'
  },
  cardio: {
    label: 'Cardio',
    color: '#ff9500',
    gradient: 'linear-gradient(135deg, #ff9500, #e36209)',
    icon: 'directions_run'
  },
  endurance: {
    label: 'Ausdauer',
    color: '#3fb950',
    gradient: 'linear-gradient(135deg, #3fb950, #1a7f37)',
    icon: 'timeline'
  },
  stretch: {
    label: 'Dehnen',
    color: '#bc8cff',
    gradient: 'linear-gradient(135deg, #bc8cff, #8957e5)',
    icon: 'self_improvement'
  }
} as const;

// Default exercises for seeding
export const DEFAULT_EXERCISES: Omit<Exercise, 'id' | 'createdAt'>[] = [
  { name: 'Bankdrücken', type: 'strength', isDefault: true },
  { name: 'Kniebeugen', type: 'strength', isDefault: true },
  { name: 'Kreuzheben', type: 'strength', isDefault: true },
  { name: 'Laufen', type: 'cardio', isDefault: true },
  { name: 'Radfahren', type: 'cardio', isDefault: true },
  { name: 'Schwimmen', type: 'endurance', isDefault: true },
  { name: 'Yoga', type: 'stretch', isDefault: true }
];
