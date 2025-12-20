import { NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { format } from 'date-fns';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

// GET /api/export/measurements - Export body measurements as CSV
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all body measurements
    const result = await query<any>(
      `
      SELECT * FROM body_measurements
      WHERE user_id = $1
      ORDER BY date DESC
    `,
      [userId]
    );
    const measurements = result.rows;

    if (measurements.length === 0) {
      return new Response('No measurements to export', { status: 404 });
    }

    // Generate CSV content
    const csvHeaders = [
      'Date',
      'Weight (kg)',
      'Chest (cm)',
      'Waist (cm)',
      'Hips (cm)',
      'Upper Arm (cm)',
      'Forearm (cm)',
      'Thigh (cm)',
      'Calf (cm)'
    ];

    let csvContent = csvHeaders.join(',') + '\n';

    for (const measurement of measurements) {
      csvContent += [
        format(new Date(measurement.date), 'yyyy-MM-dd'),
        measurement.weight || '',
        measurement.chest || '',
        measurement.waist || '',
        measurement.hips || '',
        measurement.upper_arm || '',
        measurement.forearm || '',
        measurement.thigh || '',
        measurement.calf || ''
      ].join(',') + '\n';
    }

    // Create filename with current date
    const filename = `fitflex-measurements-${format(new Date(), 'yyyy-MM-dd')}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting measurements:', error);
    return NextResponse.json(
      { error: 'Failed to export measurements' },
      { status: 500 }
    );
  }
}
