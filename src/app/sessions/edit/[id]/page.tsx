'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  TextField,
  IconButton,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import type { ExerciseSession, WorkoutSession, ExerciseType } from '../../../../lib/types';

type EditableExercise = {
  exerciseId: string;
  exerciseName: string;
  type: ExerciseType;
  strength?: { sets: { weight: number | null; reps: number | null }[] };
  cardio?: { time: number | null; level: number | null; distance: number | null };
  endurance?: { time: number | null; distance: number | null; pace: number | null };
  stretch?: { completed: boolean };
  counter?: { value: number | null };
};

export default function EditSessionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string | undefined;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/sessions/${id}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data?.error || 'Workout konnte nicht geladen werden');
        }
        const sessionData: WorkoutSession = data.data;
        setSession(sessionData);
        setExercises(
          (sessionData.exercises || []).map((ex): EditableExercise => {
            if (ex.type === 'strength') {
              const sets = ex.strength?.sets?.length
                ? ex.strength.sets.map((s) => ({
                    weight: s.weight ?? null,
                    reps: s.reps ?? null,
                  }))
                : [{ weight: null, reps: null }];
              return { ...ex, strength: { sets } };
            }
            if (ex.type === 'cardio') {
              return {
                ...ex,
                cardio: {
                  time: ex.cardio?.time ?? null,
                  level: ex.cardio?.level ?? null,
                  distance: ex.cardio?.distance ?? null,
                },
              };
            }
            if (ex.type === 'endurance') {
              return {
                ...ex,
                endurance: {
                  time: ex.endurance?.time ?? null,
                  distance: ex.endurance?.distance ?? null,
                  pace: ex.endurance?.pace ?? null,
                },
              };
            }
            if (ex.type === 'stretch') {
              return {
                ...ex,
                stretch: { completed: ex.stretch?.completed ?? false },
              };
            }
            if (ex.type === 'counter') {
              return {
                ...ex,
                counter: { value: ex.counter?.value ?? null },
              };
            }
            return { ...ex };
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const updateStrengthSet = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number | null) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const sets = ex.strength?.sets || [];
        const updatedSets = sets.map((s, idx) =>
          idx === setIndex ? { ...s, [field]: value } : s
        );
        return { ...ex, strength: { sets: updatedSets } };
      })
    );
  };

  const addStrengthSet = (exerciseId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const sets = ex.strength?.sets || [];
        const lastSet = sets[sets.length - 1];
        const newSet = lastSet
          ? { weight: lastSet.weight ?? null, reps: lastSet.reps ?? null }
          : { weight: null, reps: null };
        return { ...ex, strength: { sets: [...sets, newSet] } };
      })
    );
  };

  const removeStrengthSet = (exerciseId: string, setIndex: number) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const sets = ex.strength?.sets || [];
        const next = sets.filter((_, idx) => idx !== setIndex);
        return { ...ex, strength: { sets: next.length ? next : [{ weight: null, reps: null }] } };
      })
    );
  };

  const updateCardio = (exerciseId: string, field: 'time' | 'level' | 'distance', value: number | null) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, cardio: { ...(ex.cardio || { time: null, level: null, distance: null }), [field]: value } }
          : ex
      )
    );
  };

  const updateEndurance = (exerciseId: string, field: 'time' | 'distance', value: number | null) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const endurance = { ...(ex.endurance || { time: null, distance: null, pace: null }), [field]: value };
        const pace =
          endurance.distance && endurance.time && endurance.distance > 0
            ? Math.round((endurance.time / endurance.distance) * 100) / 100
            : null;
        return { ...ex, endurance: { ...endurance, pace } };
      })
    );
  };

  const updateStretch = (exerciseId: string, completed: boolean) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId ? { ...ex, stretch: { completed } } : ex
      )
    );
  };

  const updateCounter = (exerciseId: string, value: number | null) => {
    setExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId ? { ...ex, counter: { value } } : ex
      )
    );
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const normalizedExercises = exercises
        .map((ex): ExerciseSession | null => {
          if (ex.type === 'strength') {
            const filledSets = (ex.strength?.sets || []).filter((s) => s.weight != null || s.reps != null);
            if (!filledSets.length) return null;
            return {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              type: ex.type,
              strength: {
                sets: filledSets.map((s) => ({
                  weight: s.weight ?? 0,
                  reps: s.reps ?? 0,
                })),
              },
            };
          }
          if (ex.type === 'cardio') {
            const time = ex.cardio?.time;
            const level = ex.cardio?.level;
            const distance = ex.cardio?.distance;
            const hasData = [time, level, distance].some((v) => v !== null && v !== undefined);
            if (!hasData) return null;
            return {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              type: ex.type,
              cardio: {
                time: time ?? 0,
                level: level ?? 1,
                distance: distance ?? 0,
              },
            };
          }
          if (ex.type === 'endurance') {
            const time = ex.endurance?.time;
            const distance = ex.endurance?.distance;
            const hasData = time != null || distance != null;
            if (!hasData) return null;
            const pace = distance && distance > 0 && time ? Math.round((time / distance) * 100) / 100 : 0;
            return {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              type: ex.type,
              endurance: {
                time: time ?? 0,
                distance: distance ?? 0,
                pace,
              },
            };
          }
          if (ex.type === 'stretch') {
            if (!ex.stretch?.completed) return null;
            return {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              type: ex.type,
              stretch: { completed: true },
            };
          }
          if (ex.type === 'counter') {
            const value = ex.counter?.value;
            if (value == null) return null;
            return {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              type: ex.type,
              counter: { value: Number(value) },
            };
          }
          return null;
        })
        .filter((ex): ex is ExerciseSession => ex !== null);

      if (!normalizedExercises.length) {
        setError('Mindestens eine Uebung braucht Werte.');
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/sessions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercises: normalizedExercises }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Speichern fehlgeschlagen');
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Kein Workout gewaehlt.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', pt: { xs: 2, md: 6 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Workout bearbeiten
      </Typography>
      {session && (
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          {session.templateName} • {format(new Date(session.date), 'dd.MM.yyyy')}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {loading ? (
            <Typography>Lade Workout...</Typography>
          ) : (
            <Stack spacing={2}>
              {exercises.map((ex) => (
                <Box key={ex.exerciseId} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                    {ex.exerciseName}
                  </Typography>

                  {ex.type === 'strength' && (
                    <Stack spacing={1}>
                      {ex.strength?.sets?.map((set, sIdx) => (
                        <Box
                          key={sIdx}
                          sx={{
                            display: 'flex',
                            gap: 1,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                          }}
                        >
                          <TextField
                            label="Gewicht (kg)"
                            type="number"
                            size="small"
                            inputProps={{ step: '0.5', inputMode: 'decimal', style: { appearance: 'textfield' }, maxLength: 5 }}
                            value={set.weight ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              updateStrengthSet(ex.exerciseId, sIdx, 'weight', val);
                            }}
                            sx={{
                              maxWidth: 110,
                              '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0,
                              },
                            }}
                          />
                          <TextField
                            label="Wdh."
                            type="number"
                            size="small"
                            inputProps={{ inputMode: 'numeric', style: { appearance: 'textfield' }, maxLength: 5 }}
                            value={set.reps ?? ''}
                            onChange={(e) => {
                              const val = e.target.value === '' ? null : Number(e.target.value);
                              updateStrengthSet(ex.exerciseId, sIdx, 'reps', val);
                            }}
                            sx={{
                              maxWidth: 90,
                              '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                                WebkitAppearance: 'none',
                                margin: 0,
                              },
                            }}
                          />
                          <IconButton size="small" onClick={() => removeStrengthSet(ex.exerciseId, sIdx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                      <Button startIcon={<AddIcon />} onClick={() => addStrengthSet(ex.exerciseId)} size="small">
                        Set hinzufuegen
                      </Button>
                    </Stack>
                  )}

                  {ex.type === 'cardio' && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TextField
                        label="Zeit (Min.)"
                        type="number"
                        size="small"
                        inputProps={{ step: '1', inputMode: 'numeric', style: { appearance: 'textfield' }, maxLength: 5 }}
                        value={ex.cardio?.time ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateCardio(ex.exerciseId, 'time', val);
                        }}
                        sx={{
                          maxWidth: 110,
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0,
                          },
                        }}
                      />
                      <TextField
                        label="Stufe"
                        type="number"
                        size="small"
                        inputProps={{ step: '1', inputMode: 'numeric', style: { appearance: 'textfield' }, maxLength: 5 }}
                        value={ex.cardio?.level ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateCardio(ex.exerciseId, 'level', val);
                        }}
                        sx={{
                          maxWidth: 100,
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0,
                          },
                        }}
                      />
                      <TextField
                        label="Distanz (km)"
                        type="number"
                        size="small"
                        inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' }, maxLength: 5 }}
                        value={ex.cardio?.distance ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateCardio(ex.exerciseId, 'distance', val);
                        }}
                        sx={{
                          maxWidth: 120,
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0,
                          },
                        }}
                      />
                    </Box>
                  )}

                  {ex.type === 'endurance' && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TextField
                        label="Zeit (Min.)"
                        type="number"
                        size="small"
                        inputProps={{ step: '1', inputMode: 'numeric', style: { appearance: 'textfield' }, maxLength: 5 }}
                        value={ex.endurance?.time ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateEndurance(ex.exerciseId, 'time', val);
                        }}
                        sx={{
                          maxWidth: 110,
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0,
                          },
                        }}
                      />
                      <TextField
                        label="Distanz (km)"
                        type="number"
                        size="small"
                        inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' }, maxLength: 5 }}
                        value={ex.endurance?.distance ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateEndurance(ex.exerciseId, 'distance', val);
                        }}
                        sx={{
                          maxWidth: 110,
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0,
                          },
                        }}
                      />
                      <Box sx={{ minWidth: 110, display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                          Pace:
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {ex.endurance?.pace ?? 0} min/km
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {ex.type === 'stretch' && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={ex.stretch?.completed ?? false}
                          onChange={(e) => updateStretch(ex.exerciseId, e.target.checked)}
                        />
                      }
                      label="Erledigt"
                    />
                  )}

                  {ex.type === 'counter' && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TextField
                        label="Anzahl"
                        type="number"
                        size="small"
                        inputProps={{ step: '1', inputMode: 'numeric', style: { appearance: 'textfield' }, maxLength: 6 }}
                        value={ex.counter?.value ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          updateCounter(ex.exerciseId, val);
                        }}
                        sx={{
                          maxWidth: 120,
                          '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0,
                          },
                        }}
                      />
                    </Box>
                  )}
                </Box>
              ))}

              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button variant="outlined" onClick={() => router.push('/dashboard')}>
                  Abbrechen
                </Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? 'Speichert...' : 'Speichern'}
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
