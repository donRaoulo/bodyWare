import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { BodyMeasurement, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { fromBodyEntryRow, toBodyMetricsJson } from '../../../lib/body-entries';

// GET /api/measurements - Fetch body measurements
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<BodyMeasurement[]>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;

    const result = await query<any>(
      `
      SELECT * FROM body_entries
      WHERE user_id = $1
      ORDER BY created_at DESC, measured_at DESC
    `,
      [userId]
    );

    const measurements = result.rows.map(fromBodyEntryRow) as BodyMeasurement[];

    return NextResponse.json<ApiResponse<BodyMeasurement[]>>({
      success: true,
      data: measurements,
    });
  } catch (error) {
    console.error('Error fetching measurements:', error);
    return NextResponse.json<ApiResponse<BodyMeasurement[]>>({
      success: false,
      error: 'Failed to fetch measurements',
    }, { status: 500 });
  }
}

// POST /api/measurements - Create new body measurement
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<BodyMeasurement>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { date, weight, chest, waist, hips, upperArm, forearm, thigh, calf }: {
      date: string;
      weight?: number;
      chest?: number;
      waist?: number;
      hips?: number;
      upperArm?: number;
      forearm?: number;
      thigh?: number;
      calf?: number;
    } = body;

    if (!date) {
      return NextResponse.json<ApiResponse<BodyMeasurement>>({
        success: false,
        error: 'Date is required',
      }, { status: 400 });
    }

    // Validate that at least one measurement is provided
    const hasAnyMeasurement = [weight, chest, waist, hips, upperArm, forearm, thigh, calf]
      .some(value => value !== undefined && value !== null && !isNaN(value as any));

    if (!hasAnyMeasurement) {
      return NextResponse.json<ApiResponse<BodyMeasurement>>({
        success: false,
        error: 'At least one measurement must be provided',
      }, { status: 400 });
    }

    const id = uuidv4();

    await query(
      `
      INSERT INTO body_entries (
        id, user_id, measured_at, weight_kg, metrics, created_at
      ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
    `,
      [
        id,
        userId,
        date,
        weight ?? null,
        toBodyMetricsJson({ chest, waist, hips, upperArm, forearm, thigh, calf }),
        new Date().toISOString(),
      ]
    );

    const measurementResult = await query<any>(
      'SELECT * FROM body_entries WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    const measurement = measurementResult.rows[0];

    const responseMeasurement: BodyMeasurement = fromBodyEntryRow(measurement);

    return NextResponse.json<ApiResponse<BodyMeasurement>>({
      success: true,
      data: responseMeasurement,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating measurement:', error);
    return NextResponse.json<ApiResponse<BodyMeasurement>>({
      success: false,
      error: 'Failed to create measurement',
    }, { status: 500 });
  }
}
