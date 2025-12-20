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
      ORDER BY date DESC
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
        SELECT * FROM exercise_sessions
        WHERE workout_session_id = $1 AND user_id = $2
        ORDER BY id
      `,
        [sessionRow.id, userId]
      );
      const exerciseSessions = exerciseResult.rows;

      if (exerciseSessions.length === 0) {
        csvContent += [
          format(new Date(sessionRow.date), 'yyyy-MM-dd'),
          `"${sessionRow.template_name}"`,
          '',
          '',
          ''
        ].join(',') + '\n';
        continue;
      }

      for (const exercise of exerciseSessions) {
        let details = '';

        // Format exercise details based on type
        switch (exercise.type) {
          case 'strength': {
            const strengthData = parseJson(exercise.strength_data);
            if (strengthData?.sets?.length > 0) {
              details = strengthData.sets.map((set: any) => `${set.weight}kg x ${set.reps}`).join(', ');
            }
            break;
          }
          case 'cardio': {
            const cardioData = parseJson(exercise.cardio_data);
            if (cardioData) {
              details = `${cardioData.time}min, Level ${cardioData.level}, ${cardioData.distance}km`;
            }
            break;
          }
          case 'endurance': {
            const enduranceData = parseJson(exercise.endurance_data);
            if (enduranceData) {
              details = `${enduranceData.time}min, ${enduranceData.distance}km, ${enduranceData.pace}min/km`;
            }
            break;
          }
          case 'stretch': {
            const stretchData = parseJson(exercise.stretch_data);
            if (stretchData) {
              details = stretchData.completed ? 'Completed' : 'Not completed';
            }
            break;
          }
        }

        csvContent += [
          format(new Date(sessionRow.date), 'yyyy-MM-dd'),
          `"${sessionRow.template_name}"`,
          `"${exercise.exercise_name}"`,
          exercise.type,
          `"${details}"`
        ].join(',') + '\n';
      }
    }

    // Create filename with current date
    const filename = `fitflex-workouts-${format(new Date(), 'yyyy-MM-dd')}.csv`;

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
