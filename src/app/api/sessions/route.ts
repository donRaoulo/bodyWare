import { NextRequest, NextResponse } from 'next/server';
import { query, stringifyJson } from '../../../lib/database';
import { WorkoutSession, ExerciseSession, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { fromSessionPayloadRow, toSessionPayload } from '../../../lib/session-payload';

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
    const dashboardRecentOnly = searchParams.get('dashboardRecentOnly') === 'true';

    const sessionResult = await query<any>(
      `
      SELECT ws.*
      FROM workout_sessions ws
      LEFT JOIN workout_templates wt ON wt.id = ws.template_id
      WHERE ws.user_id = $1
      ${templateId ? 'AND ws.template_id = $2' : ''}
      ${dashboardRecentOnly ? `AND COALESCE(wt.track_in_recent_workouts, TRUE) = TRUE` : ''}
      ORDER BY ws.started_at DESC, ws.created_at DESC
      LIMIT ${templateId ? '$3' : '$2'} OFFSET ${templateId ? '$4' : '$3'}
    `,
      templateId ? [userId, templateId, limit, offset] : [userId, limit, offset]
    );

    const sessions = sessionResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id ?? '',
      templateName: row.template_name,
      date: new Date(row.started_at),
      createdAt: new Date(row.created_at),
    })) as WorkoutSession[];

    // Fetch exercise sessions for each workout session
    for (const sessionItem of sessions) {
      const exerciseResult = await query<any>(
        `
        SELECT * FROM workout_session_items
        WHERE workout_session_id = $1 AND user_id = $2
        ORDER BY position ASC, id ASC
      `,
        [sessionItem.id, userId]
      );

      const exerciseSessions = exerciseResult.rows.map(fromSessionPayloadRow);

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
      INSERT INTO workout_sessions (id, user_id, template_id, template_name, started_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [sessionId, userId, templateId, templateName, date, now]
    );

    for (let index = 0; index < exercises.length; index++) {
      const exercise = exercises[index];
      await query(
        `
        INSERT INTO workout_session_items (
          id, user_id, workout_session_id, exercise_id, exercise_name, exercise_type, position, payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
        [
          uuidv4(),
          userId,
          sessionId,
          exercise.exerciseId,
          exercise.exerciseName,
          exercise.type,
          index,
          stringifyJson(toSessionPayload(exercise)),
        ]
      );
    }

    const sessionRowResult = await query<any>('SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2', [sessionId, userId]);
    const sessionRow = sessionRowResult.rows[0];

    const responseSession: WorkoutSession = {
      id: sessionRow.id,
      userId: sessionRow.user_id,
      templateId: sessionRow.template_id ?? '',
      templateName: sessionRow.template_name,
      date: new Date(sessionRow.started_at),
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
