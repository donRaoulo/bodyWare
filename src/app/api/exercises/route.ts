import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { Exercise, ExerciseType, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';

// GET /api/exercises - Fetch all exercises
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<Exercise[]>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ExerciseType | null;
    const search = searchParams.get('search');

    let sql = `
      SELECT * FROM exercises
      WHERE (user_id = $1 OR (user_id IS NULL AND is_default = true))
    `;
    const params: any[] = [userId];

    if (type) {
      sql += ' AND type = $' + (params.length + 1);
      params.push(type);
    }

    if (search) {
      sql += ' AND name ILIKE $' + (params.length + 1);
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY is_default DESC, name ASC';

    const { rows } = await query<any>(sql, params);
    const exercises = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      type: row.type,
      goal: row.goal ?? null,
      goalDueDate: row.goal_due_date ?? null,
      createdAt: new Date(row.created_at),
      isDefault: Boolean(row.is_default),
    })) as Exercise[];

    return NextResponse.json<ApiResponse<Exercise[]>>({
      success: true,
      data: exercises,
    });
  } catch (error) {
    console.error('Error fetching exercises:', error);
    return NextResponse.json<ApiResponse<Exercise[]>>({
      success: false,
      error: 'Failed to fetch exercises',
    }, { status: 500 });
  }
}

// POST /api/exercises - Create new exercise
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, type, goal, goalDueDate }: { name: string; type: ExerciseType; goal?: number | null; goalDueDate?: string | null } = body;

    if (!name || !type) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Name and type are required',
      }, { status: 400 });
    }

    if (name.trim().length < 2) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Name must be at least 2 characters long',
      }, { status: 400 });
    }

    if (!['strength', 'cardio', 'endurance', 'stretch', 'counter'].includes(type)) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Invalid exercise type',
      }, { status: 400 });
    }

    const normalizedGoal = type === 'counter'
      ? (goal !== null && goal !== undefined ? Number(goal) : null)
      : null;
    const normalizedGoalDueDate = type === 'counter' ? (goalDueDate ? String(goalDueDate) : '') : null;

    if (
      type === 'counter' &&
      (normalizedGoal === null || !Number.isFinite(normalizedGoal) || normalizedGoal <= 0)
    ) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Goal must be a positive number',
      }, { status: 400 });
    }
    if (type === 'counter' && !normalizedGoalDueDate) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Goal due date is required',
      }, { status: 400 });
    }

    // Check if exercise with same name already exists
    const existing = await query<{ id: string }>(
      'SELECT id FROM exercises WHERE (user_id = $1 OR user_id IS NULL) AND name = $2',
      [userId, name.trim()]
    );
    if (existing.rows[0]) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Exercise with this name already exists',
      }, { status: 409 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await query(
      `
      INSERT INTO exercises (id, user_id, name, type, goal, goal_due_date, is_default, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [id, userId, name.trim(), type, type === 'counter' ? normalizedGoal : null, type === 'counter' ? normalizedGoalDueDate : null, false, now]
    );

    const exerciseResult = await query<any>('SELECT * FROM exercises WHERE id = $1', [id]);
    const exercise = exerciseResult.rows[0];

    const responseExercise: Exercise = {
      id: exercise.id,
      userId: exercise.user_id,
      name: exercise.name,
      type: exercise.type,
      goal: exercise.goal ?? null,
      goalDueDate: exercise.goal_due_date ?? null,
      createdAt: new Date(exercise.created_at),
      isDefault: Boolean(exercise.is_default),
    };

    return NextResponse.json<ApiResponse<Exercise>>({
      success: true,
      data: responseExercise,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating exercise:', error);
    return NextResponse.json<ApiResponse<Exercise>>({
      success: false,
      error: 'Failed to create exercise',
    }, { status: 500 });
  }
}
