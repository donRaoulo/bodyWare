import { Pool, QueryResult } from 'pg';
import { DEFAULT_EXERCISES } from './types';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.DATABASE_URL || 'postgres://fitflex:fitflex@localhost:5432/fitflex';

export const pool = new Pool({ connectionString });

let initialized = false;

export async function initDatabase() {
  if (initialized) return;
  await createTables();
  await seedDefaultData();
  initialized = true;
}

async function createTables() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        emailVerified TIMESTAMPTZ,
        image TEXT,
        password_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        UNIQUE(provider, providerAccountId)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sessionToken TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires TIMESTAMPTZ NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        identifier TEXT NOT NULL,
        token TEXT NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (identifier, token)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        is_default BOOLEAN DEFAULT FALSE,
        UNIQUE(user_id, name)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workout_templates (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL CHECK (char_length(name) >= 2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS template_exercises (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        order_index INTEGER NOT NULL,
        UNIQUE(template_id, exercise_id, user_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        template_id TEXT NOT NULL REFERENCES workout_templates(id),
        template_name TEXT NOT NULL,
        date TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS exercise_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        workout_session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
        exercise_id TEXT NOT NULL REFERENCES exercises(id),
        exercise_name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch')),
        strength_data JSONB,
        cardio_data JSONB,
        endurance_data JSONB,
        stretch_data JSONB
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS body_measurements (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        date TIMESTAMPTZ DEFAULT NOW(),
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        dashboard_session_limit INTEGER DEFAULT 5 CHECK (dashboard_session_limit BETWEEN 1 AND 20),
        dark_mode BOOLEAN DEFAULT FALSE,
        theme_color TEXT DEFAULT '#58a6ff'
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_exercises_user_type ON exercises(user_id, type);
      CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_template_exercises_user_order ON template_exercises(user_id, template_id, order_index);
    `);

    // Safe migrations for existing DBs
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_settings' AND column_name = 'theme_color'
        ) THEN
          ALTER TABLE user_settings ADD COLUMN theme_color TEXT DEFAULT '#58a6ff';
        END IF;
      END$$;
    `);

    // Safe migration: add created_at column if missing (for existing DBs)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'body_measurements' AND column_name = 'created_at'
        ) THEN
          ALTER TABLE body_measurements ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
          CREATE INDEX IF NOT EXISTS idx_body_measurements_user_created ON body_measurements(user_id, created_at DESC);
        END IF;
      END$$;
    `);

    // Ensure index exists when column already present
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_body_measurements_user_created ON body_measurements(user_id, created_at DESC);
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables', error);
    throw error;
  } finally {
    client.release();
  }
}

async function seedDefaultData() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM exercises WHERE user_id IS NULL');
    if (rows[0].count === 0) {
      const insertText = `
        INSERT INTO exercises (id, user_id, name, type, is_default)
        VALUES ($1, NULL, $2, $3, $4)
      `;
      for (const exercise of DEFAULT_EXERCISES) {
        await client.query(insertText, [uuidv4(), exercise.name, exercise.type, exercise.isDefault]);
      }
    }
  } finally {
    client.release();
  }
}

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  await initDatabase();
  return pool.query<T>(text, params);
}

export function parseJson<T>(jsonString: string | null): T | null {
  if (jsonString === null || jsonString === undefined) return null;
  // If already parsed (e.g., JSON/JSONB from pg), return as-is
  if (typeof jsonString === 'object') {
    return jsonString as unknown as T;
  }
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
