import { NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { ApiResponse } from '../../../../lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

type CounterTotals = Record<string, number>;

// GET /api/sessions/counters - Fetch totals for counter exercises
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<CounterTotals>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const result = await query<{ exercise_id: string; total: string | number | null }>(
      `
      SELECT exercise_id, SUM((counter_data->>'value')::numeric) AS total
      FROM exercise_sessions
      WHERE user_id = $1 AND type = 'counter'
      GROUP BY exercise_id
    `,
      [userId]
    );

    const totals: CounterTotals = {};
    for (const row of result.rows) {
      const value = row.total == null ? 0 : Number(row.total);
      if (!Number.isNaN(value)) {
        totals[row.exercise_id] = value;
      }
    }

    return NextResponse.json<ApiResponse<CounterTotals>>({
      success: true,
      data: totals,
    });
  } catch (error) {
    console.error('Error fetching counter totals:', error);
    return NextResponse.json<ApiResponse<CounterTotals>>({
      success: false,
      error: 'Failed to fetch counter totals',
    }, { status: 500 });
  }
}
