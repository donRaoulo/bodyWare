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
        INSERT INTO user_settings (
          id,
          user_id,
          dashboard_session_limit,
          dark_mode,
          show_recent_workouts,
          show_calendar,
          show_stats_total_workouts,
          show_stats_this_week,
          show_stats_total_weight,
          show_prs,
          dashboard_widget_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
        [uuidv4(), userId, 5, false, true, true, true, true, true, true, '["stats","prs","calendar","recent"]']
      );

      settingsResult = await query<any>('SELECT * FROM user_settings WHERE user_id = $1', [userId]);
      settings = settingsResult.rows[0];
    }

    let parsedWidgetOrder: string[] = ['stats', 'prs', 'calendar', 'recent'];
    if (settings.dashboard_widget_order) {
      try {
        const parsed = JSON.parse(settings.dashboard_widget_order);
        if (Array.isArray(parsed)) {
          parsedWidgetOrder = parsed;
        }
      } catch {
        parsedWidgetOrder = ['stats', 'prs', 'calendar', 'recent'];
      }
    }
    const responseSettings: UserSettings = {
      id: settings.id,
      userId: settings.user_id,
      dashboardSessionLimit: settings.dashboard_session_limit,
      darkMode: Boolean(settings.dark_mode),
      primaryColor: settings.theme_color || '#58a6ff',
      showRecentWorkouts: settings.show_recent_workouts ?? true,
      showCalendar: settings.show_calendar ?? true,
      showStatsTotalWorkouts: settings.show_stats_total_workouts ?? true,
      showStatsThisWeek: settings.show_stats_this_week ?? true,
      showStatsTotalWeight: settings.show_stats_total_weight ?? true,
      showPrs: settings.show_prs ?? true,
      dashboardWidgetOrder: parsedWidgetOrder,
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
    const {
      dashboardSessionLimit,
      darkMode,
      showRecentWorkouts,
      showCalendar,
      showStatsTotalWorkouts,
      showStatsThisWeek,
      showStatsTotalWeight,
      showPrs,
      dashboardWidgetOrder,
    }: {
      dashboardSessionLimit?: number;
      darkMode?: boolean;
      primaryColor?: string;
      showRecentWorkouts?: boolean;
      showCalendar?: boolean;
      showStatsTotalWorkouts?: boolean;
      showStatsThisWeek?: boolean;
      showStatsTotalWeight?: boolean;
      showPrs?: boolean;
      dashboardWidgetOrder?: string[];
    } = body;

    // Check if settings exist
    const existingSettings = await query<{ id: string }>('SELECT id, theme_color FROM user_settings WHERE user_id = $1', [userId]);
    if (!existingSettings.rows[0]) {
      // Create default settings first
      await query(
        `
        INSERT INTO user_settings (
          id,
          user_id,
          dashboard_session_limit,
          dark_mode,
          theme_color,
          show_recent_workouts,
          show_calendar,
          show_stats_total_workouts,
          show_stats_this_week,
          show_stats_total_weight,
          show_prs,
          dashboard_widget_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
        [uuidv4(), userId, 5, false, '#58a6ff', true, true, true, true, true, true, '["stats","prs","calendar","recent"]']
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

    if (showRecentWorkouts !== undefined) {
      updateFields.push('show_recent_workouts = $' + (updateValues.length + 1));
      updateValues.push(showRecentWorkouts);
    }

    if (showCalendar !== undefined) {
      updateFields.push('show_calendar = $' + (updateValues.length + 1));
      updateValues.push(showCalendar);
    }

    if (showStatsTotalWorkouts !== undefined) {
      updateFields.push('show_stats_total_workouts = $' + (updateValues.length + 1));
      updateValues.push(showStatsTotalWorkouts);
    }

    if (showStatsThisWeek !== undefined) {
      updateFields.push('show_stats_this_week = $' + (updateValues.length + 1));
      updateValues.push(showStatsThisWeek);
    }

    if (showStatsTotalWeight !== undefined) {
      updateFields.push('show_stats_total_weight = $' + (updateValues.length + 1));
      updateValues.push(showStatsTotalWeight);
    }

    if (showPrs !== undefined) {
      updateFields.push('show_prs = $' + (updateValues.length + 1));
      updateValues.push(showPrs);
    }

    if (dashboardWidgetOrder !== undefined) {
      const allowed = new Set(['stats', 'prs', 'calendar', 'recent']);
      const normalizedOrder = Array.isArray(dashboardWidgetOrder)
        ? dashboardWidgetOrder.filter((item) => allowed.has(item))
        : [];
      if (!normalizedOrder.length) {
        return NextResponse.json<ApiResponse<UserSettings>>({
          success: false,
          error: 'Invalid dashboard widget order',
        }, { status: 400 });
      }
      updateFields.push('dashboard_widget_order = $' + (updateValues.length + 1));
      updateValues.push(JSON.stringify(normalizedOrder));
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

    let parsedUpdatedOrder: string[] = ['stats', 'prs', 'calendar', 'recent'];
    if (settings.dashboard_widget_order) {
      try {
        const parsed = JSON.parse(settings.dashboard_widget_order);
        if (Array.isArray(parsed)) {
          parsedUpdatedOrder = parsed;
        }
      } catch {
        parsedUpdatedOrder = ['stats', 'prs', 'calendar', 'recent'];
      }
    }
    const responseSettings: UserSettings = {
      id: settings.id,
      userId: settings.user_id,
      dashboardSessionLimit: settings.dashboard_session_limit,
      darkMode: Boolean(settings.dark_mode),
      primaryColor: settings.theme_color || '#58a6ff',
      showRecentWorkouts: settings.show_recent_workouts ?? true,
      showCalendar: settings.show_calendar ?? true,
      showStatsTotalWorkouts: settings.show_stats_total_workouts ?? true,
      showStatsThisWeek: settings.show_stats_this_week ?? true,
      showStatsTotalWeight: settings.show_stats_total_weight ?? true,
      showPrs: settings.show_prs ?? true,
      dashboardWidgetOrder: parsedUpdatedOrder,
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
