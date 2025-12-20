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
  CircularProgress,
  Alert,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  FitnessCenter as FitnessIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { WorkoutSession } from '../../../lib/types';
import Link from 'next/link';

interface DashboardStats {
  totalWorkouts: number;
  thisWeekWorkouts: number;
  totalWeightKg: number;
}

export default function DashboardPage() {
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    totalWeightKg: 0,
  });
  const [sessionLimit, setSessionLimit] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setSessionLimit(limitFromSettings);

      const [sessionsResponse, statsResponse] = await Promise.all([
        fetch(`/api/sessions?limit=${limitFromSettings}`),
        fetch('/api/sessions/stats'),
      ]);

      const sessionsData = await sessionsResponse.json();
      if (sessionsResponse.ok && sessionsData.success) {
        setRecentSessions(sessionsData.data);
      }

      const statsData = await statsResponse.json();
      if (statsResponse.ok && statsData.success) {
        setStats(statsData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <FitnessIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Total Workouts
              </Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {stats.totalWorkouts}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                This Week
              </Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              {stats.thisWeekWorkouts}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <FitnessIcon color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6" component="div">
                Total Weight
              </Typography>
            </Box>
            <Typography variant="h4" color="warning.main">
              {Math.round(stats.totalWeightKg)}
              <Typography variant="caption" component="span" sx={{ ml: 0.5 }}>
                kg (sum)
              </Typography>
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Recent Workouts */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Workouts
          </Typography>

          {recentSessions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <FitnessIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No workouts yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start your fitness journey by creating your first workout template.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                component={Link}
                href="/trainings/create"
              >
                Create First Workout
              </Button>
            </Box>
          ) : (
            <List>
              {recentSessions.map((session) => (
                <ListItem
                  key={session.id}
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    '&:last-child': { mb: 0 },
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>
                        {session.templateName}
                      </Typography>
                      <Chip
                        label={format(new Date(session.date), 'MMM d, yyyy')}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {session.exercises.length} {session.exercises.length === 1 ? 'exercise' : 'exercises'}
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
                          label={`+${session.exercises.length - 3} more`}
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
    </Box>
  );
}
