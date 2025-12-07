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
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  MonitorWeight as WeightIcon,
  Straighten as MeasurementIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { BodyMeasurement } from '../../../lib/types';
import { format } from 'date-fns';

export default function BodyPage() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [currentMeasurement, setCurrentMeasurement] = useState<BodyMeasurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMeasurement, setSelectedMeasurement] = useState<BodyMeasurement | null>(null);

  useEffect(() => {
    fetchMeasurements();
  }, []);

  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/measurements');
      if (!response.ok) throw new Error('Failed to fetch measurements');

      const data = await response.json();
      if (data.success) {
        setMeasurements(data.data);

        // Set current measurement (most recent)
        if (data.data.length > 0) {
          setCurrentMeasurement(data.data[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (measurement: BodyMeasurement) => {
    setSelectedMeasurement(measurement);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMeasurement) return;

    try {
      const response = await fetch(`/api/measurements/${selectedMeasurement.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete measurement');

      // Refresh data
      await fetchMeasurements();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete measurement');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedMeasurement(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedMeasurement(null);
  };

  const getMeasurementValue = (value: number | undefined) => {
    return value ? value.toFixed(1) : '--';
  };

  const getMeasurementUnit = (field: string) => {
    return field === 'weight' ? 'kg' : 'cm';
  };

  const measurementFields = [
    { key: 'weight', label: 'Weight', icon: <WeightIcon /> },
    { key: 'chest', label: 'Chest', icon: <MeasurementIcon /> },
    { key: 'waist', label: 'Waist', icon: <MeasurementIcon /> },
    { key: 'hips', label: 'Hips', icon: <MeasurementIcon /> },
    { key: 'upperArm', label: 'Upper Arm', icon: <MeasurementIcon /> },
    { key: 'forearm', label: 'Forearm', icon: <MeasurementIcon /> },
    { key: 'thigh', label: 'Thigh', icon: <MeasurementIcon /> },
    { key: 'calf', label: 'Calf', icon: <MeasurementIcon /> },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Body Measurements
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          href="/measurements/create"
        >
          Add Measurement
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Current Measurements */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <TrendingIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Current Measurements</Typography>
              </Box>

              {currentMeasurement ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Last measured: {format(new Date(currentMeasurement.date), 'MMM d, yyyy')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    {measurementFields.map((field) => {
                      const value = currentMeasurement[field.key as keyof BodyMeasurement] as number | undefined;
                      return (
                        <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(33.333% - 8px)' }, minWidth: 100 }} key={field.key}>
                          <Box sx={{ textAlign: 'center', p: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 0.5 }}>
                              {field.icon}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {field.label}
                            </Typography>
                            <Typography variant="h6">
                              {getMeasurementValue(value)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getMeasurementUnit(field.key)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <WeightIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No measurements yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Track your body measurements to monitor your fitness progress.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    href="/measurements/create"
                  >
                    Add First Measurement
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Measurement History */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Measurement History
              </Typography>

              {measurements.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No measurement history yet
                  </Typography>
                </Box>
              ) : (
                <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {measurements.map((measurement) => (
                    <ListItem
                      key={measurement.id}
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        '&:last-child': { mb: 0 },
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">
                          {format(new Date(measurement.date), 'MMM d, yyyy')}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(measurement)}
                          sx={{ color: 'error.main' }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {measurement.weight && (
                          <Chip
                            label={`Weight: ${measurement.weight.toFixed(1)}kg`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {measurement.chest && (
                          <Chip
                            label={`Chest: ${measurement.chest.toFixed(1)}cm`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {measurement.waist && (
                          <Chip
                            label={`Waist: ${measurement.waist.toFixed(1)}cm`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                        {measurement.hips && (
                          <Chip
                            label={`Hips: ${measurement.hips.toFixed(1)}cm`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Measurement</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the measurement from{' '}
            {selectedMeasurement && format(new Date(selectedMeasurement.date), 'MMM d, yyyy')}?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}