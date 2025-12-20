import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../lib/database';
import { UserSettings, ApiResponse } from '../../../lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { v4 as uuidv4 } from 'uuid';

// GET /api/settings - Fetch user settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<UserSettings>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;

    let settingsResult = await query<any>('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
    let settings = settingsResult.rows[0];

    // Create default settings if not exist
    if (!settings) {
      await query(
        `
        INSERT INTO user_settings (id, user_id, dashboard_session_limit, dark_mode)
        VALUES ($1, $2, $3, $4)
      `,
        [uuidv4(), userId, 5, false]
      );

      settingsResult = await query<any>('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
      settings = settingsResult.rows[0];
    }

    const responseSettings: UserSettings = {
      id: settings.id,
      userId: settings.user_id,
      dashboardSessionLimit: settings.dashboard_session_limit,
      darkMode: Boolean(settings.dark_mode),
      primaryColor: settings.theme_color || '#58a6ff',
    };

    return NextResponse.json<ApiResponse<UserSettings>>({
      success: true,
      data: responseSettings,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json<ApiResponse<UserSettings>>({
      success: false,
      error: 'Failed to fetch settings',
    }, { status: 500 });
  }
}

// PUT /api/settings - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json<ApiResponse<UserSettings>>({
        success: false,
        error: 'Unauthorized',
      }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { dashboardSessionLimit, darkMode }: {
      dashboardSessionLimit?: number;
      darkMode?: boolean;
      primaryColor?: string;
    } = body;

    // Check if settings exist
    const existingSettings = await query<{ id: string }>('SELECT id, theme_color FROM user_settings WHERE user_id = $1', [userId]);
    if (!existingSettings.rows[0]) {
      // Create default settings first
      await query(
        `
        INSERT INTO user_settings (id, user_id, dashboard_session_limit, dark_mode, theme_color)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [uuidv4(), userId, 5, false, '#58a6ff']
      );
    }

    // Update settings
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (dashboardSessionLimit !== undefined) {
      if (dashboardSessionLimit < 1 || dashboardSessionLimit > 20) {
        return NextResponse.json<ApiResponse<UserSettings>>({
          success: false,
          error: 'Dashboard session limit must be between 1 and 20',
        }, { status: 400 });
      }
      updateFields.push('dashboard_session_limit = $' + (updateValues.length + 1));
      updateValues.push(dashboardSessionLimit);
    }

    if (darkMode !== undefined) {
      updateFields.push('dark_mode = $' + (updateValues.length + 1));
      updateValues.push(darkMode);
    }

    if (body.primaryColor !== undefined) {
      const color = body.primaryColor;
      const isValidHex = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/.test(color);
      if (!isValidHex) {
        return NextResponse.json<ApiResponse<UserSettings>>({
          success: false,
          error: 'Invalid color format. Use hex like #58a6ff',
        }, { status: 400 });
      }
      updateFields.push('theme_color = $' + (updateValues.length + 1));
      updateValues.push(color);
    }

    if (updateFields.length === 0) {
      return NextResponse.json<ApiResponse<UserSettings>>({
        success: false,
        error: 'No valid settings provided',
      }, { status: 400 });
    }

    updateValues.push(userId); // for WHERE clause

    await query(
      `
      UPDATE user_settings
      SET ${updateFields.join(', ')}
      WHERE user_id = $${updateValues.length}
    `,
      updateValues
    );

    // Fetch updated settings
    const settingsResult = await query<any>('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
    const settings = settingsResult.rows[0];

    const responseSettings: UserSettings = {
      id: settings.id,
      userId: settings.user_id,
      dashboardSessionLimit: settings.dashboard_session_limit,
      darkMode: Boolean(settings.dark_mode),
      primaryColor: settings.theme_color || '#58a6ff',
    };

    return NextResponse.json<ApiResponse<UserSettings>>({
      success: true,
      data: responseSettings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json<ApiResponse<UserSettings>>({
      success: false,
      error: 'Failed to update settings',
    }, { status: 500 });
  }
}
