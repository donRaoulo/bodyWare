import { NextRequest, NextResponse } from 'next/server';
import { query, stringifyJson } from '../../../../lib/database';
import { WorkoutSession, ExerciseSession, ApiResponse, ExerciseType } from '../../../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import { fromSessionPayloadRow, toSessionPayload } from '../../../../lib/session-payload';

const allowedTypes: ExerciseType[] = ['strength', 'cardio', 'endurance', 'stretch', 'counter'];

// GET /api/sessions/[id] - Fetch single workout session with exercises
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: sessionId } = await params;

    const sessionResult = await query<any>(
      'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (!sessionResult.rows[0]) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'Session not found',
      }, { status: 404 });
    }

    const sessionRow = sessionResult.rows[0];

    const exerciseResult = await query<any>(
      `
      SELECT * FROM workout_session_items
      WHERE workout_session_id = $1 AND user_id = $2
      ORDER BY position ASC, id ASC
    `,
      [sessionId, userId]
    );

    const exerciseSessions = exerciseResult.rows.map(fromSessionPayloadRow);

    const responseSession: WorkoutSession = {
      id: sessionRow.id,
      userId: sessionRow.user_id,
      templateId: sessionRow.template_id ?? '',
      templateName: sessionRow.template_name,
      date: new Date(sessionRow.started_at),
      createdAt: new Date(sessionRow.created_at),
      exercises: exerciseSessions,
    };

    return NextResponse.json<ApiResponse<WorkoutSession>>({
      success: true,
      data: responseSession,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json<ApiResponse<WorkoutSession>>({
      success: false,
      error: 'Failed to fetch session',
    }, { status: 500 });
  }
}

// PUT /api/sessions/[id] - Replace exercise data for a session
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: sessionId } = await params;
    const body = await request.json();
    const { exercises }: { exercises: ExerciseSession[] } = body;

    if (!Array.isArray(exercises)) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'Exercises are required',
      }, { status: 400 });
    }

    if (exercises.length === 0) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'At least one exercise is required',
      }, { status: 400 });
    }

    const sessionResult = await query<any>(
      'SELECT * FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (!sessionResult.rows[0]) {
      return NextResponse.json<ApiResponse<WorkoutSession>>({
        success: false,
        error: 'Session not found',
      }, { status: 404 });
    }

    for (const exercise of exercises) {
      if (!exercise.exerciseId || !exercise.exerciseName || !exercise.type) {
        return NextResponse.json<ApiResponse<WorkoutSession>>({
          success: false,
          error: 'Invalid exercise payload',
        }, { status: 400 });
      }
      if (!allowedTypes.includes(exercise.type)) {
        return NextResponse.json<ApiResponse<WorkoutSession>>({
          success: false,
          error: 'Invalid exercise type',
        }, { status: 400 });
      }
    }

    await query(
      'DELETE FROM workout_session_items WHERE workout_session_id = $1 AND user_id = $2',
      [sessionId, userId]
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

    const sessionRow = sessionResult.rows[0];
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
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json<ApiResponse<WorkoutSession>>({
      success: false,
      error: 'Failed to update session',
    }, { status: 500 });
  }
}

// DELETE /api/sessions/[id] - Delete workout session
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: sessionId } = await params;

    const sessionResult = await query<any>(
      'SELECT id FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    if (!sessionResult.rows[0]) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Session not found',
      }, { status: 404 });
    }

    await query(
      'DELETE FROM workout_sessions WHERE id = $1 AND user_id = $2',
      [sessionId, userId]
    );

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to delete session',
    }, { status: 500 });
  }
}
