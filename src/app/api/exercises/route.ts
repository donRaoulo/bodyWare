import { NextRequest, NextResponse } from 'next/server';
import { getDatabase, parseJson, stringifyJson } from '../../../lib/database';
import { Exercise, ExerciseType, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';

// GET /api/exercises - Fetch all exercises
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ExerciseType | null;
    const search = searchParams.get('search');

    let query = 'SELECT * FROM exercises ORDER BY is_default DESC, name ASC';
    const params: any[] = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    if (search) {
      if (type) {
        query += ' AND name LIKE ?';
      } else {
        query += ' WHERE name LIKE ?';
      }
      params.push(`%${search}%`);
    }

    const exercises = db.prepare(query).all(...params).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
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
    const body = await request.json();
    const { name, type }: { name: string; type: ExerciseType } = body;

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

    if (!['strength', 'cardio', 'endurance', 'stretch'].includes(type)) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Invalid exercise type',
      }, { status: 400 });
    }

    const db = getDatabase();

    // Check if exercise with same name already exists
    const existing = db.prepare('SELECT id FROM exercises WHERE name = ?').get(name.trim());
    if (existing) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Exercise with this name already exists',
      }, { status: 409 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO exercises (id, name, type, is_default)
      VALUES (?, ?, ?, ?)
    `).run(id, name.trim(), type, false);

    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);

    const responseExercise: Exercise = {
      id: exercise.id,
      name: exercise.name,
      type: exercise.type,
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