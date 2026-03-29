import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { WorkoutTemplate, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';

// GET /api/templates - Fetch all workout templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<WorkoutTemplate[]>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;

    const { rows } = await query<any>(
      `
      SELECT
        wt.*,
        ARRAY_REMOVE(ARRAY_AGG(wti.exercise_id ORDER BY wti.position), NULL) AS exercise_ids,
        (
          SELECT MAX(ws.started_at)
          FROM workout_sessions ws
          WHERE ws.template_id = wt.id AND ws.user_id = wt.owner_user_id
        ) AS last_used_at
      FROM workout_templates wt
      LEFT JOIN workout_template_items wti ON wt.id = wti.template_id
      WHERE wt.owner_user_id = $1 AND wt.archived_at IS NULL
      GROUP BY wt.id
      ORDER BY wt.updated_at DESC
    `,
      [userId]
    );

    const templates = rows.map((row) => ({
      id: row.id,
      userId: row.owner_user_id,
      name: row.name,
      exerciseIds: Array.isArray(row.exercise_ids) ? row.exercise_ids : [],
      trackInRecentWorkouts: row.track_in_recent_workouts ?? true,
      trackInWeeklyGoal: row.track_in_weekly_goal ?? true,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    })) as WorkoutTemplate[];

    return NextResponse.json<ApiResponse<WorkoutTemplate[]>>({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json<ApiResponse<WorkoutTemplate[]>>({
      success: false,
      error: 'Failed to fetch templates',
    }, { status: 500 });
  }
}

// POST /api/templates - Create new workout template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const {
      name,
      exerciseIds,
      trackInRecentWorkouts,
      trackInWeeklyGoal,
    }: {
      name: string;
      exerciseIds: string[];
      trackInRecentWorkouts?: boolean;
      trackInWeeklyGoal?: boolean;
    } = body;

    if (!name || !exerciseIds || !Array.isArray(exerciseIds)) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'Name and exerciseIds are required',
      }, { status: 400 });
    }

    if (name.trim().length < 2) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'Name must be at least 2 characters long',
      }, { status: 400 });
    }

    if (exerciseIds.length === 0) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'At least one exercise is required',
      }, { status: 400 });
    }

    const templateId = uuidv4();
    const now = new Date().toISOString();

    // Insert template
    await query(
      `
      INSERT INTO workout_templates (
        id,
        owner_user_id,
        name,
        track_in_recent_workouts,
        track_in_weekly_goal,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        templateId,
        userId,
        name.trim(),
        trackInRecentWorkouts ?? true,
        trackInWeeklyGoal ?? true,
        now,
        now,
      ]
    );

    // Insert exercise associations
    for (let index = 0; index < exerciseIds.length; index++) {
      const exerciseId = exerciseIds[index];
      await query(
        `
        INSERT INTO workout_template_items (id, template_id, exercise_id, position)
        VALUES ($1, $2, $3, $4)
      `,
        [uuidv4(), templateId, exerciseId, index]
      );
    }

    // Fetch created template with exercises
    const templateResult = await query<any>(
      `
      SELECT
        wt.*,
        ARRAY_REMOVE(ARRAY_AGG(wti.exercise_id ORDER BY wti.position), NULL) AS exercise_ids
      FROM workout_templates wt
      LEFT JOIN workout_template_items wti ON wt.id = wti.template_id
      WHERE wt.id = $1 AND wt.owner_user_id = $2
      GROUP BY wt.id
    `,
      [templateId, userId]
    );

    const template = templateResult.rows[0];

    const responseTemplate: WorkoutTemplate = {
      id: template.id,
      userId: template.owner_user_id,
      name: template.name,
      exerciseIds: Array.isArray(template.exercise_ids) ? template.exercise_ids : [],
      trackInRecentWorkouts: template.track_in_recent_workouts ?? true,
      trackInWeeklyGoal: template.track_in_weekly_goal ?? true,
      createdAt: new Date(template.created_at),
      updatedAt: new Date(template.updated_at),
    };

    return NextResponse.json<ApiResponse<WorkoutTemplate>>({
      success: true,
      data: responseTemplate,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json<ApiResponse<WorkoutTemplate>>({
      success: false,
      error: 'Failed to create template',
    }, { status: 500 });
  }
}
