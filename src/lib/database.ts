import Database from 'better-sqlite3';
import { join } from 'path';
import { Exercise, WorkoutTemplate, WorkoutSession, BodyMeasurement, UserSettings, DEFAULT_EXERCISES } from './types';
import { v4 as uuidv4 } from 'uuid';

// Database file path
const DB_PATH = join(process.cwd(), 'fitflex.db');

let db: Database.Database;

export function initializeDatabase(): Database.Database {
  if (db) return db;

  try {
    db = new Database(DB_PATH);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create tables
    createTables();

    // Seed default data
    seedDefaultData();

    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

function createTables() {
  // Exercises table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_default BOOLEAN DEFAULT FALSE
    )
  `);

  // Workout templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL CHECK (length(name) >= 2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Template exercises junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE,
      UNIQUE(template_id, exercise_id)
    )
  `);

  // Workout sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES workout_templates (id)
    )
  `);

  // Exercise sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_sessions (
      id TEXT PRIMARY KEY,
      workout_session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch')),
      strength_data TEXT, -- JSON string for strength exercises
      cardio_data TEXT,   -- JSON string for cardio exercises
      endurance_data TEXT, -- JSON string for endurance exercises
      stretch_data TEXT,   -- JSON string for stretch exercises
      FOREIGN KEY (workout_session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id)
    )
  `);

  // Body measurements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS body_measurements (
      id TEXT PRIMARY KEY,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      weight REAL,
      chest REAL,
      waist REAL,
      hips REAL,
      upper_arm REAL,
      forearm REAL,
      thigh REAL,
      calf REAL
    )
  `);

  // User settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      dashboard_session_limit INTEGER DEFAULT 5 CHECK (dashboard_session_limit BETWEEN 1 AND 20),
      dark_mode BOOLEAN DEFAULT FALSE
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(type);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date DESC);
    CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(date DESC);
    CREATE INDEX IF NOT EXISTS idx_template_exercises_order ON template_exercises(template_id, order_index);
  `);
}

function seedDefaultData() {
  // Check if exercises already exist
  const exerciseCount = db.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number };

  if (exerciseCount.count === 0) {
    // Insert default exercises
    const insertExercise = db.prepare(`
      INSERT INTO exercises (id, name, type, is_default)
      VALUES (?, ?, ?, ?)
    `);

    for (const exercise of DEFAULT_EXERCISES) {
      insertExercise.run(uuidv4(), exercise.name, exercise.type, exercise.isDefault);
    }
  }

  // Insert default user settings if not exist
  const settingsCount = db.prepare('SELECT COUNT(*) as count FROM user_settings').get() as { count: number };

  if (settingsCount.count === 0) {
    const insertSettings = db.prepare(`
      INSERT INTO user_settings (id, dashboard_session_limit, dark_mode)
      VALUES (?, ?, ?)
    `);
    insertSettings.run('default', 5, false);
  }
}

// Database helper functions
export function getDatabase(): Database.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null as any;
  }
}

// Transaction helper
export function transaction<T>(fn: () => T): T {
  const db = getDatabase();
  return db.transaction(fn)();
}

// Utility function for JSON serialization
export function parseJson<T>(jsonString: string | null): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

export function stringifyJson(obj: any): string | null {
  if (obj === null || obj === undefined) return null;
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}