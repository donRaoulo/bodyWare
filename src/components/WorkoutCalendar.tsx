'use client';

import { useMemo, useState } from 'react';
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { PickersDay, PickersDayProps } from '@mui/x-date-pickers/PickersDay';
import { format } from 'date-fns';
import { WorkoutSession, WorkoutTemplate } from '../lib/types';
import Link from 'next/link';
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

type WorkoutCalendarProps = {
  sessions: WorkoutSession[];
  templates: WorkoutTemplate[];
  selectedDate: Date | null;
  onSelectedDateChange: (date: Date | null) => void;
  onDeleteSession?: (sessionId: string) => void | Promise<void>;
};

export function WorkoutCalendar({
  sessions,
  templates,
  selectedDate,
  onSelectedDateChange,
  onDeleteSession,
}: WorkoutCalendarProps) {
  const router = useRouter();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSession | null>(null);
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const session of sessions) {
      const key = format(new Date(session.date), 'yyyy-MM-dd');
      const existing = map.get(key);
      if (existing) {
        existing.push(session);
      } else {
        map.set(key, [session]);
      }
    }
    return map;
  }, [sessions]);

  const highlightedDays = useMemo(() => new Set(sessionsByDate.keys()), [sessionsByDate]);
  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedSessions = selectedDateKey ? sessionsByDate.get(selectedDateKey) ?? [] : [];
  const hasTemplates = templates.length > 0;

  const handleAddWorkout = () => {
    if (!selectedDateKey) return;
    if (!selectedTemplateId) return;
    router.push(`/start-workout?templateId=${selectedTemplateId}&date=${selectedDateKey}`);
    setAddDialogOpen(false);
  };

  const handleDeleteRequest = (session: WorkoutSession) => {
    setDeleteTarget(session);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await onDeleteSession?.(deleteTarget.id);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
  };

  function WorkoutDay(props: PickersDayProps<Date> & { highlightedDays?: Set<string> }) {
    const { day, outsideCurrentMonth, highlightedDays: highlighted = new Set(), ...other } = props;
    const dateKey = format(day, 'yyyy-MM-dd');
    const isHighlighted = !outsideCurrentMonth && highlighted.has(dateKey);
    return (
      <Badge
        overlap="circular"
        variant="dot"
        color="primary"
        invisible={!isHighlighted}
      >
        <PickersDay {...other} day={day} outsideCurrentMonth={outsideCurrentMonth} />
      </Badge>
    );
  }

  const DaySlot = (props: PickersDayProps<Date>) => (
    <WorkoutDay {...props} highlightedDays={highlightedDays} />
  );

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Workout Kalender
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <StaticDatePicker
            value={selectedDate}
            onChange={(date) => onSelectedDateChange(date)}
            displayStaticWrapperAs="desktop"
            slots={{ day: DaySlot }}
            slotProps={{
              actionBar: { actions: [] },
            }}
          />
        </LocalizationProvider>

        <Box sx={{ mt: 1 }}>
          {selectedSessions.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Keine Workouts an diesem Datum.
            </Typography>
          ) : (
            <List>
              {selectedSessions.map((session) => (
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
                  <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {session.templateName}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        component={Link}
                        href={`/sessions/edit/${session.id}`}
                        size="small"
                        color="primary"
                        aria-label="Workout bearbeiten"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        aria-label="Workout loeschen"
                        onClick={() => handleDeleteRequest(session)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
          <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton
              size="small"
              color="primary"
              aria-label="Workout hinzufuegen"
              onClick={() => setAddDialogOpen(true)}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>

      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Workout hinzufuegen</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedDateKey
              ? `Datum: ${format(new Date(selectedDateKey), 'dd.MM.yyyy')}`
              : 'Kein Datum ausgewaehlt.'}
          </Typography>
          {hasTemplates ? (
            <TextField
              select
              label="Workout auswählen"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              fullWidth
            >
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  {template.name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Keine Vorlagen vorhanden. Lege zuerst ein Workout an.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {hasTemplates ? (
            <>
              <Button onClick={() => setAddDialogOpen(false)}>Abbrechen</Button>
              <Button
                variant="contained"
                onClick={handleAddWorkout}
                disabled={!selectedTemplateId || !selectedDateKey}
              >
                Weiter
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setAddDialogOpen(false)}>Schliessen</Button>
              <Button component={Link} href="/trainings/create" variant="contained">
                Vorlage erstellen
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Workout loeschen?</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {deleteTarget
              ? `"${deleteTarget.templateName}" am ${format(new Date(deleteTarget.date), 'dd.MM.yyyy')}`
              : 'Dieses Workout wird dauerhaft geloescht.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Abbrechen</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>
            Loeschen
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
