import { NextResponse } from 'next/server';
import { getDatabase, parseJson } from '../../../../lib/database';
import { format } from 'date-fns';

// GET /api/export/workouts - Export workouts as CSV
export async function GET() {
  try {
    const db = getDatabase();

    // Fetch all workout sessions with exercises
    const sessions = db.prepare(`
      SELECT * FROM workout_sessions
      ORDER BY date DESC
    `).all();

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

    for (const session of sessions) {
      // Fetch exercise sessions for this workout
      const exerciseSessions = db.prepare(`
        SELECT * FROM exercise_sessions
        WHERE workout_session_id = ?
        ORDER BY id
      `).all(session.id);

      if (exerciseSessions.length === 0) {
        // Add session row even if no exercises
        csvContent += [
          format(new Date(session.date), 'yyyy-MM-dd'),
          `"${session.template_name}"`,
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
          case 'strength':
            const strengthData = parseJson(exercise.strength_data);
            if (strengthData?.sets?.length > 0) {
              details = strengthData.sets.map((set: any) => `${set.weight}kg × ${set.reps}`).join(', ');
            }
            break;
          case 'cardio':
            const cardioData = parseJson(exercise.cardio_data);
            if (cardioData) {
              details = `${cardioData.time}min, Level ${cardioData.level}, ${cardioData.distance}km`;
            }
            break;
          case 'endurance':
            const enduranceData = parseJson(exercise.endurance_data);
            if (enduranceData) {
              details = `${enduranceData.time}min, ${enduranceData.distance}km, ${enduranceData.pace}min/km`;
            }
            break;
          case 'stretch':
            const stretchData = parseJson(exercise.stretch_data);
            if (stretchData) {
              details = stretchData.completed ? 'Completed' : 'Not completed';
            }
            break;
        }

        csvContent += [
          format(new Date(session.date), 'yyyy-MM-dd'),
          `"${session.template_name}"`,
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