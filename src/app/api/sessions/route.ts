import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, parseJson, stringifyJson } from '../../../lib/database';
import { WorkoutSession, ExerciseSession, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';

// GET /api/sessions - Fetch workout sessions
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const sessions = db.prepare(`
      SELECT * FROM workout_sessions
      ORDER BY date DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset).map((row: any) => ({
      id: row.id,
      templateId: row.template_id,
      templateName: row.template_name,
      date: new Date(row.date),
      createdAt: new Date(row.created_at),
    })) as WorkoutSession[];

    // Fetch exercise sessions for each workout session
    for (const session of sessions) {
      const exerciseSessions = db.prepare(`
        SELECT * FROM exercise_sessions
        WHERE workout_session_id = ?
        ORDER BY id
      `).all(session.id).map((row: any) => {
        const exerciseSession: ExerciseSession = {
          exerciseId: row.exercise_id,
          exerciseName: row.exercise_name,
          type: row.type,
        };

        // Parse type-specific data
        if (row.strength_data) {
          exerciseSession.strength = parseJson(row.strength_data);
        }
        if (row.cardio_data) {
          exerciseSession.cardio = parseJson(row.cardio_data);
        }
        if (row.endurance_data) {
          exerciseSession.endurance = parseJson(row.endurance_data);
        }
        if (row.stretch_data) {
          exerciseSession.stretch = parseJson(row.stretch_data);
        }

        return exerciseSession;
      });

      session.exercises = exerciseSessions;
    }

    return NextResponse.json<ApiResponse<WorkoutSession[]>>({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json<ApiResponse<WorkoutSession[]>>({
      success: false,
      error: 'Failed to fetch sessions',
    }, { status: 500 });
  }
}

// POST /api/sessions - Create new workout session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, templateName, date, exercises }: {
      templateId: string;
      templateName: string;
      date: string;
      exercises: ExerciseSession[];
    } = body;

    if (!templateId || !templateName || !date || !exercises || !Array.isArray(exercises)) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'All fields are required',
      }, { status: 400 });
    }

    if (exercises.length === 0) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'At least one exercise is required',
      }, { status: 400 });
    }

    const db = getDatabase();
    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Insert workout session
    db.prepare(`
      INSERT INTO workout_sessions (id, template_id, template_name, date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, templateId, templateName, date, now);

    // Insert exercise sessions
    const insertExerciseSession = db.prepare(`
      INSERT INTO exercise_sessions (
        id, workout_session_id, exercise_id, exercise_name, type,
        strength_data, cardio_data, endurance_data, stretch_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    exercises.forEach((exercise) => {
      insertExerciseSession.run(
        uuidv4(),
        sessionId,
        exercise.exerciseId,
        exercise.exerciseName,
        exercise.type,
        stringifyJson(exercise.strength),
        stringifyJson(exercise.cardio),
        stringifyJson(exercise.endurance),
        stringifyJson(exercise.stretch)
      );
    });

    // Fetch created session with exercises
    const session = db.prepare('SELECT * FROM workout_sessions WHERE id = ?').get(sessionId);

    const responseSession: WorkoutSession = {
      id: session.id,
      templateId: session.template_id,
      templateName: session.template_name,
      date: new Date(session.date),
      createdAt: new Date(session.created_at),
      exercises,
    };

    return NextResponse.json<ApiResponse<WorkoutSession>>({
      success: true,
      data: responseSession,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json<ApiResponse<WorkoutSession>>({
      success: false,
      error: 'Failed to create session',
    }, { status: 500 });
  }
}