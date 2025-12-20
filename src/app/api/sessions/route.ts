import { NextRequest, NextResponse } from 'next/server';
import { query, parseJson, stringifyJson } from '../../../lib/database';
import { WorkoutSession, ExerciseSession, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';

// GET /api/sessions - Fetch workout sessions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<WorkoutSession[]>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const templateId = searchParams.get('templateId');

    const sessionResult = await query<any>(
      `
      SELECT * FROM workout_sessions
      WHERE user_id = $1
      ${templateId ? 'AND template_id = $2' : ''}
      ORDER BY date DESC, created_at DESC
      LIMIT ${templateId ? '$3' : '$2'} OFFSET ${templateId ? '$4' : '$3'}
    `,
      templateId ? [userId, templateId, limit, offset] : [userId, limit, offset]
    );

    const sessions = sessionResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id,
      templateName: row.template_name,
      date: new Date(row.date),
      createdAt: new Date(row.created_at),
    })) as WorkoutSession[];

    // Fetch exercise sessions for each workout session
    for (const sessionItem of sessions) {
      const exerciseResult = await query<any>(
        `
        SELECT * FROM exercise_sessions
        WHERE workout_session_id = $1 AND user_id = $2
        ORDER BY id
      `,
        [sessionItem.id, userId]
      );

      const exerciseSessions = exerciseResult.rows.map((row) => {
        const exerciseSession: ExerciseSession = {
          exerciseId: row.exercise_id,
          exerciseName: row.exercise_name,
          type: row.type,
        };

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

      sessionItem.exercises = exerciseSessions;
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
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

    const sessionId = uuidv4();
    const now = new Date().toISOString();

    await query(
      `
      INSERT INTO workout_sessions (id, user_id, template_id, template_name, date, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [sessionId, userId, templateId, templateName, date, now]
    );

    for (const exercise of exercises) {
      await query(
        `
        INSERT INTO exercise_sessions (
          id, user_id, workout_session_id, exercise_id, exercise_name, type,
          strength_data, cardio_data, endurance_data, stretch_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
        [
          uuidv4(),
          userId,
          sessionId,
          exercise.exerciseId,
          exercise.exerciseName,
          exercise.type,
          stringifyJson(exercise.strength),
          stringifyJson(exercise.cardio),
          stringifyJson(exercise.endurance),
          stringifyJson(exercise.stretch),
        ]
      );
    }

    const sessionRowResult = await query<any>('SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
    const sessionRow = sessionRowResult.rows[0];

    const responseSession: WorkoutSession = {
      id: sessionRow.id,
      userId: sessionRow.user_id,
      templateId: sessionRow.template_id,
      templateName: sessionRow.template_name,
      date: new Date(sessionRow.date),
      createdAt: new Date(sessionRow.created_at),
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
