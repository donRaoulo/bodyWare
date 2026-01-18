import { Pool, QueryResult, QueryResultRow } from 'pg';
import { DEFAULT_EXERCISES } from './types';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.DATABASE_URL || 'postgres://bodyware:bodyware@localhost:5432/bodyware';

export const pool = new Pool({ connectionString });

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initDatabase() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      await createTables();
      await seedDefaultData();
      initialized = true;
    })();
  }
  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

async function createTables() {
  const client = await pool.connect();
  const lockId = 742991;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [lockId]);
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
        type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch', 'counter')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        goal INTEGER,
        goal_due_date DATE,
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
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        is_archived BOOLEAN DEFAULT FALSE
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
        type TEXT NOT NULL CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch', 'counter')),
        strength_data JSONB,
        cardio_data JSONB,
        endurance_data JSONB,
        stretch_data JSONB,
        counter_data JSONB
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
        theme_color TEXT DEFAULT '#58a6ff',
        show_recent_workouts BOOLEAN DEFAULT TRUE,
        show_calendar BOOLEAN DEFAULT TRUE,
        show_stats_total_workouts BOOLEAN DEFAULT TRUE,
        show_stats_this_week BOOLEAN DEFAULT TRUE,
        show_stats_total_weight BOOLEAN DEFAULT TRUE,
        show_prs BOOLEAN DEFAULT TRUE,
        dashboard_widget_order TEXT DEFAULT '["stats","prs","calendar","recent"]'
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

    // Safe migration: add goal column for counter exercises
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'exercises' AND column_name = 'goal'
        ) THEN
          ALTER TABLE exercises ADD COLUMN goal INTEGER;
        END IF;
      END$$;
    `);

    // Safe migration: add goal_due_date column for counter exercises
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'exercises' AND column_name = 'goal_due_date'
        ) THEN
          ALTER TABLE exercises ADD COLUMN goal_due_date DATE;
        END IF;
      END$$;
    `);

    // Safe migration: add counter_data column for exercise sessions
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'exercise_sessions' AND column_name = 'counter_data'
        ) THEN
          ALTER TABLE exercise_sessions ADD COLUMN counter_data JSONB;
        END IF;
      END$$;
    `);

    // Safe migration: extend exercise type checks for counter (only if needed)
    await client.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
        constraint_def TEXT;
      BEGIN
        SELECT conname, pg_get_constraintdef(oid)
          INTO constraint_name, constraint_def
        FROM pg_constraint
        WHERE conrelid = 'exercises'::regclass
          AND contype = 'c'
          AND conname = 'exercises_type_check';

        IF constraint_def IS NULL THEN
          SELECT conname, pg_get_constraintdef(oid)
            INTO constraint_name, constraint_def
          FROM pg_constraint
          WHERE conrelid = 'exercises'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%type IN%';
        END IF;

        IF constraint_def IS NULL THEN
          ALTER TABLE exercises
            ADD CONSTRAINT exercises_type_check CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch', 'counter'));
        ELSIF constraint_def NOT LIKE '%counter%' THEN
          EXECUTE format('ALTER TABLE exercises DROP CONSTRAINT %I', constraint_name);
          ALTER TABLE exercises
            ADD CONSTRAINT exercises_type_check CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch', 'counter'));
        END IF;
      END$$;
    `);

    await client.query(`
      DO $$
      DECLARE
        constraint_name TEXT;
        constraint_def TEXT;
      BEGIN
        SELECT conname, pg_get_constraintdef(oid)
          INTO constraint_name, constraint_def
        FROM pg_constraint
        WHERE conrelid = 'exercise_sessions'::regclass
          AND contype = 'c'
          AND conname = 'exercise_sessions_type_check';

        IF constraint_def IS NULL THEN
          SELECT conname, pg_get_constraintdef(oid)
            INTO constraint_name, constraint_def
          FROM pg_constraint
          WHERE conrelid = 'exercise_sessions'::regclass
            AND contype = 'c'
            AND pg_get_constraintdef(oid) LIKE '%type IN%';
        END IF;

        IF constraint_def IS NULL THEN
          ALTER TABLE exercise_sessions
            ADD CONSTRAINT exercise_sessions_type_check CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch', 'counter'));
        ELSIF constraint_def NOT LIKE '%counter%' THEN
          EXECUTE format('ALTER TABLE exercise_sessions DROP CONSTRAINT %I', constraint_name);
          ALTER TABLE exercise_sessions
            ADD CONSTRAINT exercise_sessions_type_check CHECK (type IN ('strength', 'cardio', 'endurance', 'stretch', 'counter'));
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

    // Safe migration: add is_archived column for templates
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'workout_templates' AND column_name = 'is_archived'
        ) THEN
          ALTER TABLE workout_templates ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;
        END IF;
      END$$;
    `);

    // Ensure index exists when column already present
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_body_measurements_user_created ON body_measurements(user_id, created_at DESC);
    `);

    // Safe migrations: add dashboard visibility settings
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_settings' AND column_name = 'show_recent_workouts'
        ) THEN
          ALTER TABLE user_settings ADD COLUMN show_recent_workouts BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_settings' AND column_name = 'show_calendar'
        ) THEN
          ALTER TABLE user_settings ADD COLUMN show_calendar BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_settings' AND column_name = 'show_stats_total_workouts'
        ) THEN
          ALTER TABLE user_settings ADD COLUMN show_stats_total_workouts BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_settings' AND column_name = 'show_stats_this_week'
        ) THEN
          ALTER TABLE user_settings ADD COLUMN show_stats_this_week BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_settings' AND column_name = 'show_stats_total_weight'
        ) THEN
          ALTER TABLE user_settings ADD COLUMN show_stats_total_weight BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_settings' AND column_name = 'show_prs'
        ) THEN
          ALTER TABLE user_settings ADD COLUMN show_prs BOOLEAN DEFAULT TRUE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'user_settings' AND column_name = 'dashboard_widget_order'
        ) THEN
          ALTER TABLE user_settings ADD COLUMN dashboard_widget_order TEXT DEFAULT '["stats","prs","calendar","recent"]';
        END IF;
      END$$;
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating tables', error);
    throw error;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [lockId]);
    } catch {
      // ignore unlock errors so we can release the client
    }
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

export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: any[]): Promise<QueryResult<T>> {
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
