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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
} from '@mui/material';
import { useRouter, useParams } from 'next/navigation';
import { Exercise, ExerciseType, WorkoutTemplate } from '../../../../lib/types';

export default function EditTrainingTemplatePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

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
  const [newExerciseGoal, setNewExerciseGoal] = useState('');
  const [newExerciseGoalDueDate, setNewExerciseGoalDueDate] = useState('');
  const [newExerciseError, setNewExerciseError] = useState<string | null>(null);
  const [creatingExercise, setCreatingExercise] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [templateRes, exercisesRes] = await Promise.all([
          fetch(`/api/templates/${id}`),
          fetch('/api/exercises'),
        ]);
        const templateData = await templateRes.json();
        if (!templateRes.ok || !templateData.success) {
          throw new Error(templateData?.error || 'Template konnte nicht geladen werden');
        }
        const t: WorkoutTemplate = templateData.data;
        setName(t.name);
        setSelectedIds(t.exerciseIds);

        const exercisesData = await exercisesRes.json();
        if (!exercisesRes.ok || !exercisesData.success) {
          throw new Error(exercisesData?.error || 'Übungen konnten nicht geladen werden');
        }
        setExercises(exercisesData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const toggleExercise = (exerciseId: string) => {
    setSelectedIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((x) => x !== exerciseId) : [...prev, exerciseId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!name.trim() || selectedIds.length === 0) {
      setError('Name und mindestens eine Übung sind erforderlich');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), exerciseIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Template konnte nicht aktualisiert werden');
      }
      router.push('/trainings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Template konnte nicht aktualisiert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExercise = async () => {
    if (!newExerciseName.trim()) {
      setNewExerciseError('Name ist erforderlich');
      return;
    }
    if (newExerciseType === 'counter') {
      const goalValue = Number(newExerciseGoal);
      if (!Number.isFinite(goalValue) || goalValue <= 0) {
        setNewExerciseError('Ziel muss groesser als 0 sein');
        return;
      }
      if (!newExerciseGoalDueDate) {
        setNewExerciseError('Enddatum ist erforderlich');
        return;
      }
    }
    setCreatingExercise(true);
    setNewExerciseError(null);
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newExerciseName.trim(),
          type: newExerciseType,
          goal: newExerciseType === 'counter' ? Number(newExerciseGoal) : null,
          goalDueDate: newExerciseType === 'counter' ? newExerciseGoalDueDate : null,
        }),
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
      setNewExerciseGoal('');
      setNewExerciseGoalDueDate('');
    } catch (err) {
      setNewExerciseError(err instanceof Error ? err.message : 'Übung konnte nicht erstellt werden');
    } finally {
      setCreatingExercise(false);
    }
  };

  if (!id) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Kein Template gewählt.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', pt: { xs: 2, md: 6 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Template bearbeiten
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {loading ? (
            <Typography>Lade Template...</Typography>
          ) : (
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
          )}
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
              <MenuItem value="counter">Ziel</MenuItem>
            </TextField>
            {newExerciseType === 'counter' && (
              <>
                <TextField
                  label="Ziel (Anzahl)"
                  type="number"
                  inputProps={{ step: '1', inputMode: 'numeric' }}
                  value={newExerciseGoal}
                  onChange={(e) => setNewExerciseGoal(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Bis Datum"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={newExerciseGoalDueDate}
                  onChange={(e) => setNewExerciseGoalDueDate(e.target.value)}
                  required
                  fullWidth
                />
              </>
            )}
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
              <MenuItem value="counter">Ziel</MenuItem>
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
