import { NextResponse } from 'next/server';
import { query, parseJson } from '../../../../lib/database';
import { format } from 'date-fns';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

// GET /api/export/workouts - Export workouts as CSV
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all workout sessions with exercises
    const sessionResult = await query<any>(
      `
      SELECT * FROM workout_sessions
      WHERE user_id = $1
      ORDER BY started_at DESC
    `,
      [userId]
    );
    const sessions = sessionResult.rows;

    if (sessions.length === 0) {
      return new Response('No workouts to export', { status: 404 });
    }

    // Generate CSV content
    const csvHeaders = [
      'Date',
      'Template Name',
      'Exercise Name',
      'Exercise Type',
      'Details'
    ];

    let csvContent = csvHeaders.join(',') + '\n';

    for (const sessionRow of sessions) {
      // Fetch exercise sessions for this workout
      const exerciseResult = await query<any>(
        `
        SELECT * FROM workout_session_items
        WHERE workout_session_id = $1 AND user_id = $2
        ORDER BY position ASC, id ASC
      `,
        [sessionRow.id, userId]
      );
      const exerciseSessions = exerciseResult.rows;

      if (exerciseSessions.length === 0) {
        csvContent += [
          format(new Date(sessionRow.started_at), 'yyyy-MM-dd'),
          `"${sessionRow.template_name}"`,
          '',
          '',
          ''
        ].join(',') + '\n';
        continue;
      }

      for (const exercise of exerciseSessions) {
        let details = '';

        const payload = parseJson<Record<string, any>>(exercise.payload) ?? {};

        // Format exercise details based on type
        switch (exercise.exercise_type) {
          case 'strength': {
            const sets = Array.isArray(payload.sets) ? payload.sets : [];
            if (sets.length > 0) {
              details = sets
                .map((set: { weight?: number; reps?: number }) => `${set.weight ?? 0}kg x ${set.reps ?? 0}`)
                .join(', ');
            }
            break;
          }
          case 'cardio': {
            details = `${payload.time ?? 0}min, Level ${payload.level ?? 0}, ${payload.distance ?? 0}km`;
            break;
          }
          case 'endurance': {
            details = `${payload.time ?? 0}min, ${payload.distance ?? 0}km, ${payload.pace ?? 0}min/km`;
            break;
          }
          case 'stretch': {
            details = payload.completed ? 'Completed' : 'Not completed';
            break;
          }
          case 'counter': {
            details = `${payload.value ?? 0}`;
            break;
          }
        }

        csvContent += [
          format(new Date(sessionRow.started_at), 'yyyy-MM-dd'),
          `"${sessionRow.template_name}"`,
          `"${exercise.exercise_name}"`,
          exercise.exercise_type,
          `"${details}"`
        ].join(',') + '\n';
      }
    }

    // Create filename with current date
    const filename = `bodyware-workouts-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting workouts:', error);
    return NextResponse.json(
      { error: 'Failed to export workouts' },
      { status: 500 }
    );
  }
}
