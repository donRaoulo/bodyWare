import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DEFAULT_EXERCISES } from './types';
import { v4 as uuidv4 } from 'uuid';

const connectionString = process.env.DATABASE_URL || 'postgres://bodyware:bodyware@localhost:5433/bodyware';

export const pool = new Pool({ connectionString });

const SCHEMA_VERSION = 4;
const SCHEMA_LOCK_ID = 742991;
const EXERCISE_TYPES = ['strength', 'cardio', 'endurance', 'stretch', 'counter'] as const;
const DEFAULT_DASHBOARD_CONFIG = {
  showRecentWorkouts: true,
  showCalendar: true,
  showStatsTotalWorkouts: true,
  showStatsThisWeek: true,
  showStatsTotalWeight: true,
  showPrs: true,
  showQuickstart: true,
  showWeeklyGoal: true,
  dashboardWidgetOrder: ['quickstart', 'weeklyGoal', 'stats', 'prs', 'calendar', 'recent'],
};

let initialized = false;
let initPromise: Promise<void> | null = null;

export async function initDatabase() {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      const client = await pool.connect();
      try {
        await client.query('SELECT pg_advisory_lock($1)', [SCHEMA_LOCK_ID]);
        await client.query('BEGIN');
        await createOrMigrateSchema(client);
        await seedDefaultData(client);
        await client.query('COMMIT');
        initialized = true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        try {
          await client.query('SELECT pg_advisory_unlock($1)', [SCHEMA_LOCK_ID]);
        } catch {
          // ignore unlock errors to ensure client release
        }
        client.release();
      }
    })();
  }
  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

