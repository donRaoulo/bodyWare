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
} from '@mui/material';
import {
  Person as PersonIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
} from '@mui/icons-material';
import { UserSettings } from '../../../lib/types';
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
    dashboardWidgetOrder: ['stats', 'prs', 'calendar', 'recent'],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dashboardDialogOpen, setDashboardDialogOpen] = useState(false);
  const [dashboardDraft, setDashboardDraft] = useState({
    showRecentWorkouts: true,
    showCalendar: true,
    showStatsTotalWorkouts: true,
    showStatsThisWeek: true,
    showStatsTotalWeight: true,
    showPrs: true,
    dashboardSessionLimit: 5,
    dashboardWidgetOrder: ['stats', 'prs', 'calendar', 'recent'],
  });
  const [aboutOpen, setAboutOpen] = useState(false);

  const dashboardWidgets = [
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
      dashboardSessionLimit: settings.dashboardSessionLimit,
      dashboardWidgetOrder: settings.dashboardWidgetOrder?.length
        ? settings.dashboardWidgetOrder
        : ['stats', 'prs', 'calendar', 'recent'],
    });
    setDashboardDialogOpen(true);
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
