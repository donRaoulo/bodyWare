import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { ApiResponse, Exercise, ExerciseType } from '../../../../lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

const ALLOWED_TYPES: ExerciseType[] = ['strength', 'cardio', 'endurance', 'stretch', 'counter'];

function mapExercise(row: any): Exercise {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    goal: row.goal ?? null,
    goalDueDate: row.goal_due_date ?? null,
    showInPersonalRecords: Boolean(row.show_in_personal_records),
    createdAt: new Date(row.created_at),
    isDefault: Boolean(row.is_builtin),
  };
}

// PUT /api/exercises/[id] - Update custom exercise
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      type,
      goal,
      goalDueDate,
      showInPersonalRecords,
    }: {
      name?: string;
      type?: ExerciseType;
      goal?: number | null;
      goalDueDate?: string | null;
      showInPersonalRecords?: boolean;
    } = body;

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

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Invalid exercise type',
      }, { status: 400 });
    }

    const existing = await query<{ id: string; show_in_personal_records: boolean }>(
      `
      SELECT id, show_in_personal_records
      FROM exercises
      WHERE id = $1
        AND owner_user_id = $2
        AND is_builtin = FALSE
        AND archived_at IS NULL
      `,
      [id, userId]
    );
    if (!existing.rows[0]) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Exercise not found',
      }, { status: 404 });
    }

    const normalizedGoal = type === 'counter'
      ? (goal !== null && goal !== undefined ? Number(goal) : null)
      : null;
    const normalizedGoalDueDate = type === 'counter' ? (goalDueDate ? String(goalDueDate) : '') : null;
    const normalizedShowInPersonalRecords = showInPersonalRecords ?? existing.rows[0].show_in_personal_records;

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

    const duplicate = await query<{ id: string }>(
      `
      SELECT id
      FROM exercises
      WHERE (owner_user_id = $1 OR owner_user_id IS NULL)
        AND archived_at IS NULL
        AND lower(name) = lower($2)
        AND id <> $3
      `,
      [userId, name.trim(), id]
    );
    if (duplicate.rows[0]) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Exercise with this name already exists',
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    await query(
      `
      UPDATE exercises
      SET
        name = $1,
        type = $2,
        goal_value = $3,
        goal_due_date = $4,
        show_in_personal_records = $5,
        updated_at = $6
      WHERE id = $7 AND owner_user_id = $8
      `,
      [
        name.trim(),
        type,
        type === 'counter' ? normalizedGoal : null,
        type === 'counter' ? normalizedGoalDueDate : null,
        normalizedShowInPersonalRecords,
        now,
        id,
        userId,
      ]
    );

    const result = await query<any>(
      `
      SELECT
        id,
        owner_user_id AS user_id,
        name,
        type,
        goal_value AS goal,
        goal_due_date,
        show_in_personal_records,
        created_at,
        is_builtin
      FROM exercises
      WHERE id = $1
      `,
      [id]
    );

    return NextResponse.json<ApiResponse<Exercise>>({
      success: true,
      data: mapExercise(result.rows[0]),
    });
  } catch (error) {
    console.error('Error updating exercise:', error);
    return NextResponse.json<ApiResponse<Exercise>>({
      success: false,
      error: 'Failed to update exercise',
    }, { status: 500 });
  }
}
