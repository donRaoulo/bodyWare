import { NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database';
import { format } from 'date-fns';

// GET /api/export/measurements - Export body measurements as CSV
export async function GET() {
  try {
    const db = getDatabase();

    // Fetch all body measurements
    const measurements = db.prepare(`
      SELECT * FROM body_measurements
      ORDER BY date DESC
    `).all();

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