async function createOrMigrateSchema(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_schema_version (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      version INTEGER NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const versionResult = await client.query<{ version: number }>(
    'SELECT version FROM app_schema_version WHERE id = 1'
  );
  if (versionResult.rows[0]?.version === SCHEMA_VERSION) {
    await ensureSchemaV4Columns(client);
    return;
  }

  if (versionResult.rows[0]?.version === 2) {
    await ensureSchemaV4Columns(client);
    await setSchemaVersion(client, SCHEMA_VERSION);
    return;
  }

  if (versionResult.rows[0]?.version === 3) {
    await ensureSchemaV4Columns(client);
    await setSchemaVersion(client, SCHEMA_VERSION);
    return;
  }

  // One-time destructive reset because schema v2 is intentionally redesigned.
  await client.query(`
    DROP TABLE IF EXISTS user_saved_templates CASCADE;
    DROP TABLE IF EXISTS workout_session_items CASCADE;
    DROP TABLE IF EXISTS workout_sessions CASCADE;
    DROP TABLE IF EXISTS workout_template_items CASCADE;
    DROP TABLE IF EXISTS workout_templates CASCADE;
    DROP TABLE IF EXISTS body_entries CASCADE;
    DROP TABLE IF EXISTS user_preferences CASCADE;
    DROP TABLE IF EXISTS exercises CASCADE;

    DROP TABLE IF EXISTS template_exercises CASCADE;
    DROP TABLE IF EXISTS exercise_sessions CASCADE;
    DROP TABLE IF EXISTS body_measurements CASCADE;
    DROP TABLE IF EXISTS user_settings CASCADE;

    DROP TABLE IF EXISTS accounts CASCADE;
    DROP TABLE IF EXISTS sessions CASCADE;
    DROP TABLE IF EXISTS verification_tokens CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
  `);

  const typeCheck = EXERCISE_TYPES.map((type) => `'${type}'`).join(', ');
  const defaultConfigJson = JSON.stringify(DEFAULT_DASHBOARD_CONFIG);

  await client.query(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      emailVerified TIMESTAMPTZ,
      image TEXT,
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE accounts (
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

    CREATE TABLE sessions (
      sessionToken TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (identifier, token)
    );

    CREATE TABLE exercises (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      source_exercise_id TEXT REFERENCES exercises(id) ON DELETE SET NULL,
      name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
      type TEXT NOT NULL CHECK (type IN (${typeCheck})),
      goal_value NUMERIC,
      goal_due_date DATE,
      show_in_personal_records BOOLEAN NOT NULL DEFAULT TRUE,
      is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    CREATE TABLE workout_templates (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      source_template_id TEXT REFERENCES workout_templates(id) ON DELETE SET NULL,
      name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
      description TEXT,
      is_builtin BOOLEAN NOT NULL DEFAULT FALSE,
      track_in_recent_workouts BOOLEAN NOT NULL DEFAULT TRUE,
      track_in_weekly_goal BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      archived_at TIMESTAMPTZ
    );

    CREATE TABLE workout_template_items (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      position INTEGER NOT NULL CHECK (position >= 0),
      config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(template_id, position)
    );

    CREATE TABLE user_saved_templates (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id TEXT NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, template_id)
    );

    CREATE TABLE workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id TEXT REFERENCES workout_templates(id) ON DELETE SET NULL,
      template_name TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE workout_session_items (
      id TEXT PRIMARY KEY,
      workout_session_id TEXT NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      exercise_name TEXT NOT NULL,
      exercise_type TEXT NOT NULL CHECK (exercise_type IN (${typeCheck})),
      position INTEGER NOT NULL CHECK (position >= 0),
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(workout_session_id, position)
    );

    CREATE TABLE body_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      weight_kg NUMERIC(7,2),
      metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE user_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      dashboard_session_limit INTEGER NOT NULL DEFAULT 5 CHECK (dashboard_session_limit BETWEEN 1 AND 20),
      dark_mode BOOLEAN NOT NULL DEFAULT FALSE,
      theme_color TEXT NOT NULL DEFAULT '#58a6ff',
      dashboard_config JSONB NOT NULL DEFAULT '${defaultConfigJson}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_accounts_user ON accounts(userId);
    CREATE INDEX idx_sessions_user ON sessions(userId);

    CREATE INDEX idx_exercises_owner_type_name ON exercises(owner_user_id, type, name);
    CREATE UNIQUE INDEX uq_exercises_builtin_name
      ON exercises ((lower(name)))
      WHERE owner_user_id IS NULL AND archived_at IS NULL;
    CREATE UNIQUE INDEX uq_exercises_user_name
      ON exercises (owner_user_id, (lower(name)))
      WHERE owner_user_id IS NOT NULL AND archived_at IS NULL;

    CREATE INDEX idx_templates_owner_updated
      ON workout_templates(owner_user_id, updated_at DESC)
      WHERE archived_at IS NULL;
    CREATE INDEX idx_template_items_template_position ON workout_template_items(template_id, position);
    CREATE INDEX idx_saved_templates_template ON user_saved_templates(template_id, user_id);

    CREATE INDEX idx_workout_sessions_user_started ON workout_sessions(user_id, started_at DESC);
    CREATE INDEX idx_workout_session_items_session_position ON workout_session_items(workout_session_id, position);
    CREATE INDEX idx_workout_session_items_user_type ON workout_session_items(user_id, exercise_type);
    CREATE INDEX idx_workout_session_items_user_exercise ON workout_session_items(user_id, exercise_id);

    CREATE INDEX idx_body_entries_user_measured ON body_entries(user_id, measured_at DESC);
  `);

  await setSchemaVersion(client, SCHEMA_VERSION);
}

async function ensureSchemaV4Columns(client: PoolClient) {
  await client.query(`
    ALTER TABLE workout_templates
      ADD COLUMN IF NOT EXISTS track_in_recent_workouts BOOLEAN NOT NULL DEFAULT TRUE;

    ALTER TABLE workout_templates
      ADD COLUMN IF NOT EXISTS track_in_weekly_goal BOOLEAN NOT NULL DEFAULT TRUE;

    UPDATE workout_templates
    SET
      track_in_recent_workouts = COALESCE(track_in_recent_workouts, TRUE),
      track_in_weekly_goal = COALESCE(track_in_weekly_goal, TRUE)
    WHERE track_in_recent_workouts IS NULL OR track_in_weekly_goal IS NULL;

    ALTER TABLE exercises
      ADD COLUMN IF NOT EXISTS show_in_personal_records BOOLEAN NOT NULL DEFAULT TRUE;

    UPDATE exercises
    SET show_in_personal_records = COALESCE(show_in_personal_records, TRUE)
    WHERE show_in_personal_records IS NULL;
  `);
}

async function setSchemaVersion(client: PoolClient, version: number) {
  await client.query(
    `
    INSERT INTO app_schema_version (id, version, updated_at)
    VALUES (1, $1, NOW())
    ON CONFLICT (id)
    DO UPDATE SET version = EXCLUDED.version, updated_at = NOW();
    `,
    [version]
  );
}

async function seedDefaultData(client: PoolClient) {
  for (const exercise of DEFAULT_EXERCISES) {
    const existing = await client.query<{ id: string }>(
      `
      SELECT id
      FROM exercises
      WHERE owner_user_id IS NULL
        AND archived_at IS NULL
        AND lower(name) = lower($1)
      LIMIT 1
      `,
      [exercise.name]
    );

    if (existing.rows[0]) {
      continue;
    }

    await client.query(
      `
      INSERT INTO exercises (
        id,
        owner_user_id,
        source_exercise_id,
        name,
        type,
        goal_value,
        goal_due_date,
        show_in_personal_records,
        is_builtin,
        created_at,
        updated_at,
        archived_at
      ) VALUES ($1, NULL, NULL, $2, $3, NULL, NULL, TRUE, TRUE, NOW(), NOW(), NULL)
      `,
      [uuidv4(), exercise.name, exercise.type]
    );
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  await initDatabase();
  return pool.query<T>(text, params);
}

export function parseJson<T>(jsonValue: unknown): T | null {
  if (jsonValue === null || jsonValue === undefined) return null;
  if (typeof jsonValue === 'object') {
    return jsonValue as T;
  }
  if (typeof jsonValue !== 'string') return null;

  try {
    return JSON.parse(jsonValue) as T;
  } catch {
    return null;
  }
}

export function stringifyJson(obj: unknown): string | null {
  if (obj === null || obj === undefined) return null;
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}
