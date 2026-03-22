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
      if (!templatesResponse.ok) throw new Error('Workouts konnten nicht geladen werden');
      const templatesData = await templatesResponse.json();

      if (templatesData.success) {
        setTemplates(templatesData.data);
      }

      // Fetch exercises for display
      const exercisesResponse = await fetch('/api/exercises');
      if (!exercisesResponse.ok) throw new Error('Uebungen konnten nicht geladen werden');
      const exercisesData = await exercisesResponse.json();

      if (exercisesData.success) {
        setExercises(exercisesData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
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

      if (!response.ok) throw new Error('Workout konnte nicht geloescht werden');

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workout konnte nicht geloescht werden');
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
            Workouts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Waehle ein Workout und starte mit einem Tap.
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          component={Link}
          href="/trainings/create"
        >
          Neues Workout
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {templates.length === 0 ? (
        <Card className="ff-reveal-delay">
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FitnessIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Noch keine Workouts vorhanden
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Lege dein erstes Workout an, damit du direkt loslegen kannst.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              component={Link}
              href="/trainings/create"
            >
              Erstes Workout anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={2}>
          {templates.map((template) => {
            const exerciseNames = getExerciseNames(template);
            return (
              <Card
                key={template.id}
                className="ff-reveal"
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 180ms ease',
                  '&:hover': { transform: 'translateY(-2px)' },
                }}
              >
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
                    {exerciseNames.length} {exerciseNames.length === 1 ? 'Uebung' : 'Uebungen'}
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
                        label={`+${exerciseNames.length - 3} weitere`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    {template.lastUsedAt
                      ? `Zuletzt genutzt ${format(new Date(template.lastUsedAt), 'dd.MM.yyyy')}`
                      : `Erstellt ${format(new Date(template.createdAt), 'dd.MM.yyyy')}`}
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
                      Workout starten
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
          <EditIcon sx={{ mr: 1 }} />Bearbeiten</MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />Loeschen</MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Workout loeschen</DialogTitle>
        <DialogContent>
          <Typography>
            Moechtest du das Workout {selectedTemplate?.name} wirklich loeschen?
            Diese Aktion kann nicht rueckgaengig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Abbrechen</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">Loeschen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

