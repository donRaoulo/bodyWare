import { NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { ApiResponse } from '../../../../lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
};

// GET /api/sessions/prs - Fetch strength PRs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<PersonalRecord[]>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const result = await query<any>(
      `
      SELECT
        wsi.exercise_id,
        wsi.exercise_name,
        MAX((set_item->>'weight')::numeric) AS max_weight
      FROM workout_session_items wsi
      LEFT JOIN exercises ex
        ON ex.id = wsi.exercise_id
      CROSS JOIN LATERAL jsonb_array_elements(wsi.payload->'sets') AS set_item
      WHERE wsi.user_id = $1
        AND wsi.exercise_type = 'strength'
        AND wsi.payload IS NOT NULL
        AND COALESCE(ex.show_in_personal_records, TRUE) = TRUE
        AND (set_item->>'weight') IS NOT NULL
        AND (set_item->>'weight') <> ''
      GROUP BY wsi.exercise_id, wsi.exercise_name
      ORDER BY max_weight DESC
      LIMIT 5
    `,
      [userId]
    );

    const records: PersonalRecord[] = result.rows.map((row: any) => ({
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      maxWeight: Number(row.max_weight),
    }));

    return NextResponse.json<ApiResponse<PersonalRecord[]>>({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error('Error fetching PRs:', error);
    return NextResponse.json<ApiResponse<PersonalRecord[]>>({
      success: false,
      error: 'Failed to fetch PRs',
    }, { status: 500 });
  }
}
