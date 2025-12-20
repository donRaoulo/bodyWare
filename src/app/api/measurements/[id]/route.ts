import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../../lib/database';
import { BodyMeasurement, ApiResponse } from '../../../../lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

// GET /api/measurements/[id] - Fetch specific measurement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<BodyMeasurement>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;

    const result = await query<any>('SELECT * FROM body_measurements WHERE id = $1 AND user_id = $2', [id, userId]);
    const measurement = result.rows[0];

    if (!measurement) {
      return NextResponse.json<ApiResponse<BodyMeasurement>>({
        success: false,
        error: 'Measurement not found',
      }, { status: 404 });
    }

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
    });
  } catch (error) {
    console.error('Error fetching measurement:', error);
    return NextResponse.json<ApiResponse<BodyMeasurement>>({
      success: false,
      error: 'Failed to fetch measurement',
    }, { status: 500 });
  }
}

// DELETE /api/measurements/[id] - Delete body measurement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;

    // Check if measurement exists
    const existingMeasurement = await query<{ id: string }>(
      'SELECT id FROM body_measurements WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (!existingMeasurement.rows[0]) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: 'Measurement not found',
      }, { status: 404 });
    }

    // Delete measurement
    await query('DELETE FROM body_measurements WHERE id = $1 AND user_id = $2', [id, userId]);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('Error deleting measurement:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: 'Failed to delete measurement',
    }, { status: 500 });
  }
}
