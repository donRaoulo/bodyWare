'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  IconButton,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Exercise, WorkoutTemplate } from '../../lib/types';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

export default function StartWorkoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('templateId');

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [sessionExercises, setSessionExercises] = useState<
    {
      exerciseId: string;
      exerciseName: string;
      type: Exercise['type'];
      strength?: { sets: { weight: number | null; reps: number | null }[] };
      cardio?: { time: number | null; level: number | null; distance: number | null };
      endurance?: { time: number | null; distance: number | null; pace: number | null };
      stretch?: { completed: boolean };
    }[]
  >([]);
  const [maxWeightByExercise, setMaxWeightByExercise] = useState<Record<string, number | undefined>>({});

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of exercises) map.set(ex.id, ex);
    return map;
  }, [exercises]);

  useEffect(() => {
    if (!templateId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [templateRes, exercisesRes, sessionsRes] = await Promise.all([
          fetch(`/api/templates/${templateId}`),
          fetch('/api/exercises'),
          fetch(`/api/sessions?limit=50&templateId=${templateId}`),
        ]);

        const templateData = await templateRes.json();
        if (!templateRes.ok || !templateData.success) {
          throw new Error(templateData?.error || 'Template konnte nicht geladen werden');
        }
        setTemplate(templateData.data);

        const exercisesData = await exercisesRes.json();
        if (!exercisesRes.ok || !exercisesData.success) {
          throw new Error(exercisesData?.error || 'Übungen konnten nicht geladen werden');
        }
        setExercises(exercisesData.data);

        const sessionsData = await sessionsRes.json();
        const sessionList: WorkoutSession[] =
          sessionsRes.ok && sessionsData.success && Array.isArray(sessionsData.data)
            ? (sessionsData.data as WorkoutSession[])
            : [];

        // Build lookup for last used values per exercise across all fetched sessions
        const lastByExercise = new Map<string, ExerciseSession>();
        const maxWeights: Record<string, number> = {};
        for (const session of sessionList) {
          for (const ex of session.exercises || []) {
            if (!lastByExercise.has(ex.exerciseId)) {
              lastByExercise.set(ex.exerciseId, ex);
            }
            if (ex.type === 'strength' && ex.strength?.sets?.length) {
              for (const s of ex.strength.sets) {
                const w = s.weight;
                if (w !== undefined && w !== null) {
                  const current = maxWeights[ex.exerciseId];
                  maxWeights[ex.exerciseId] = current !== undefined ? Math.max(current, Number(w)) : Number(w);
                }
              }
            }
          }
        }
        setMaxWeightByExercise(maxWeights);

        const defaultSessionExercises = templateData.data.exerciseIds.map((id: string) => {
          const ex = exercisesData.data.find((e: Exercise) => e.id === id);
          const last = lastByExercise.get(id);

          const defaultStrength =
            ex?.type === 'strength'
              ? {
                  sets:
                    last?.strength?.sets?.length
                      ? last.strength.sets.map((s) => ({
                          weight: s.weight != null ? Number(s.weight) : null,
                          reps: s.reps != null ? Number(s.reps) : null,
                        }))
                      : [{ weight: null, reps: null }],
                }
              : undefined;

          const defaultCardio =
            ex?.type === 'cardio'
              ? {
                  time: last?.cardio?.time != null ? Number(last.cardio.time) : null,
                  level: last?.cardio?.level != null ? Number(last.cardio.level) : null,
                  distance: last?.cardio?.distance != null ? Number(last.cardio.distance) : null,
                }
              : undefined;

          const defaultEndurance =
            ex?.type === 'endurance'
              ? {
                  time: last?.endurance?.time != null ? Number(last.endurance.time) : null,
                  distance: last?.endurance?.distance != null ? Number(last.endurance.distance) : null,
                  pace:
                    last?.endurance?.distance && last?.endurance?.time
                      ? Math.round((Number(last.endurance.time) / Number(last.endurance.distance)) * 100) / 100
                      : null,
                }
              : undefined;

          const defaultStretch =
            ex?.type === 'stretch'
              ? {
                  completed: last?.stretch?.completed ?? false,
                }
              : undefined;

          return {
            exerciseId: id,
            exerciseName: ex?.name || 'Übung',
            type: (ex?.type as Exercise['type']) || 'strength',
            strength: defaultStrength,
            cardio: defaultCardio,
            endurance: defaultEndurance,
            stretch: defaultStretch,
          };
        });
        setSessionExercises(defaultSessionExercises);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [templateId]);

  const startWorkout = async () => {
    if (!template) return;
    setStarting(true);
    setError(null);
    try {
      // Normalize nulls to numbers before sending
      const normalizedExercises = sessionExercises.map((ex) => {
        if (ex.type === 'strength') {
          return {
            ...ex,
            strength: {
              sets: ex.strength?.sets.map((s) => ({
                weight: s.weight ?? 0,
                reps: s.reps ?? 0,
              })) || [{ weight: 0, reps: 0 }],
            },
          };
        }
        if (ex.type === 'cardio') {
          return {
            ...ex,
            cardio: {
              time: ex.cardio?.time ?? 0,
              level: ex.cardio?.level ?? 1,
              distance: ex.cardio?.distance ?? 0,
            },
          };
        }
        if (ex.type === 'endurance') {
          const time = ex.endurance?.time ?? 0;
          const distance = ex.endurance?.distance ?? 0;
          const pace = distance > 0 ? Math.round((time / distance) * 100) / 100 : 0;
          return {
            ...ex,
            endurance: {
              time,
              distance,
              pace,
            },
          };
        }
        return {
          ...ex,
          stretch: {
            completed: ex.stretch?.completed ?? false,
          },
        };
      });

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
          date: new Date().toISOString(),
          exercises: normalizedExercises,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Workout konnte nicht gestartet werden');
      }
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Workout konnte nicht gestartet werden');
    } finally {
      setStarting(false);
    }
  };

  const updateStrengthSet = (exerciseId: string, setIndex: number, field: 'weight' | 'reps', value: number | null) => {
    setSessionExercises((prev) =>
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
    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const sets = ex.strength?.sets || [];
        return { ...ex, strength: { sets: [...sets, { weight: 0, reps: 0 }] } };
      })
    );
  };

  const removeStrengthSet = (exerciseId: string, setIndex: number) => {
    setSessionExercises((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exerciseId) return ex;
        const sets = ex.strength?.sets || [];
        const next = sets.filter((_, idx) => idx !== setIndex);
        return { ...ex, strength: { sets: next.length ? next : [{ weight: 0, reps: 0 }] } };
      })
    );
  };

  const updateCardio = (exerciseId: string, field: 'time' | 'level' | 'distance', value: number | null) => {
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, cardio: { ...(ex.cardio || { time: 0, level: 1, distance: 0 }), [field]: value } }
          : ex
      )
    );
  };

  const updateEndurance = (exerciseId: string, field: 'time' | 'distance', value: number | null) => {
    setSessionExercises((prev) =>
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
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId ? { ...ex, stretch: { completed } } : ex
      )
    );
  };

  if (!templateId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Kein Template gewählt.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', pt: { xs: 2, md: 6 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Workout starten
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
          ) : template ? (
            <>
              <Typography variant="h6" gutterBottom>
                {template.name}
              </Typography>
              <List dense sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sessionExercises.map((ex, idx) => (
                  <ListItem
                    key={ex.exerciseId}
                    disableGutters
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      px: 1,
                      py: 1,
                    }}
                  >
                    <ListItemText
                      primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                      primary={ex.exerciseName}
                      secondary={
                        maxWeightByExercise[ex.exerciseId] !== undefined
                          ? `${ex.type} • max ${maxWeightByExercise[ex.exerciseId]} kg`
                          : ex.type
                      }
                      sx={{ mb: 1 }}
                    />
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
                                maxWidth: 100,
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
                                maxWidth: 70,
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
                          Set hinzufügen
                        </Button>
                      </Stack>
                    )}
                    {ex.type === 'cardio' && (
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
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
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
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
                            maxWidth: 100,
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
                  </ListItem>
                ))}
              </List>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={() => router.push('/trainings')}>
                  Zurück
                </Button>
                <Button variant="contained" onClick={startWorkout} disabled={starting}>
                  {starting ? 'Speichert...' : 'Workout speichern'}
                </Button>
              </Box>
            </>
          ) : (
            <Typography>Kein Template gefunden.</Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
