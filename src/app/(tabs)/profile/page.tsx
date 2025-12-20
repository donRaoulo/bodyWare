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
} from '@mui/material';
import {
  Person as PersonIcon,
  Settings as SettingsIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
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
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleSessionLimitChange = (event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const limit = Array.isArray(newValue) ? newValue[0] : newValue;
    setSettings(prev => ({ ...prev, dashboardSessionLimit: limit }));
  };

  const handleSessionLimitChangeCommitted = (event: Event | React.SyntheticEvent, newValue: number | number[]) => {
    const limit = Array.isArray(newValue) ? newValue[0] : newValue;
    saveSettings({ dashboardSessionLimit: limit });
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

              {/* Dashboard Session Limit */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Dashboard Session Limit
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Number of recent workouts to show on dashboard
                </Typography>
                <Box sx={{ px: 2 }}>
                  <Slider
                    value={settings.dashboardSessionLimit}
                    onChange={handleSessionLimitChange}
                    onChangeCommitted={handleSessionLimitChangeCommitted}
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
                    disabled={saving}
                  />
                </Box>
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
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <InfoIcon color="primary" sx={{ mr: 2, fontSize: 32 }} />
                <Typography variant="h6">About BodyWare</Typography>
              </Box>

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
                    <li>Dark mode support</li>
                    <li>CSV data export</li>
                    <li>Cross-platform compatibility</li>
                  </ul>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
