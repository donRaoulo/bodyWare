'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Slider,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tabs,
  Tab,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  Person as PersonIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { Exercise, ExerciseType, UserSettings, WorkoutTemplate } from '../../../lib/types';
import { useTheme } from '../../../components/ThemeProvider';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';

export default function ProfilePage() {
  const { mode, toggleColorMode, primaryColor, setPrimaryColor } = useTheme();
  const { data: session } = useSession();
  const colorPresets = ['#58a6ff', '#1f6feb', '#3fb950', '#ff9500', '#f85149', '#bc8cff', '#7C3AED', '#00bcd4', '#ff4081'];
  const [settings, setSettings] = useState<UserSettings>({
    id: '',
    userId: '',
    dashboardSessionLimit: 5,
    darkMode: false,
    primaryColor: primaryColor,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dashboardDialogOpen, setDashboardDialogOpen] = useState(false);
  const [workoutSettingsDialogOpen, setWorkoutSettingsDialogOpen] = useState(false);
  const [workoutSettingsTab, setWorkoutSettingsTab] = useState(0);
  const [dashboardDraft, setDashboardDraft] = useState({
    showRecentWorkouts: true,
    showCalendar: true,
    showStatsTotalWorkouts: true,
    showStatsThisWeek: true,
    showStatsTotalWeight: true,
    showPrs: true,
    showQuickstart: true,
    showWeeklyGoal: true,
    dashboardSessionLimit: 5,
    dashboardWidgetOrder: ['quickstart', 'weeklyGoal', 'stats', 'prs', 'calendar', 'recent'],
  });
  const [aboutOpen, setAboutOpen] = useState(false);
  const [managedTemplates, setManagedTemplates] = useState<WorkoutTemplate[]>([]);
  const [managedExercises, setManagedExercises] = useState<Exercise[]>([]);
  const [workoutSettingsLoading, setWorkoutSettingsLoading] = useState(false);
  const [workoutSettingsError, setWorkoutSettingsError] = useState<string | null>(null);
  const [savingWorkoutId, setSavingWorkoutId] = useState<string | null>(null);
  const [savingExerciseId, setSavingExerciseId] = useState<string | null>(null);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [workoutDrafts, setWorkoutDrafts] = useState<Record<string, {
    name: string;
    exerciseIds: string[];
    trackInRecentWorkouts: boolean;
    trackInWeeklyGoal: boolean;
  }>>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, {
    name: string;
    type: ExerciseType;
    goal: string;
    goalDueDate: string;
    showInPersonalRecords: boolean;
  }>>({});

  const buildWorkoutDraft = (template: WorkoutTemplate) => ({
    name: template.name,
    exerciseIds: template.exerciseIds,
    trackInRecentWorkouts: template.trackInRecentWorkouts ?? true,
    trackInWeeklyGoal: template.trackInWeeklyGoal ?? true,
  });

  const buildExerciseDraft = (exercise: Exercise) => ({
    name: exercise.name,
    type: exercise.type,
    goal: exercise.goal != null ? String(exercise.goal) : '',
    goalDueDate: exercise.goalDueDate ?? '',
    showInPersonalRecords: exercise.showInPersonalRecords ?? true,
  });

  const dashboardWidgets = [
    { id: 'quickstart', label: 'Schnellstart' },
    { id: 'weeklyGoal', label: 'Wochenziel' },
    { id: 'stats', label: 'Statistiken' },
    { id: 'prs', label: 'PRs / Bestleistungen' },
    { id: 'calendar', label: 'Kalender' },
    { id: 'recent', label: 'Letzte Workouts' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      if (data.success && data.data) {
        setSettings(data.data);
        if (data.data.primaryColor) {
          setPrimaryColor(data.data.primaryColor);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      const data = await response.json();
      if (data.success && data.data) {
        setSettings(data.data);
        if (data.data.primaryColor) {
          setPrimaryColor(data.data.primaryColor);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeToggle = (nextDark: boolean) => {
    // Only toggle theme if the desired state differs from current mode
    const currentlyDark = mode === 'dark';
    if (nextDark !== currentlyDark) {
      toggleColorMode();
    }
    saveSettings({ darkMode: nextDark });
  };

  const openDashboardSettings = () => {
    setDashboardDraft({
      showRecentWorkouts: settings.showRecentWorkouts,
      showCalendar: settings.showCalendar,
      showStatsTotalWorkouts: settings.showStatsTotalWorkouts,
      showStatsThisWeek: settings.showStatsThisWeek,
      showStatsTotalWeight: settings.showStatsTotalWeight,
      showPrs: settings.showPrs,
      showQuickstart: settings.showQuickstart,
      showWeeklyGoal: settings.showWeeklyGoal,
      dashboardSessionLimit: settings.dashboardSessionLimit,
      dashboardWidgetOrder: settings.dashboardWidgetOrder?.length
        ? settings.dashboardWidgetOrder
        : ['quickstart', 'weeklyGoal', 'stats', 'prs', 'calendar', 'recent'],
    });
    setDashboardDialogOpen(true);
  };

  const openWorkoutSettings = async () => {
    try {
      setWorkoutSettingsLoading(true);
      setWorkoutSettingsError(null);
      setWorkoutSettingsDialogOpen(true);
      setWorkoutSettingsTab(0);
      setEditingWorkoutId(null);
      setEditingExerciseId(null);

      const [templatesResponse, exercisesResponse] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/exercises'),
      ]);

      const templatesData = await templatesResponse.json();
      if (!templatesResponse.ok || !templatesData.success) {
        throw new Error(templatesData?.error || 'Workouts konnten nicht geladen werden');
      }

      const exercisesData = await exercisesResponse.json();
      if (!exercisesResponse.ok || !exercisesData.success) {
        throw new Error(exercisesData?.error || 'Uebungen konnten nicht geladen werden');
      }

      const nextTemplates = templatesData.data as WorkoutTemplate[];
      const nextExercises = exercisesData.data as Exercise[];

      setManagedTemplates(nextTemplates);
      setManagedExercises(nextExercises);
      setWorkoutDrafts(
        Object.fromEntries(
          nextTemplates.map((template) => [
            template.id,
            buildWorkoutDraft(template),
          ])
        )
      );
      setExerciseDrafts(
        Object.fromEntries(
          nextExercises
            .filter((exercise) => !exercise.isDefault)
            .map((exercise) => [
              exercise.id,
              buildExerciseDraft(exercise),
            ])
        )
      );
    } catch (err) {
      setWorkoutSettingsError(err instanceof Error ? err.message : 'Einstellungen konnten nicht geladen werden');
    } finally {
      setWorkoutSettingsLoading(false);
    }
  };

  const handleWorkoutDraftChange = (
    templateId: string,
    patch: Partial<{
      name: string;
      exerciseIds: string[];
      trackInRecentWorkouts: boolean;
      trackInWeeklyGoal: boolean;
    }>
  ) => {
    setWorkoutDrafts((prev) => ({
      ...prev,
      [templateId]: {
        ...prev[templateId],
        ...patch,
      },
    }));
  };

  const handleExerciseDraftChange = (
    exerciseId: string,
    patch: Partial<{
      name: string;
      type: ExerciseType;
      goal: string;
      goalDueDate: string;
      showInPersonalRecords: boolean;
    }>
  ) => {
    setExerciseDrafts((prev) => ({
      ...prev,
      [exerciseId]: {
        ...prev[exerciseId],
        ...patch,
      },
    }));
  };

  const handleWorkoutSave = async (templateId: string) => {
    const draft = workoutDrafts[templateId];
    if (!draft) return;

    try {
      setSavingWorkoutId(templateId);
      setWorkoutSettingsError(null);

      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          exerciseIds: draft.exerciseIds,
          trackInRecentWorkouts: draft.trackInRecentWorkouts,
          trackInWeeklyGoal: draft.trackInWeeklyGoal,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Workout konnte nicht aktualisiert werden');
      }

      const updated = data.data as WorkoutTemplate;
      setManagedTemplates((prev) => prev.map((template) => (template.id === templateId ? updated : template)));
      setWorkoutDrafts((prev) => ({
        ...prev,
        [templateId]: buildWorkoutDraft(updated),
      }));
      setEditingWorkoutId(null);
    } catch (err) {
      setWorkoutSettingsError(err instanceof Error ? err.message : 'Workout konnte nicht aktualisiert werden');
    } finally {
      setSavingWorkoutId(null);
    }
  };

  const handleExerciseSave = async (exerciseId: string) => {
    const draft = exerciseDrafts[exerciseId];
    if (!draft) return;

    try {
      setSavingExerciseId(exerciseId);
      setWorkoutSettingsError(null);

      const response = await fetch(`/api/exercises/${exerciseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          type: draft.type,
          goal: draft.type === 'counter' ? Number(draft.goal) : null,
          goalDueDate: draft.type === 'counter' ? draft.goalDueDate : null,
          showInPersonalRecords: draft.showInPersonalRecords,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Uebung konnte nicht aktualisiert werden');
      }

      const updated = data.data as Exercise;
      setManagedExercises((prev) => prev.map((exercise) => (exercise.id === exerciseId ? updated : exercise)));
      setExerciseDrafts((prev) => ({
        ...prev,
        [exerciseId]: buildExerciseDraft(updated),
      }));
      setEditingExerciseId(null);
    } catch (err) {
      setWorkoutSettingsError(err instanceof Error ? err.message : 'Uebung konnte nicht aktualisiert werden');
    } finally {
      setSavingExerciseId(null);
    }
  };

  const handleDashboardLimitChange = (event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const limit = Array.isArray(newValue) ? newValue[0] : newValue;
    setDashboardDraft((prev) => ({ ...prev, dashboardSessionLimit: limit }));
  };

  const handleDashboardSave = async () => {
    await saveSettings({
      dashboardSessionLimit: dashboardDraft.dashboardSessionLimit,
      showRecentWorkouts: dashboardDraft.showRecentWorkouts,
      showCalendar: dashboardDraft.showCalendar,
      showStatsTotalWorkouts: dashboardDraft.showStatsTotalWorkouts,
      showStatsThisWeek: dashboardDraft.showStatsThisWeek,
      showStatsTotalWeight: dashboardDraft.showStatsTotalWeight,
      showPrs: dashboardDraft.showPrs,
      showQuickstart: dashboardDraft.showQuickstart,
      showWeeklyGoal: dashboardDraft.showWeeklyGoal,
      dashboardWidgetOrder: dashboardDraft.dashboardWidgetOrder,
    });
    setDashboardDialogOpen(false);
  };

  const handleExportWorkouts = async () => {
    try {
      const response = await fetch('/api/export/workouts');
      if (!response.ok) throw new Error('Failed to export workouts');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bodyware-workouts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export workouts');
    }
  };

  const handleExportMeasurements = async () => {
    try {
      const response = await fetch('/api/export/measurements');
      if (!response.ok) throw new Error('Failed to export measurements');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bodyware-measurements-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export measurements');
    }
  };

  const customExercises = managedExercises.filter((exercise) => !exercise.isDefault);
  const getExerciseName = (exerciseId: string) =>
    managedExercises.find((exercise) => exercise.id === exerciseId)?.name || 'Unbekannte Uebung';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile & Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
        {/* Profile Info */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PersonIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
                <Typography variant="h6">Profile</Typography>
              </Box>

              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <PersonIcon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography variant="h6">
                  {session?.user?.name || 'Fitness Enthusiast'}
                </Typography>
                {session?.user?.email && (
                  <Typography variant="body2" color="text.secondary">
                    {session.user.email}
                  </Typography>
                )}
                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    Logout
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                Track your workouts, monitor your progress, and achieve your fitness goals with BodyWare.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Settings */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SettingsIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
                <Typography variant="h6">Settings</Typography>
              </Box>

              {/* Dark Mode Toggle */}
              <Box sx={{ mb: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={mode === 'dark'}
                      onChange={(e) => handleThemeToggle(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Dark Mode"
                />
                <Typography variant="body2" color="text.secondary">
                  Toggle between light and dark theme
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Dashboard Settings */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Dashboard Einstellungen
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Steuere, welche Bereiche im Dashboard angezeigt werden
                </Typography>
                <Button variant="outlined" onClick={openDashboardSettings}>
                  Einstellungen bearbeiten
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Workout Einstellungen
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Verwalte deine Workouts und selbst erstellten Uebungen an einem Ort
                </Typography>
                <Button variant="outlined" onClick={openWorkoutSettings}>
                  Workout Einstellungen oeffnen
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Theme Color */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Primary Color
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Passe das Farbschema der App an
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                  >
                    Farbe wählen
                    <input
                      hidden
                      type="color"
                      value={settings.primaryColor || primaryColor}
                      onChange={(e) => {
                        const color = e.target.value;
                        setSettings((prev) => ({ ...prev, primaryColor: color }));
                        setPrimaryColor(color);
                        saveSettings({ primaryColor: color });
                      }}
                    />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {settings.primaryColor || primaryColor}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mt: 1 }}>
                  {colorPresets.map((c) => (
                    <Chip
                      key={c}
                      label={c}
                      onClick={() => {
                        setSettings((prev) => ({ ...prev, primaryColor: c }));
                        setPrimaryColor(c);
                        saveSettings({ primaryColor: c });
                      }}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: c,
                        color: '#fff',
                        border: settings.primaryColor === c || primaryColor === c ? '2px solid #00000040' : '1px solid #00000020',
                      }}
                    />
                  ))}
                </Stack>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Export Options */}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  Export Data
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Download your data as CSV files
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportWorkouts}
                    disabled={saving}
                  >
                    Export Workouts
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportMeasurements}
                    disabled={saving}
                  >
                    Export Measurements
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* About Section */}
        <Box sx={{ flex: "1 1 100%" }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InfoIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
                  <Typography variant="h6">About BodyWare</Typography>
                </Box>
                <Button variant="outlined" onClick={() => setAboutOpen((prev) => !prev)}>
                  {aboutOpen ? 'Ausblenden' : 'Anzeigen'}
                </Button>
              </Box>

              {aboutOpen && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" paragraph>
                        BodyWare is your personal fitness companion, designed to help you track workouts,
                        monitor body measurements, and achieve your health goals.
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Version: 1.0.0<br />
                        Build: Cross-platform fitness tracker
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Features:</strong>
                      </Typography>
                      <ul>
                        <li>Custom workout templates</li>
                        <li>Exercise library with multiple types</li>
                        <li>Body measurement tracking</li>
                        <li>Workout calendar with editing</li>
                        <li>Goal exercises with progress</li>
                        <li>PRs / Bestleistungen</li>
                        <li>Dashboard customization</li>
                        <li>Dark mode support</li>
                        <li>CSV data export</li>
                        <li>Cross-platform compatibility</li>
                      </ul>
                    </Box>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Dialog
        open={workoutSettingsDialogOpen}
        onClose={() => setWorkoutSettingsDialogOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Workout Einstellungen</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Tabs
            value={workoutSettingsTab}
            onChange={(_, nextValue) => setWorkoutSettingsTab(nextValue)}
            sx={{ mb: 2 }}
          >
            <Tab label="Workouts" />
            <Tab label="Uebungen" />
          </Tabs>

          {workoutSettingsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {workoutSettingsError}
            </Alert>
          )}

          {workoutSettingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {workoutSettingsTab === 0 && (
                <Stack spacing={2}>
                  {managedTemplates.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Du hast noch keine Workouts erstellt.
                    </Typography>
                  ) : (
                    managedTemplates.map((template) => {
                      const draft = workoutDrafts[template.id];
                      const isEditing = editingWorkoutId === template.id;
                      return (
                        <Card key={template.id} variant="outlined">
                          <CardContent>
                            <Box
                              sx={{
                                mb: isEditing ? 2 : 0,
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 2,
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {template.name}
                                </Typography>
                                {isEditing ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Bearbeite Workout und Tracking fuer Dashboard und Wochenziel.
                                  </Typography>
                                ) : (
                                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                    <Chip
                                      size="small"
                                      label={`${template.exerciseIds.length} ${template.exerciseIds.length === 1 ? 'Uebung' : 'Uebungen'}`}
                                    />
                                    <Chip
                                      size="small"
                                      color={(template.trackInRecentWorkouts ?? true) ? 'primary' : 'default'}
                                      variant={(template.trackInRecentWorkouts ?? true) ? 'filled' : 'outlined'}
                                      label="Letzte Workouts"
                                    />
                                    <Chip
                                      size="small"
                                      color={(template.trackInWeeklyGoal ?? true) ? 'primary' : 'default'}
                                      variant={(template.trackInWeeklyGoal ?? true) ? 'filled' : 'outlined'}
                                      label="Wochenziel"
                                    />
                                  </Stack>
                                )}
                              </Box>
                              {!isEditing && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setEditingWorkoutId(template.id)}
                                >
                                  Bearbeiten
                                </Button>
                              )}
                            </Box>

                            {draft && isEditing && (
                              <Stack spacing={2}>
                                <TextField
                                  label="Workout Name"
                                  value={draft.name}
                                  onChange={(e) => handleWorkoutDraftChange(template.id, { name: e.target.value })}
                                  fullWidth
                                />
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    Uebungen im Workout
                                  </Typography>
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {managedExercises.map((exercise) => {
                                      const selected = draft.exerciseIds.includes(exercise.id);
                                      return (
                                        <Chip
                                          key={exercise.id}
                                          label={exercise.name}
                                          color={selected ? 'primary' : 'default'}
                                          variant={selected ? 'filled' : 'outlined'}
                                          onClick={() =>
                                            handleWorkoutDraftChange(template.id, {
                                              exerciseIds: selected
                                                ? draft.exerciseIds.filter((id) => id !== exercise.id)
                                                : [...draft.exerciseIds, exercise.id],
                                            })
                                          }
                                          sx={{ cursor: 'pointer' }}
                                        />
                                      );
                                    })}
                                  </Box>
                                </Box>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={draft.trackInRecentWorkouts}
                                      onChange={(e) =>
                                        handleWorkoutDraftChange(template.id, {
                                          trackInRecentWorkouts: e.target.checked,
                                        })
                                      }
                                    />
                                  }
                                  label="In Letzte Workouts auf dem Dashboard anzeigen"
                                />
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={draft.trackInWeeklyGoal}
                                      onChange={(e) =>
                                        handleWorkoutDraftChange(template.id, {
                                          trackInWeeklyGoal: e.target.checked,
                                        })
                                      }
                                    />
                                  }
                                  label="Fuer das Wochenziel mitzaehlen"
                                />
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                  <Button
                                    variant="text"
                                    onClick={() => {
                                      setWorkoutDrafts((prev) => ({
                                        ...prev,
                                        [template.id]: buildWorkoutDraft(template),
                                      }));
                                      setEditingWorkoutId(null);
                                    }}
                                    disabled={savingWorkoutId === template.id}
                                  >
                                    Abbrechen
                                  </Button>
                                  <Button
                                    variant="contained"
                                    onClick={() => handleWorkoutSave(template.id)}
                                    disabled={savingWorkoutId === template.id || draft.exerciseIds.length === 0}
                                  >
                                    {savingWorkoutId === template.id ? 'Speichert...' : 'Speichern'}
                                  </Button>
                                </Box>
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </Stack>
              )}

              {workoutSettingsTab === 1 && (
                <Stack spacing={2}>
                  {customExercises.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Du hast noch keine eigenen Uebungen erstellt.
                    </Typography>
                  ) : (
                    customExercises.map((exercise) => {
                      const draft = exerciseDrafts[exercise.id];
                      const isEditing = editingExerciseId === exercise.id;
                      return (
                        <Card key={exercise.id} variant="outlined">
                          <CardContent>
                            <Box
                              sx={{
                                mb: isEditing ? 2 : 0,
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 2,
                              }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {exercise.name}
                                </Typography>
                                {isEditing ? (
                                  <Typography variant="body2" color="text.secondary">
                                    Passe Name, Typ und optionale Zielwerte an.
                                  </Typography>
                                ) : (
                                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                    <Chip size="small" label={`Typ: ${exercise.type}`} />
                                    <Chip
                                      size="small"
                                      color={(exercise.showInPersonalRecords ?? true) ? 'primary' : 'default'}
                                      variant={(exercise.showInPersonalRecords ?? true) ? 'filled' : 'outlined'}
                                      label={(exercise.showInPersonalRecords ?? true) ? 'Bestleistung an' : 'Bestleistung aus'}
                                    />
                                    {exercise.type === 'counter' && exercise.goal != null && (
                                      <Chip size="small" variant="outlined" label={`Ziel: ${exercise.goal}`} />
                                    )}
                                  </Stack>
                                )}
                              </Box>
                              {!isEditing && (
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setEditingExerciseId(exercise.id)}
                                >
                                  Bearbeiten
                                </Button>
                              )}
                            </Box>

                            {draft && isEditing && (
                              <Stack spacing={2}>
                                <TextField
                                  label="Uebungsname"
                                  value={draft.name}
                                  onChange={(e) => handleExerciseDraftChange(exercise.id, { name: e.target.value })}
                                  fullWidth
                                />
                                <TextField
                                  select
                                  label="Typ"
                                  value={draft.type}
                                  onChange={(e) =>
                                    handleExerciseDraftChange(exercise.id, {
                                      type: e.target.value as ExerciseType,
                                      goal: e.target.value === 'counter' ? draft.goal : '',
                                      goalDueDate: e.target.value === 'counter' ? draft.goalDueDate : '',
                                    })
                                  }
                                  fullWidth
                                >
                                  <MenuItem value="strength">Krafttraining</MenuItem>
                                  <MenuItem value="cardio">Cardio</MenuItem>
                                  <MenuItem value="endurance">Ausdauer</MenuItem>
                                  <MenuItem value="stretch">Stretch</MenuItem>
                                  <MenuItem value="counter">Ziel</MenuItem>
                                </TextField>
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={draft.showInPersonalRecords}
                                      onChange={(e) =>
                                        handleExerciseDraftChange(exercise.id, {
                                          showInPersonalRecords: e.target.checked,
                                        })
                                      }
                                    />
                                  }
                                  label="In Bestleistungen anzeigen"
                                />
                                {draft.type === 'counter' && (
                                  <>
                                    <TextField
                                      label="Ziel"
                                      type="number"
                                      value={draft.goal}
                                      onChange={(e) => handleExerciseDraftChange(exercise.id, { goal: e.target.value })}
                                      fullWidth
                                    />
                                    <TextField
                                      label="Bis Datum"
                                      type="date"
                                      value={draft.goalDueDate}
                                      onChange={(e) => handleExerciseDraftChange(exercise.id, { goalDueDate: e.target.value })}
                                      InputLabelProps={{ shrink: true }}
                                      fullWidth
                                    />
                                  </>
                                )}
                                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                  <Button
                                    variant="text"
                                    onClick={() => {
                                      setExerciseDrafts((prev) => ({
                                        ...prev,
                                        [exercise.id]: buildExerciseDraft(exercise),
                                      }));
                                      setEditingExerciseId(null);
                                    }}
                                    disabled={savingExerciseId === exercise.id}
                                  >
                                    Abbrechen
                                  </Button>
                                  <Button
                                    variant="contained"
                                    onClick={() => handleExerciseSave(exercise.id)}
                                    disabled={savingExerciseId === exercise.id}
                                  >
                                    {savingExerciseId === exercise.id ? 'Speichert...' : 'Speichern'}
                                  </Button>
                                </Box>
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </Stack>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkoutSettingsDialogOpen(false)}>Schliessen</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dashboardDialogOpen} onClose={() => setDashboardDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Dashboard Einstellungen</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={dashboardDraft.showRecentWorkouts}
                  onChange={(e) =>
                    setDashboardDraft((prev) => ({ ...prev, showRecentWorkouts: e.target.checked }))
                  }
                />
              }
              label="Letzte Workouts anzeigen"
            />

            <Box sx={{ px: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Anzahl der letzten Workouts
              </Typography>
              <Slider
                value={dashboardDraft.dashboardSessionLimit}
                onChange={handleDashboardLimitChange}
                min={1}
                max={20}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 5, label: '5' },
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                ]}
                valueLabelDisplay="auto"
                disabled={!dashboardDraft.showRecentWorkouts || saving}
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={dashboardDraft.showCalendar}
                  onChange={(e) =>
                    setDashboardDraft((prev) => ({ ...prev, showCalendar: e.target.checked }))
                  }
                />
              }
              label="Kalender anzeigen"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={dashboardDraft.showQuickstart}
                  onChange={(e) =>
                    setDashboardDraft((prev) => ({ ...prev, showQuickstart: e.target.checked }))
                  }
                />
              }
              label="Schnellstart anzeigen"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={dashboardDraft.showWeeklyGoal}
                  onChange={(e) =>
                    setDashboardDraft((prev) => ({ ...prev, showWeeklyGoal: e.target.checked }))
                  }
                />
              }
              label="Wochenziel anzeigen"
            />

            <Typography variant="subtitle2">Statistiken</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={dashboardDraft.showStatsTotalWorkouts}
                  onChange={(e) =>
                    setDashboardDraft((prev) => ({ ...prev, showStatsTotalWorkouts: e.target.checked }))
                  }
                />
              }
              label="Total Workouts"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={dashboardDraft.showStatsThisWeek}
                  onChange={(e) =>
                    setDashboardDraft((prev) => ({ ...prev, showStatsThisWeek: e.target.checked }))
                  }
                />
              }
              label="This Week"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={dashboardDraft.showStatsTotalWeight}
                  onChange={(e) =>
                    setDashboardDraft((prev) => ({ ...prev, showStatsTotalWeight: e.target.checked }))
                  }
                />
              }
              label="Total Weight"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={dashboardDraft.showPrs}
                  onChange={(e) =>
                    setDashboardDraft((prev) => ({ ...prev, showPrs: e.target.checked }))
                  }
                />
              }
              label="PRs / Bestleistungen"
            />

            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2">Reihenfolge der Widgets</Typography>
            <Stack spacing={1}>
              {dashboardDraft.dashboardWidgetOrder.map((widgetId, index) => {
                const label = dashboardWidgets.find((item) => item.id === widgetId)?.label || widgetId;
                return (
                  <Box key={widgetId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="body2">{label}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setDashboardDraft((prev) => {
                            if (index === 0) return prev;
                            const next = [...prev.dashboardWidgetOrder];
                            [next[index - 1], next[index]] = [next[index], next[index - 1]];
                            return { ...prev, dashboardWidgetOrder: next };
                          })
                        }
                        disabled={index === 0}
                        aria-label="Nach oben"
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setDashboardDraft((prev) => {
                            if (index === prev.dashboardWidgetOrder.length - 1) return prev;
                            const next = [...prev.dashboardWidgetOrder];
                            [next[index + 1], next[index]] = [next[index], next[index + 1]];
                            return { ...prev, dashboardWidgetOrder: next };
                          })
                        }
                        disabled={index === dashboardDraft.dashboardWidgetOrder.length - 1}
                        aria-label="Nach unten"
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDashboardDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleDashboardSave} disabled={saving}>
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
