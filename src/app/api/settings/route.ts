import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../lib/database';
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
    const db = getDatabase();

    let settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);

    // Create default settings if not exist
    if (!settings) {
      db.prepare(`
        INSERT INTO user_settings (id, user_id, dashboard_session_limit, dark_mode)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), userId, 5, false);

      settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
    }

    const responseSettings: UserSettings = {
      id: settings.id,
      userId: settings.user_id,
      dashboardSessionLimit: settings.dashboard_session_limit,
      darkMode: Boolean(settings.dark_mode),
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
    } = body;

    const db = getDatabase();

    // Check if settings exist
    const existingSettings = db.prepare('SELECT id FROM user_settings WHERE user_id = ?').get(userId);
    if (!existingSettings) {
      // Create default settings first
      db.prepare(`
        INSERT INTO user_settings (id, user_id, dashboard_session_limit, dark_mode)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), userId, 5, false);
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
      updateFields.push('dashboard_session_limit = ?');
      updateValues.push(dashboardSessionLimit);
    }

    if (darkMode !== undefined) {
      updateFields.push('dark_mode = ?');
      updateValues.push(darkMode);
    }

    if (updateFields.length === 0) {
      return NextResponse.json<ApiResponse<UserSettings>>({
        success: false,
        error: 'No valid settings provided',
      }, { status: 400 });
    }

    updateValues.push(userId); // for WHERE clause

    db.prepare(`
      UPDATE user_settings
      SET ${updateFields.join(', ')}
      WHERE user_id = ?
    `).run(...updateValues);

    // Fetch updated settings
    const settings = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);

    const responseSettings: UserSettings = {
      id: settings.id,
      userId: settings.user_id,
      dashboardSessionLimit: settings.dashboard_session_limit,
      darkMode: Boolean(settings.dark_mode),
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
