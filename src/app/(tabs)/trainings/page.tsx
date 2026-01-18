'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  FitnessCenter as FitnessIcon,
} from '@mui/icons-material';
import { WorkoutTemplate, Exercise } from '../../../lib/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { Stack } from '@mui/material';

export default function TrainingsPage() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch templates
      const templatesResponse = await fetch('/api/templates');
      if (!templatesResponse.ok) throw new Error('Failed to fetch templates');
      const templatesData = await templatesResponse.json();

      if (templatesData.success) {
        setTemplates(templatesData.data);
      }

      // Fetch exercises for display
      const exercisesResponse = await fetch('/api/exercises');
      if (!exercisesResponse.ok) throw new Error('Failed to fetch exercises');
      const exercisesData = await exercisesResponse.json();

      if (exercisesData.success) {
        setExercises(exercisesData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: WorkoutTemplate) => {
    setMenuAnchor(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedTemplate(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    // Close menu but keep selection for the dialog
    setMenuAnchor(null);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTemplate) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    } finally {
      setDeleteDialogOpen(false);
      setSelectedTemplate(null);
      setLoading(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSelectedTemplate(null);
  };

  const getExerciseNames = (template: WorkoutTemplate) => {
    return template.exerciseIds
      .map(id => exercises.find(ex => ex.id === id)?.name)
      .filter(Boolean) as string[];
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          Workouts
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          component={Link}
          href="/trainings/create"
        >
          New
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {templates.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FitnessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              No workout templates yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Create your first workout template to get started with your fitness journey.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              component={Link}
              href="/trainings/create"
            >
              Create First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {templates.map((template) => {
            const exerciseNames = getExerciseNames(template);
            return (
              <Card key={template.id} sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                      {template.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, template)}
                    >
                      <MoreIcon />
                    </IconButton>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {exerciseNames.length} {exerciseNames.length === 1 ? 'exercise' : 'exercises'}
                  </Typography>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 3 }}>
                    {exerciseNames.slice(0, 3).map((name, index) => (
                      <Chip
                        key={index}
                        label={name}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                    {exerciseNames.length > 3 && (
                      <Chip
                        label={`+${exerciseNames.length - 3} more`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {template.lastUsedAt
                      ? `Zuletzt genutzt ${format(new Date(template.lastUsedAt), 'MMM d, yyyy')}`
                      : `Erstellt ${format(new Date(template.createdAt), 'MMM d, yyyy')}`}
                  </Typography>
                </CardContent>

                <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    startIcon={<StartIcon />}
                    component={Link}
                    href={`/start-workout?templateId=${template.id}`}
                    sx={{ flex: 1 }}
                  >
                    Start
                  </Button>
                </Box>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem component={Link} href={`/trainings/edit/${selectedTemplate?.id}`}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Workout Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the workout template "{selectedTemplate?.name}"?
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
