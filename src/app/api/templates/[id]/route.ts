import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { WorkoutTemplate, ApiResponse } from '../../../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

// GET /api/templates/[id] - Fetch specific template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;

    const templateResult = await query<any>(
      `
      SELECT
        wt.*,
        STRING_AGG(te.exercise_id, ',') AS exercise_ids,
        (
          SELECT MAX(ws.date)
          FROM workout_sessions ws
          WHERE ws.template_id = wt.id AND ws.user_id = wt.user_id
        ) AS last_used_at
      FROM workout_templates wt
      LEFT JOIN template_exercises te ON wt.id = te.template_id AND te.user_id = wt.user_id
      WHERE wt.id = $1 AND wt.user_id = $2 AND wt.is_archived = FALSE
      GROUP BY wt.id
    `,
      [id, userId]
    );

    const template = templateResult.rows[0];

    if (!template) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'Template not found',
      }, { status: 404 });
    }

    const responseTemplate: WorkoutTemplate = {
      id: template.id,
      userId: template.user_id,
      name: template.name,
      exerciseIds: template.exercise_ids ? template.exercise_ids.split(',') : [],
      createdAt: new Date(template.created_at),
      updatedAt: new Date(template.updated_at),
      lastUsedAt: template.last_used_at ? new Date(template.last_used_at) : undefined,
    };

    return NextResponse.json<ApiResponse<WorkoutTemplate>>({
      success: true,
      data: responseTemplate,
    });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json<ApiResponse<WorkoutTemplate>>({
      success: false,
      error: 'Failed to fetch template',
    }, { status: 500 });
  }
}

// PUT /api/templates/[id] - Update workout template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    const body = await request.json();
    const { name, exerciseIds }: { name: string; exerciseIds: string[] } = body;

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

    // Check if template exists
    const existingTemplate = await query<{ id: string }>(
      'SELECT id FROM workout_templates WHERE id = $1 AND user_id = $2 AND is_archived = FALSE',
      [id, userId]
    );
    if (!existingTemplate.rows[0]) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'Template not found',
      }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Update template
    await query(
      `
      UPDATE workout_templates
      SET name = $1, updated_at = $2
      WHERE id = $3 AND user_id = $4
    `,
      [name.trim(), now, id, userId]
    );

    // Remove existing exercise associations
    await query('DELETE FROM template_exercises WHERE template_id = $1 AND user_id = $2', [id, userId]);

    // Insert new exercise associations
    for (let index = 0; index < exerciseIds.length; index++) {
      const exerciseId = exerciseIds[index];
      await query(
        `
        INSERT INTO template_exercises (id, user_id, template_id, exercise_id, order_index)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [uuidv4(), userId, id, exerciseId, index]
      );
    }

    // Fetch updated template with exercises
    const templateResult = await query<any>(
      `
      SELECT
        wt.*,
        STRING_AGG(te.exercise_id, ',') AS exercise_ids
      FROM workout_templates wt
      LEFT JOIN template_exercises te ON wt.id = te.template_id AND te.user_id = wt.user_id
      WHERE wt.id = $1 AND wt.user_id = $2
      GROUP BY wt.id
    `,
      [id, userId]
    );

    const template = templateResult.rows[0];

    const responseTemplate: WorkoutTemplate = {
      id: template.id,
      userId: template.user_id,
      name: template.name,
      exerciseIds: template.exercise_ids ? template.exercise_ids.split(',') : [],
      createdAt: new Date(template.created_at),
      updatedAt: new Date(template.updated_at),
    };

    return NextResponse.json<ApiResponse<WorkoutTemplate>>({
      success: true,
      data: responseTemplate,
    });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json<ApiResponse<WorkoutTemplate>>({
      success: false,
      error: 'Failed to update template',
    }, { status: 500 });
  }
}

// DELETE /api/templates/[id] - Delete workout template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;

    // Check if template exists
    const existingTemplate = await query<{ id: string }>(
      'SELECT id FROM workout_templates WHERE id = $1 AND user_id = $2 AND is_archived = FALSE',
      [id, userId]
    );
    if (!existingTemplate.rows[0]) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Template not found',
      }, { status: 404 });
    }

    await query(
      'UPDATE workout_templates SET is_archived = TRUE, updated_at = $1 WHERE id = $2 AND user_id = $3',
      [new Date().toISOString(), id, userId]
    );

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to delete template',
    }, { status: 500 });
  }
}
