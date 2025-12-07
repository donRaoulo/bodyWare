import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';
import { ApiResponse } from '../../../../lib/types';

interface DashboardStats {
  totalWorkouts: number;
  thisWeekWorkouts: number;
  totalExercises: number;
}

// GET /api/sessions/stats - Fetch dashboard statistics
export async function GET() {
  try {
    const db = getDatabase();

    // Total workouts
    const totalWorkouts = db.prepare('SELECT COUNT(*) as count FROM workout_sessions').get() as { count: number };

    // This week's workouts (Monday to Sunday)
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const thisWeekWorkouts = db.prepare(`
      SELECT COUNT(*) as count FROM workout_sessions
      WHERE date BETWEEN ? AND ?
    `).get(startOfWeek.toISOString(), endOfWeek.toISOString()) as { count: number };

    // Total unique exercises
    const totalExercises = db.prepare('SELECT COUNT(*) as count FROM exercises').get() as { count: number };

    const stats: DashboardStats = {
      totalWorkouts: totalWorkouts.count,
      thisWeekWorkouts: thisWeekWorkouts.count,
      totalExercises: totalExercises.count,
    };

    return NextResponse.json<ApiResponse<DashboardStats>>({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json<ApiResponse<DashboardStats>>({
      success: false,
      error: 'Failed to fetch statistics',
    }, { status: 500 });
  }
}