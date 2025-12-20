import Database from 'better-sqlite3';
import { join } from 'path';
import { DEFAULT_EXERCISES } from './types';
import { v4 as uuidv4 } from 'uuid';

// Database file path
export const DB_PATH = join(process.cwd(), 'fitflex.db');

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
  const hasUsersTable = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='users'
  `).get() as { name?: string } | undefined;

  // If schema not initialized (no users table), drop old tables to start fresh.
  if (!hasUsersTable) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS exercise_sessions;
      DROP TABLE IF EXISTS workout_sessions;
      DROP TABLE IF EXISTS template_exercises;
      DROP TABLE IF EXISTS workout_templates;
      DROP TABLE IF EXISTS body_measurements;
      DROP TABLE IF EXISTS user_settings;
      DROP TABLE IF EXISTS exercises;
      DROP TABLE IF EXISTS sessions;
      DROP TABLE IF EXISTS accounts;
      DROP TABLE IF EXISTS verification_tokens;
      DROP TABLE IF EXISTS users;
      PRAGMA foreign_keys = ON;
    `);
  }

  // Auth tables (NextAuth compatible)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      emailVerified DATETIME,
      image TEXT,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      providerAccountId TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      oauth_token_secret TEXT,
      oauth_token TEXT,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(provider, providerAccountId)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sessionToken TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      expires DATETIME NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires DATETIME NOT NULL,
      PRIMARY KEY (identifier, token)
    );
  `);

  // Exercises table (global defaults: user_id NULL, is_default TRUE)
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_default BOOLEAN DEFAULT FALSE,
      UNIQUE(user_id, name)
    );
  `);

  // Workout templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL CHECK (length(name) >= 2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Template exercises junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      template_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (template_id) REFERENCES workout_templates (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id),
      UNIQUE(template_id, exercise_id, user_id)
    );
  `);

  // Workout sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      template_id TEXT NOT NULL,
      template_name TEXT NOT NULL,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES workout_templates (id)
    );
  `);

  // Exercise sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS exercise_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
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
    );
  `);

  // Body measurements table
  db.exec(`
    CREATE TABLE IF NOT EXISTS body_measurements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      weight REAL,
      chest REAL,
      waist REAL,
      hips REAL,
      upper_arm REAL,
      forearm REAL,
      thigh REAL,
      calf REAL
    );
  `);

  // User settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
      dashboard_session_limit INTEGER DEFAULT 5 CHECK (dashboard_session_limit BETWEEN 1 AND 20),
      dark_mode BOOLEAN DEFAULT FALSE
    );
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_exercises_type ON exercises(type);
    CREATE INDEX IF NOT EXISTS idx_exercises_user_type ON exercises(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_date ON workout_sessions(date DESC);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(date DESC);
    CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_template_exercises_order ON template_exercises(template_id, order_index);
    CREATE INDEX IF NOT EXISTS idx_template_exercises_user_order ON template_exercises(user_id, template_id, order_index);
  `);
}

function seedDefaultData() {
  const exerciseCount = db.prepare('SELECT COUNT(*) as count FROM exercises WHERE user_id IS NULL').get() as { count: number };

  if (exerciseCount.count === 0) {
    const insertExercise = db.prepare(`
      INSERT INTO exercises (id, user_id, name, type, is_default)
      VALUES (?, NULL, ?, ?, ?)
    `);

    for (const exercise of DEFAULT_EXERCISES) {
      insertExercise.run(uuidv4(), exercise.name, exercise.type, exercise.isDefault);
    }
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
  const currentDb = getDatabase();
  return currentDb.transaction(fn)();
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
