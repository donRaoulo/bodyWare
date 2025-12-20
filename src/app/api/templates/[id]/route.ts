import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';
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
    const db = getDatabase();

    const template = db.prepare(`
      SELECT
        wt.*,
        GROUP_CONCAT(te.exercise_id) as exercise_ids
      FROM workout_templates wt
      LEFT JOIN template_exercises te ON wt.id = te.template_id AND te.user_id = wt.user_id
      WHERE wt.id = ? AND wt.user_id = ?
      GROUP BY wt.id
    `).get(id, userId);

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

    const db = getDatabase();

    // Check if template exists
    const existingTemplate = db.prepare('SELECT id FROM workout_templates WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existingTemplate) {
      return NextResponse.json<ApiResponse<WorkoutTemplate>>({
        success: false,
        error: 'Template not found',
      }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Update template
    db.prepare(`
      UPDATE workout_templates
      SET name = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(name.trim(), now, id, userId);

    // Remove existing exercise associations
    db.prepare('DELETE FROM template_exercises WHERE template_id = ? AND user_id = ?').run(id, userId);

    // Insert new exercise associations
    const insertExercise = db.prepare(`
      INSERT INTO template_exercises (id, user_id, template_id, exercise_id, order_index)
      VALUES (?, ?, ?, ?, ?)
    `);

    exerciseIds.forEach((exerciseId, index) => {
      insertExercise.run(uuidv4(), userId, id, exerciseId, index);
    });

    // Fetch updated template with exercises
    const template = db.prepare(`
      SELECT
        wt.*,
        GROUP_CONCAT(te.exercise_id) as exercise_ids
      FROM workout_templates wt
      LEFT JOIN template_exercises te ON wt.id = te.template_id AND te.user_id = wt.user_id
      WHERE wt.id = ? AND wt.user_id = ?
      GROUP BY wt.id
    `).get(id, userId);

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
    const db = getDatabase();

    // Check if template exists
    const existingTemplate = db.prepare('SELECT id FROM workout_templates WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existingTemplate) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Template not found',
      }, { status: 404 });
    }

    // Delete template (cascades to template_exercises)
    db.prepare('DELETE FROM workout_templates WHERE id = ? AND user_id = ?').run(id, userId);

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
