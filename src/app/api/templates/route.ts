import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/database';
import { WorkoutTemplate, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';

// GET /api/templates - Fetch all workout templates
export async function GET() {
  try {
    const db = getDatabase();

    const templates = db.prepare(`
      SELECT
        wt.*,
        GROUP_CONCAT(te.exercise_id) as exercise_ids
      FROM workout_templates wt
      LEFT JOIN template_exercises te ON wt.id = te.template_id
      GROUP BY wt.id
      ORDER BY wt.updated_at DESC
    `).all().map((row: any) => ({
      id: row.id,
      name: row.name,
      exerciseIds: row.exercise_ids ? row.exercise_ids.split(',') : [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
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
    const templateId = uuidv4();
    const now = new Date().toISOString();

    // Insert template
    db.prepare(`
      INSERT INTO workout_templates (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).run(templateId, name.trim(), now, now);

    // Insert exercise associations
    const insertExercise = db.prepare(`
      INSERT INTO template_exercises (id, template_id, exercise_id, order_index)
      VALUES (?, ?, ?, ?)
    `);

    exerciseIds.forEach((exerciseId, index) => {
      insertExercise.run(uuidv4(), templateId, exerciseId, index);
    });

    // Fetch created template with exercises
    const template = db.prepare(`
      SELECT
        wt.*,
        GROUP_CONCAT(te.exercise_id) as exercise_ids
      FROM workout_templates wt
      LEFT JOIN template_exercises te ON wt.id = te.template_id
      WHERE wt.id = ?
      GROUP BY wt.id
    `).get(templateId);

    const responseTemplate: WorkoutTemplate = {
      id: template.id,
      name: template.name,
      exerciseIds: template.exercise_ids ? template.exercise_ids.split(',') : [],
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