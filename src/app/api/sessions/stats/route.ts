import { NextResponse } from 'next/server';
import { query, parseJson } from '../../../../lib/database';
import { ApiResponse } from '../../../../lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

interface DashboardStats {
  totalWorkouts: number;
  thisWeekWorkouts: number;
  totalWeightKg: number;
}

// GET /api/sessions/stats - Fetch dashboard statistics
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<DashboardStats>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;

    const totalWorkoutsResult = await query<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM workout_sessions WHERE user_id = $1',
      [userId]
    );

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday start
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const thisWeekWorkoutsResult = await query<{ count: string }>(
      `
      SELECT COUNT(*)::int AS count FROM workout_sessions
      WHERE user_id = $1 AND date BETWEEN $2 AND $3
    `,
      [userId, startOfWeek.toISOString(), endOfWeek.toISOString()]
    );

    // Sum all lifted weight across strength exercises (sum of weight*reps per set)
    const strengthRows = await query<any>(
      `
      SELECT strength_data FROM exercise_sessions
      WHERE user_id = $1 AND strength_data IS NOT NULL
    `,
      [userId]
    );

    let totalWeightKg = 0;
    for (const row of strengthRows.rows) {
      const data = parseJson<{ sets?: { weight?: number; reps?: number }[] }>(row.strength_data);
      if (data?.sets?.length) {
        for (const set of data.sets) {
          const w = set.weight ?? 0;
          const r = set.reps ?? 0;
          totalWeightKg += w * r;
        }
      }
    }

    const stats: DashboardStats = {
      totalWorkouts: parseInt(totalWorkoutsResult.rows[0].count, 10),
      thisWeekWorkouts: parseInt(thisWeekWorkoutsResult.rows[0].count, 10),
      totalWeightKg,
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
