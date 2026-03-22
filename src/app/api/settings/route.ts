import { NextRequest, NextResponse } from 'next/server';
import { query, parseJson, stringifyJson } from '../../../lib/database';
import { UserSettings, ApiResponse } from '../../../lib/types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth';
import { v4 as uuidv4 } from 'uuid';

const DASHBOARD_WIDGET_IDS = ['quickstart', 'weeklyGoal', 'stats', 'prs', 'calendar', 'recent'] as const;
const DEFAULT_DASHBOARD_CONFIG = {
  showRecentWorkouts: true,
  showCalendar: true,
  showStatsTotalWorkouts: true,
  showStatsThisWeek: true,
  showStatsTotalWeight: true,
  showPrs: true,
  showQuickstart: true,
  showWeeklyGoal: true,
  dashboardWidgetOrder: [...DASHBOARD_WIDGET_IDS] as string[],
};

type DashboardConfig = typeof DEFAULT_DASHBOARD_CONFIG;

function normalizeDashboardWidgetOrder(value: unknown): string[] {
  const allowed = new Set<string>(DASHBOARD_WIDGET_IDS);
  const input = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  const deduped: string[] = [];

  for (const item of input) {
    if (allowed.has(item) && !deduped.includes(item)) {
      deduped.push(item);
    }
  }

  for (const item of DASHBOARD_WIDGET_IDS) {
    if (!deduped.includes(item)) {
      deduped.push(item);
    }
  }

  return deduped;
}

function normalizeDashboardConfig(value: unknown): DashboardConfig {
  const parsed = (value && typeof value === 'object' ? value : {}) as Partial<DashboardConfig>;

  return {
    showRecentWorkouts:
      typeof parsed.showRecentWorkouts === 'boolean' ? parsed.showRecentWorkouts : DEFAULT_DASHBOARD_CONFIG.showRecentWorkouts,
    showCalendar: typeof parsed.showCalendar === 'boolean' ? parsed.showCalendar : DEFAULT_DASHBOARD_CONFIG.showCalendar,
    showStatsTotalWorkouts:
      typeof parsed.showStatsTotalWorkouts === 'boolean'
        ? parsed.showStatsTotalWorkouts
        : DEFAULT_DASHBOARD_CONFIG.showStatsTotalWorkouts,
    showStatsThisWeek:
      typeof parsed.showStatsThisWeek === 'boolean' ? parsed.showStatsThisWeek : DEFAULT_DASHBOARD_CONFIG.showStatsThisWeek,
    showStatsTotalWeight:
      typeof parsed.showStatsTotalWeight === 'boolean'
        ? parsed.showStatsTotalWeight
        : DEFAULT_DASHBOARD_CONFIG.showStatsTotalWeight,
    showPrs: typeof parsed.showPrs === 'boolean' ? parsed.showPrs : DEFAULT_DASHBOARD_CONFIG.showPrs,
    showQuickstart: typeof parsed.showQuickstart === 'boolean' ? parsed.showQuickstart : DEFAULT_DASHBOARD_CONFIG.showQuickstart,
    showWeeklyGoal:
      typeof parsed.showWeeklyGoal === 'boolean' ? parsed.showWeeklyGoal : DEFAULT_DASHBOARD_CONFIG.showWeeklyGoal,
    dashboardWidgetOrder: normalizeDashboardWidgetOrder(parsed.dashboardWidgetOrder),
  };
}

function mapSettings(row: any): UserSettings {
  const config = normalizeDashboardConfig(parseJson(row.dashboard_config));
  return {
    id: row.id,
    userId: row.user_id,
    dashboardSessionLimit: Number(row.dashboard_session_limit ?? 5),
    darkMode: Boolean(row.dark_mode),
    primaryColor: row.theme_color || '#58a6ff',
    showRecentWorkouts: config.showRecentWorkouts,
    showCalendar: config.showCalendar,
    showStatsTotalWorkouts: config.showStatsTotalWorkouts,
    showStatsThisWeek: config.showStatsThisWeek,
    showStatsTotalWeight: config.showStatsTotalWeight,
    showPrs: config.showPrs,
    showQuickstart: config.showQuickstart,
    showWeeklyGoal: config.showWeeklyGoal,
    dashboardWidgetOrder: config.dashboardWidgetOrder,
  };
}

