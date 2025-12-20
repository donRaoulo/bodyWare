'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { Exercise, ExerciseType } from '../../../lib/types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';

export default function CreateTrainingTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | ExerciseType>('all');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseType, setNewExerciseType] = useState<ExerciseType>('strength');
  const [newExerciseError, setNewExerciseError] = useState<string | null>(null);
  const [creatingExercise, setCreatingExercise] = useState(false);

  useEffect(() => {
    const loadExercises = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/exercises');
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error || 'Failed to load exercises');
        }
        setExercises(data.data);
        // ensure new template starts with no selection
        setSelectedIds([]);
        setName('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load exercises');
      } finally {
        setLoading(false);
      }
    };
    loadExercises();
  }, []);

  const toggleExercise = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedIds.length === 0) {
      setError('Name und mindestens eine Übung sind erforderlich');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), exerciseIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Template konnte nicht erstellt werden');
      }
      router.push('/trainings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Template konnte nicht erstellt werden');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      setNewExerciseError('Name ist erforderlich');
      return;
    }
    setCreatingExercise(true);
    setNewExerciseError(null);
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newExerciseName.trim(), type: newExerciseType }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Übung konnte nicht erstellt werden');
      }
      const created: Exercise = data.data;
      setExercises((prev) => [...prev, created]);
      setSelectedIds((prev) => [...prev, created.id]);
      setExerciseDialogOpen(false);
      setNewExerciseName('');
      setNewExerciseType('strength');
    } catch (err) {
      setNewExerciseError(err instanceof Error ? err.message : 'Übung konnte nicht erstellt werden');
    } finally {
      setCreatingExercise(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pt: { xs: 2, md: 6 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Neues Workout-Template
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Divider />

              <Typography variant="subtitle1">Übungen auswählen</Typography>
              {loading ? (
                <Typography variant="body2" color="text.secondary">
                  Lade Übungen...
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Ausgewählte Übungen
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {selectedIds.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Noch keine Übungen ausgewählt.
                      </Typography>
                    )}
                    {selectedIds.map((id) => {
                      const ex = exercises.find((e) => e.id === id);
                      if (!ex) return null;
                      return (
                        <Chip
                          key={id}
                          label={ex.name}
                          color="primary"
                          variant="filled"
                          onDelete={() => toggleExercise(id)}
                          sx={{ cursor: 'pointer' }}
                        />
                      );
                    })}
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => setLibraryOpen(true)}>
                      Übungskatalog
                    </Button>
                    <Button variant="outlined" onClick={() => setExerciseDialogOpen(true)}>
                      Neue Übung erstellen
                    </Button>
                  </Stack>
                </>
              )}

              <Stack direction="row" spacing={2} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => router.push('/trainings')}>
                  Abbrechen
                </Button>
                <Button type="submit" variant="contained" disabled={saving}>
                  {saving ? 'Speichern...' : 'Speichern'}
                </Button>
              </Stack>
            </Stack>
          </form>
        </CardContent>
      </Card>

      <Dialog open={exerciseDialogOpen} onClose={() => setExerciseDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Neue Übung erstellen</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          {newExerciseError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {newExerciseError}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              label="Name"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              select
              label="Typ"
              value={newExerciseType}
              onChange={(e) => setNewExerciseType(e.target.value as ExerciseType)}
              fullWidth
            >
              <MenuItem value="strength">Krafttraining</MenuItem>
              <MenuItem value="cardio">Cardio</MenuItem>
              <MenuItem value="endurance">Ausdauer</MenuItem>
              <MenuItem value="stretch">Stretch</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExerciseDialogOpen(false)} disabled={creatingExercise}>
            Abbrechen
          </Button>
          <Button onClick={handleCreateExercise} variant="contained" disabled={creatingExercise}>
            {creatingExercise ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={libraryOpen} onClose={() => setLibraryOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Übungskatalog</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Stack spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Suche"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Typ filtern"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              fullWidth
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="strength">Krafttraining</MenuItem>
              <MenuItem value="cardio">Cardio</MenuItem>
              <MenuItem value="endurance">Ausdauer</MenuItem>
              <MenuItem value="stretch">Stretch</MenuItem>
            </TextField>
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {exercises
              .filter((ex) => {
                const matchesType = filterType === 'all' || ex.type === filterType;
                const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase());
                return matchesType && matchesSearch;
              })
              .map((ex) => {
                const selected = selectedIds.includes(ex.id);
                return (
                  <Chip
                    key={ex.id}
                    label={`${ex.name} (${ex.type})${ex.isDefault ? ' • Default' : ''}`}
                    color={selected ? 'primary' : 'default'}
                    variant={selected ? 'filled' : 'outlined'}
                    onClick={() => toggleExercise(ex.id)}
                    sx={{ cursor: 'pointer' }}
                  />
                );
              })}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLibraryOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
