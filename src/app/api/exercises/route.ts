import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/database';
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
    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ExerciseType | null;
    const search = searchParams.get('search');

    let query = `
      SELECT * FROM exercises
      WHERE (user_id = ? OR (user_id IS NULL AND is_default = 1))
    `;
    const params: any[] = [userId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY is_default DESC, name ASC';

    const exercises = db.prepare(query).all(...params).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
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
    const existing = db.prepare('SELECT id FROM exercises WHERE (user_id = ? OR user_id IS NULL) AND name = ?').get(userId, name.trim());
    if (existing) {
      return NextResponse.json<ApiResponse<Exercise>>({
        success: false,
        error: 'Exercise with this name already exists',
      }, { status: 409 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO exercises (id, user_id, name, type, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, name.trim(), type, false, now);

    const exercise = db.prepare('SELECT * FROM exercises WHERE id = ?').get(id);

    const responseExercise: Exercise = {
      id: exercise.id,
      userId: exercise.user_id,
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
