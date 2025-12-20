import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { BodyMeasurement, ApiResponse } from '../../../lib/types';
import { v4 as uuidv4 } from 'uuid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';

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
      SELECT * FROM body_measurements
      WHERE user_id = $1
      ORDER BY created_at DESC, date DESC
    `,
      [userId]
    );

    const measurements = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      date: new Date(row.date),
      weight: row.weight || undefined,
      chest: row.chest || undefined,
      waist: row.waist || undefined,
      hips: row.hips || undefined,
      upperArm: row.upper_arm || undefined,
      forearm: row.forearm || undefined,
      thigh: row.thigh || undefined,
      calf: row.calf || undefined,
    })) as BodyMeasurement[];

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
      INSERT INTO body_measurements (
        id, user_id, date, weight, chest, waist, hips, upper_arm, forearm, thigh, calf
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `,
      [
        id,
        userId,
        date,
        weight ?? null,
        chest ?? null,
        waist ?? null,
        hips ?? null,
        upperArm ?? null,
        forearm ?? null,
        thigh ?? null,
        calf ?? null,
      ]
    );

    const measurementResult = await query<any>(
      'SELECT * FROM body_measurements WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    const measurement = measurementResult.rows[0];

    const responseMeasurement: BodyMeasurement = {
      id: measurement.id,
      userId: measurement.user_id,
      date: new Date(measurement.date),
      weight: measurement.weight || undefined,
      chest: measurement.chest || undefined,
      waist: measurement.waist || undefined,
      hips: measurement.hips || undefined,
      upperArm: measurement.upper_arm || undefined,
      forearm: measurement.forearm || undefined,
      thigh: measurement.thigh || undefined,
      calf: measurement.calf || undefined,
    };

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
