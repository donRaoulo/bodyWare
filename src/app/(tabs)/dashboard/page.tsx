'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  Chip,
  Alert,
  Skeleton,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  FitnessCenter as FitnessIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { WorkoutSession, WorkoutTemplate, UserSettings } from '../../../lib/types';
import Link from 'next/link';
import { WorkoutCalendar } from '../../../components/WorkoutCalendar';

interface DashboardStats {
  totalWorkouts: number;
  thisWeekWorkouts: number;
/*  */  thisWeekGoalWorkouts: number;
  totalWeightKg: number;
}

type PersonalRecord = {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
};

export default function DashboardPage() {
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    thisWeekGoalWorkouts: 0,
    totalWeightKg: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarSessions, setCalendarSessions] = useState<WorkoutSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [dashboardSettings, setDashboardSettings] = useState<Pick<UserSettings, 'dashboardSessionLimit' | 'showRecentWorkouts' | 'showCalendar' | 'showStatsTotalWorkouts' | 'showStatsThisWeek' | 'showStatsTotalWeight' | 'showPrs' | 'showQuickstart' | 'showWeeklyGoal' | 'dashboardWidgetOrder'>>({
    dashboardSessionLimit: 5,
    showRecentWorkouts: true,
    showCalendar: true,
    showStatsTotalWorkouts: true,
    showStatsThisWeek: true,
    showStatsTotalWeight: true,
    showPrs: true,
    showQuickstart: true,
    showWeeklyGoal: true,
    dashboardWidgetOrder: ['quickstart', 'weeklyGoal', 'stats', 'prs', 'calendar', 'recent'],
  });
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const weeklyGoal = 3;
  const weeklyProgress = Math.min(100, Math.round((stats.thisWeekGoalWorkouts / weeklyGoal) * 100));
  const workoutsToGoal = Math.max(0, weeklyGoal - stats.thisWeekGoalWorkouts);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user settings first to respect session limit
      const settingsResponse = await fetch('/api/settings');
      const settingsData = await settingsResponse.json();
      const limitFromSettings =
        settingsResponse.ok && settingsData.success && settingsData.data?.dashboardSessionLimit
          ? settingsData.data.dashboardSessionLimit
          : 5;
      if (settingsResponse.ok && settingsData.success && settingsData.data) {
        setDashboardSettings({
          dashboardSessionLimit: settingsData.data.dashboardSessionLimit ?? limitFromSettings,
          showRecentWorkouts: settingsData.data.showRecentWorkouts ?? true,
          showCalendar: settingsData.data.showCalendar ?? true,
          showStatsTotalWorkouts: settingsData.data.showStatsTotalWorkouts ?? true,
          showStatsThisWeek: settingsData.data.showStatsThisWeek ?? true,
          showStatsTotalWeight: settingsData.data.showStatsTotalWeight ?? true,
          showPrs: settingsData.data.showPrs ?? true,
          showQuickstart: settingsData.data.showQuickstart ?? true,
          showWeeklyGoal: settingsData.data.showWeeklyGoal ?? true,
          dashboardWidgetOrder: settingsData.data.dashboardWidgetOrder ?? ['quickstart', 'weeklyGoal', 'stats', 'prs', 'calendar', 'recent'],
        });
      }

      const [sessionsResponse, statsResponse, calendarResponse, templatesResponse, prsResponse] = await Promise.all([
        fetch(`/api/sessions?limit=${limitFromSettings}&dashboardRecentOnly=true`),
        fetch('/api/sessions/stats'),
        fetch('/api/sessions?limit=1000'),
        fetch('/api/templates'),
        fetch('/api/sessions/prs'),
      ]);

      const sessionsData = await sessionsResponse.json();
      if (sessionsResponse.ok && sessionsData.success) {
        setRecentSessions(sessionsData.data);
      }

      const statsData = await statsResponse.json();
      if (statsResponse.ok && statsData.success) {
        setStats(statsData.data);
      }

      const calendarData = await calendarResponse.json();
      if (calendarResponse.ok && calendarData.success) {
        setCalendarSessions(calendarData.data);
      }

      const templatesData = await templatesResponse.json();
      if (templatesResponse.ok && templatesData.success) {
        setTemplates(templatesData.data);
      }

      const prsData = await prsResponse.json();
      if (prsResponse.ok && prsData.success) {
        setPrs(prsData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Loeschen fehlgeschlagen');
      }
      await fetchDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Loeschen fehlgeschlagen');
    }
  };


  if (loading) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { md: '1fr 1fr' }, gap: 3, mb: 4 }}>
          <Skeleton variant="rectangular" height={120} />
          <Skeleton variant="rectangular" height={120} />
        </Box>
        <Skeleton variant="rectangular" height={300} />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        className="ff-reveal"
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1">
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Fokus auf die naechsten Schritte und deine aktuelle Trainingswoche.
          </Typography>
        </Box>
        {dashboardSettings.showWeeklyGoal && (
          <Chip
            color={workoutsToGoal === 0 ? 'success' : 'primary'}
            label={workoutsToGoal === 0 ? 'Wochenziel erreicht' : `${workoutsToGoal} Workout${workoutsToGoal === 1 ? '' : 's'} bis Ziel`}
          />
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {(() => {
        const widgets: Record<string, React.ReactNode> = {
          quickstart: dashboardSettings.showQuickstart ? (
            <Card className="ff-reveal-delay" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Schnellstart
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Starte direkt deine naechste Einheit oder fuege neue Daten hinzu.
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button variant="text" startIcon={<FitnessIcon />} component={Link} href="/trainings">
                    Workout starten
                  </Button>
                  <Button variant="text" startIcon={<AddIcon />} component={Link} href="/measurements/create">
                    Messung eintragen
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ) : null,
          weeklyGoal: dashboardSettings.showWeeklyGoal ? (
            <Card
              className="ff-reveal-delay"
              sx={{
                mb: 3,
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main}14, ${theme.palette.primary.main}05)`,
                border: (theme) => `1px solid ${theme.palette.primary.main}30`,
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1 }}>
                  <Box>
                    <Typography variant="h6">Wochenziel</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.thisWeekGoalWorkouts} von {weeklyGoal} Workouts erledigt
                    </Typography>
                  </Box>
                  <Chip
                    color={workoutsToGoal === 0 ? 'success' : 'primary'}
                    label={workoutsToGoal === 0 ? 'Ziel erreicht' : `${workoutsToGoal} offen`}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={weeklyProgress}
                  sx={{ height: 10, borderRadius: 999, mb: 1.5 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    {workoutsToGoal === 0
                      ? 'Stark. Optional: extra Session fuer ein neues PR.'
                      : 'Bleib im Rhythmus und schliesse dein Wochenziel ab.'}
                  </Typography>
                  {workoutsToGoal > 0 && (
                    <Button component={Link} href="/trainings" size="small" variant="contained">
                      Jetzt Workout starten
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ) : null,
          stats:
            dashboardSettings.showStatsTotalWorkouts ||
            dashboardSettings.showStatsThisWeek ||
            dashboardSettings.showStatsTotalWeight ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
                {dashboardSettings.showStatsTotalWorkouts && (
                  <Card className="ff-reveal">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FitnessIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div">
                          Gesamt-Workouts
                        </Typography>
                      </Box>
                      <Typography variant="h4" color="primary">
                        {stats.totalWorkouts}
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {dashboardSettings.showStatsThisWeek && (
                  <Card className="ff-reveal">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <TrendingIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div">
                          Diese Woche
                        </Typography>
                      </Box>
                      <Typography variant="h4" color="success.main">
                        {stats.thisWeekWorkouts}
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                {dashboardSettings.showStatsTotalWeight && (
                  <Card className="ff-reveal">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <FitnessIcon color="warning" sx={{ mr: 1 }} />
                        <Typography variant="h6" component="div">
                          Bewegtes Gewicht
                        </Typography>
                      </Box>
                      <Typography variant="h4" color="warning.main">
                        {Math.round(stats.totalWeightKg)}
                        <Typography variant="caption" component="span" sx={{ ml: 0.5 }}>
                          kg gesamt
                        </Typography>
                      </Typography>
                    </CardContent>
                  </Card>
                )}
              </Box>
            ) : null,
          prs: dashboardSettings.showPrs ? (
            <Card className="ff-reveal" sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bestleistungen
                </Typography>
                {prs.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Noch keine PRs vorhanden.
                  </Typography>
                ) : (
                  <List>
                    {prs.map((pr) => (
                      <ListItem
                        key={pr.exerciseId}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          '&:last-child': { mb: 0 },
                        }}
                      >
                        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle1" fontWeight={600}>
                            {pr.exerciseName}
                          </Typography>
                          <Chip label={`${pr.maxWeight} kg`} color="primary" variant="outlined" />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          ) : null,
          calendar: dashboardSettings.showCalendar ? (
            <WorkoutCalendar
              sessions={calendarSessions}
              templates={templates}
              selectedDate={selectedDate}
              onSelectedDateChange={setSelectedDate}
              onDeleteSession={handleDeleteSession}
            />
          ) : null,
          recent: dashboardSettings.showRecentWorkouts ? (
            <Card className="ff-reveal">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Letzte Workouts
                </Typography>

                {recentSessions.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <FitnessIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      Noch keine Workouts
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Lege dein erstes Workout an oder starte direkt aus der Workout-Liste.
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        component={Link}
                        href="/trainings/create"
                      >
                        Erstes Workout anlegen
                      </Button>
                      <Button variant="outlined" component={Link} href="/trainings">
                        Zur Workout-Liste
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <List>
                    {recentSessions.map((session) => (
                      <ListItem
                        key={session.id}
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 2,
                          mb: 1,
                          transition: 'transform 160ms ease, border-color 160ms ease',
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            borderColor: 'primary.main',
                          },
                          '&:last-child': { mb: 0 },
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {session.templateName}
                            </Typography>
                            <Chip
                              label={format(new Date(session.date), 'dd.MM.yyyy')}
                              size="small"
                              variant="outlined"
                            />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {session.exercises.length} {session.exercises.length === 1 ? 'Uebung' : 'Uebungen'}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {session.exercises.slice(0, 3).map((exercise, index) => (
                              <Chip
                                key={index}
                                label={exercise.exerciseName}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            ))}
                            {session.exercises.length > 3 && (
                              <Chip
                                label={`+${session.exercises.length - 3} weitere`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          ) : null,
        };

        const order = dashboardSettings.dashboardWidgetOrder.length
          ? dashboardSettings.dashboardWidgetOrder
          : ['quickstart', 'weeklyGoal', 'stats', 'prs', 'calendar', 'recent'];

        return (
          <>
            {order.map((key) => (
              <Box key={key}>{widgets[key]}</Box>
            ))}
          </>
        );
      })()}
    </Box>
  );
}

