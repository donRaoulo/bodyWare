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
import { format } from 'date-fns';
import type { Exercise, WorkoutTemplate, WorkoutSession, ExerciseSession } from '../../lib/types';
import { Add as AddIcon, Delete as DeleteIcon, Check as CheckIcon } from '@mui/icons-material';
import { useNavigationGuard } from '@/components/NavigationGuardProvider';

export default function StartWorkoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const templateId = searchParams.get('templateId');
  const dateParam = searchParams.get('date');

  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [hasTouched, setHasTouched] = useState(false);
  const [sessionExercises, setSessionExercises] = useState<
    {
      exerciseId: string;
      exerciseName: string;
      type: Exercise['type'];
      strength?: { sets: { weight: number | null; reps: number | null }[] };
      cardio?: { time: number | null; level: number | null; distance: number | null };
      endurance?: { time: number | null; distance: number | null; pace: number | null };
      stretch?: { completed: boolean };
      counter?: { value: number | null };
    }[]
  >([]);
  const [maxWeightByExercise, setMaxWeightByExercise] = useState<Record<string, number | undefined>>({});
  const [counterTotalByExercise, setCounterTotalByExercise] = useState<Record<string, number>>({});
  const [savedExerciseIds, setSavedExerciseIds] = useState<Set<string>>(() => new Set());
  const { setGuard, clearGuard, requestNavigation } = useNavigationGuard();

  const formatDueDate = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, 'dd.MM.yyyy');
  };

  const exerciseMap = useMemo(() => {
    const map = new Map<string, Exercise>();
    for (const ex of exercises) map.set(ex.id, ex);
    return map;
  }, [exercises]);

  const sortedExercises = useMemo(
    () =>
      [...sessionExercises].sort((a, b) => {
        const aSaved = savedExerciseIds.has(a.exerciseId);
        const bSaved = savedExerciseIds.has(b.exerciseId);
        if (aSaved === bSaved) return 0;
        return aSaved ? 1 : -1;
      }),
    [sessionExercises, savedExerciseIds]
  );

  const allSaved = sessionExercises.length > 0 && sessionExercises.every((ex) => savedExerciseIds.has(ex.exerciseId));

  useEffect(() => {
    if (!templateId) return;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setHasTouched(false);
        setCounterTotalByExercise({});

        const [templateRes, exercisesRes, sessionsRes, countersRes] = await Promise.all([
          fetch(`/api/templates/${templateId}`),
          fetch('/api/exercises'),
          fetch(`/api/sessions?limit=50&templateId=${templateId}`),
          fetch('/api/sessions/counters'),
        ]);

        const templateData = await templateRes.json();
        if (!templateRes.ok || !templateData.success) {
          throw new Error(templateData?.error || 'Template konnte nicht geladen werden');
        }
        setTemplate(templateData.data);

        const exercisesData = await exercisesRes.json();
        if (!exercisesRes.ok || !exercisesData.success) {
          throw new Error(exercisesData?.error || 'Uebungen konnten nicht geladen werden');
        }
        setExercises(exercisesData.data);

        const sessionsData = await sessionsRes.json();
        const countersData = await countersRes.json();
        const sessionList: WorkoutSession[] =
          sessionsRes.ok && sessionsData.success && Array.isArray(sessionsData.data)
            ? (sessionsData.data as WorkoutSession[])
            : [];
        const counterTotals: Record<string, number> =
          countersRes.ok && countersData.success && countersData.data && typeof countersData.data === 'object'
            ? countersData.data
            : {};

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
        setCounterTotalByExercise(counterTotals);

        const defaultSessionExercises = templateData.data.exerciseIds.map((id: string) => {
          const ex = exercisesData.data.find((e: Exercise) => e.id === id);
          const last = lastByExercise.get(id);

          const defaultStrength =
            ex?.type === 'strength'
              ? {
                  sets:
                    last?.strength?.sets?.length
                      ? [
                          {
                            weight: last.strength.sets[0].weight != null ? Number(last.strength.sets[0].weight) : null,
                            reps: last.strength.sets[0].reps != null ? Number(last.strength.sets[0].reps) : null,
                          },
                        ]
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

          const defaultCounter =
            ex?.type === 'counter'
              ? {
                  value: null,
                }
              : undefined;

          return {
            exerciseId: id,
            exerciseName: ex?.name || 'Uebung',
            type: (ex?.type as Exercise['type']) || 'strength',
            strength: defaultStrength,
            cardio: defaultCardio,
            endurance: defaultEndurance,
            stretch: defaultStretch,
            counter: defaultCounter,
          };
        });
        setSessionExercises(defaultSessionExercises);
        setSavedExerciseIds(new Set());
        setHasTouched(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [templateId]);

  useEffect(() => {
    if (hasTouched && !starting) {
      setGuard({
        enabled: true,
        message: 'Dein Workout ist noch nicht gespeichert. Wenn du die Seite verlaesst, gehen die Eingaben verloren.',
      });
    } else {
      clearGuard();
    }
  }, [clearGuard, hasTouched, setGuard, starting]);

  useEffect(() => clearGuard, [clearGuard]);

  const startWorkout = async () => {
    if (!template) return;
    setStarting(true);
    setError(null);
    try {
      const sessionDate = dateParam ? new Date(dateParam) : new Date();
      const resolvedDate = Number.isNaN(sessionDate.getTime()) ? new Date() : sessionDate;

      const normalizedExercises = sessionExercises
        .filter((ex) => savedExerciseIds.has(ex.exerciseId))
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
              stretch: {
                completed: true,
              },
            };
          }
          if (ex.type === 'counter') {
            const value = ex.counter?.value;
            if (value == null) return null;
            return {
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              type: ex.type,
              counter: {
                value: Number(value),
              },
            };
          }
          return null;
        })
        .filter((ex): ex is ExerciseSession => ex !== null);

      if (!normalizedExercises.length) {
        setError('Keine gespeicherten Uebungen mit Werten gefunden.');
        setStarting(false);
        return;
      }

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
          date: resolvedDate.toISOString(),
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
    setHasTouched(true);
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

  const saveExercise = (exerciseId: string) => {
    setHasTouched(true);
    setSavedExerciseIds((prev) => {
      const next = new Set(prev);
      next.add(exerciseId);
      return next;
    });
  };

  const addStrengthSet = (exerciseId: string) => {
    setHasTouched(true);
    setSessionExercises((prev) =>
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
    setHasTouched(true);
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
    setHasTouched(true);
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId
          ? { ...ex, cardio: { ...(ex.cardio || { time: 0, level: 1, distance: 0 }), [field]: value } }
          : ex
      )
    );
  };

  const updateEndurance = (exerciseId: string, field: 'time' | 'distance', value: number | null) => {
    setHasTouched(true);
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
    setHasTouched(true);
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId ? { ...ex, stretch: { completed } } : ex
      )
    );
  };

  const updateCounter = (exerciseId: string, value: number | null) => {
    setHasTouched(true);
    setSessionExercises((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exerciseId ? { ...ex, counter: { value } } : ex
      )
    );
  };

  if (!templateId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Kein Template gewaehlt.</Alert>
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
            <Typography>Lade Workout...</Typography>
          ) : template ? (
            <>
              <Typography variant="h6" gutterBottom>
                {template.name}
              </Typography>
              {dateParam && !Number.isNaN(new Date(dateParam).getTime()) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Datum: {format(new Date(dateParam), 'dd.MM.yyyy')}
                </Typography>
              )}
              {allSaved && sessionExercises.length > 0 && (
                <Alert severity="success" sx={{ mb: 1 }}>
                  Alle Uebungen gespeichert. Du kannst unten das Workout abschliessen.
                </Alert>
              )}
              <List dense sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {sortedExercises.map((ex, idx) => {
                  const isSaved = savedExerciseIds.has(ex.exerciseId);
                  const counterExercise = exerciseMap.get(ex.exerciseId);
                  const counterGoal = counterExercise?.goal ?? null;
                  const counterDueDate = counterExercise?.goalDueDate ?? null;
                  const counterDueLabel = formatDueDate(counterDueDate);
                  const counterTotal = counterTotalByExercise[ex.exerciseId] ?? 0;
                  const counterValue = ex.counter?.value ?? null;
                  const counterProgress = counterTotal + (counterValue ?? 0);
                  const counterLabel = counterGoal ? `${counterProgress} / ${counterGoal}` : `${counterProgress}`;
                  const counterSecondary = counterDueLabel ? `Bis ${counterDueLabel}` : 'Ziel';
                  return (
                    <ListItem
                      key={ex.exerciseId}
                      disableGutters
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        border: 1,
                        borderColor: isSaved ? 'action.disabled' : 'divider',
                        borderRadius: 1,
                        px: 1,
                        py: 1,
                        opacity: isSaved ? 0.6 : 1,
                        bgcolor: isSaved ? 'action.hover' : 'transparent',
                        transition: 'opacity 0.2s ease, background-color 0.2s ease',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <ListItemText
                          primaryTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                          primary={ex.exerciseName}
                          secondary={
                            ex.type === 'counter'
                              ? counterSecondary
                              : maxWeightByExercise[ex.exerciseId] !== undefined
                                ? `${ex.type}  (max ${maxWeightByExercise[ex.exerciseId]} kg)`
                                : ex.type
                          }
                          sx={{ m: 0 }}
                        />
                        <Button
                          variant="outlined"
                          color={isSaved ? 'success' : 'primary'}
                          size="small"
                          startIcon={<CheckIcon fontSize="small" />}
                          onClick={() => saveExercise(ex.exerciseId)}
                          disabled={isSaved}
                          sx={{
                            whiteSpace: 'nowrap',
                            fontSize: '0.75rem',
                            px: 1,
                            py: 0.25,
                            minWidth: 'auto',
                          }}
                        >
                          {isSaved ? 'Gespeichert' : 'Speichern'}
                        </Button>
                      </Box>
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
                            Set hinzufuegen
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
                      {ex.type === 'counter' && (
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            flexWrap: 'wrap',
                            alignItems: 'center',
                          }}
                        >
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
                          {counterGoal != null && (
                            <Box sx={{ minWidth: 140, display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                                Fortschritt:
                              </Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {counterLabel}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      )}

                    </ListItem>
                  );
                })}
              </List>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Button variant="outlined" onClick={() => requestNavigation('/trainings')}>
                  Zurueck
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