async function ensureUserPreferences(userId: string) {
  let settingsResult = await query<any>('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
  if (!settingsResult.rows[0]) {
    await query(
      `
      INSERT INTO user_preferences (
        id,
        user_id,
        dashboard_session_limit,
        dark_mode,
        theme_color,
        dashboard_config
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [uuidv4(), userId, 5, false, '#58a6ff', stringifyJson(DEFAULT_DASHBOARD_CONFIG)]
    );
    settingsResult = await query<any>('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);
  }
  return settingsResult.rows[0];
}

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
    const settings = await ensureUserPreferences(userId);

    return NextResponse.json<ApiResponse<UserSettings>>({
      success: true,
      data: mapSettings(settings),
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
      showQuickstart,
      showWeeklyGoal,
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
      showQuickstart?: boolean;
      showWeeklyGoal?: boolean;
      dashboardWidgetOrder?: string[];
    } = body;

    const currentRow = await ensureUserPreferences(userId);
    const currentConfig = normalizeDashboardConfig(parseJson(currentRow.dashboard_config));
    const nextConfig: DashboardConfig = { ...currentConfig };

    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let configChanged = false;

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

    if (showRecentWorkouts !== undefined) {
      nextConfig.showRecentWorkouts = showRecentWorkouts;
      configChanged = true;
    }
    if (showCalendar !== undefined) {
      nextConfig.showCalendar = showCalendar;
      configChanged = true;
    }
    if (showStatsTotalWorkouts !== undefined) {
      nextConfig.showStatsTotalWorkouts = showStatsTotalWorkouts;
      configChanged = true;
    }
    if (showStatsThisWeek !== undefined) {
      nextConfig.showStatsThisWeek = showStatsThisWeek;
      configChanged = true;
    }
    if (showStatsTotalWeight !== undefined) {
      nextConfig.showStatsTotalWeight = showStatsTotalWeight;
      configChanged = true;
    }
    if (showPrs !== undefined) {
      nextConfig.showPrs = showPrs;
      configChanged = true;
    }
    if (showQuickstart !== undefined) {
      nextConfig.showQuickstart = showQuickstart;
      configChanged = true;
    }
    if (showWeeklyGoal !== undefined) {
      nextConfig.showWeeklyGoal = showWeeklyGoal;
      configChanged = true;
    }
    if (dashboardWidgetOrder !== undefined) {
      if (!Array.isArray(dashboardWidgetOrder)) {
        return NextResponse.json<ApiResponse<UserSettings>>({
          success: false,
          error: 'Invalid dashboard widget order',
        }, { status: 400 });
      }
      nextConfig.dashboardWidgetOrder = normalizeDashboardWidgetOrder(dashboardWidgetOrder);
      configChanged = true;
    }

    if (configChanged) {
      updateFields.push('dashboard_config = $' + (updateValues.length + 1) + '::jsonb');
      updateValues.push(stringifyJson(nextConfig));
    }

    if (updateFields.length === 0) {
      return NextResponse.json<ApiResponse<UserSettings>>({
        success: false,
        error: 'No valid settings provided',
      }, { status: 400 });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(userId);

    await query(
      `
      UPDATE user_preferences
      SET ${updateFields.join(', ')}
      WHERE user_id = $${updateValues.length}
      `,
      updateValues
    );

    const updatedResult = await query<any>('SELECT * FROM user_preferences WHERE user_id = $1', [userId]);

    return NextResponse.json<ApiResponse<UserSettings>>({
      success: true,
      data: mapSettings(updatedResult.rows[0]),
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json<ApiResponse<UserSettings>>({
      success: false,
      error: 'Failed to update settings',
    }, { status: 500 });
  }
}
