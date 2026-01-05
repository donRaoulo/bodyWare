'use client';

import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import messlinienImage from '@/data/messlinien.png';

type MeasurementFields = {
  date: string;
  weight?: string;
  chest?: string;
  waist?: string;
  hips?: string;
  upperArm?: string;
  forearm?: string;
  thigh?: string;
  calf?: string;
};

export default function CreateMeasurementPage() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<MeasurementFields>({ date: today });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof MeasurementFields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        date: form.date,
        weight: form.weight ? Number(form.weight) : undefined,
        chest: form.chest ? Number(form.chest) : undefined,
        waist: form.waist ? Number(form.waist) : undefined,
        hips: form.hips ? Number(form.hips) : undefined,
        upperArm: form.upperArm ? Number(form.upperArm) : undefined,
        forearm: form.forearm ? Number(form.forearm) : undefined,
        thigh: form.thigh ? Number(form.thigh) : undefined,
        calf: form.calf ? Number(form.calf) : undefined,
      };

      const response = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data?.error || 'Speichern der Messung fehlgeschlagen');
      }

      router.push('/body');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern der Messung fehlgeschlagen');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', pt: { xs: 2, md: 6 } }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Messung hinzufuegen
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent
          sx={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row',
            gap: 2,
            alignItems: 'flex-start',
          }}
        >
          <Stack direction="row" spacing={2} sx={{ flex: 1, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
              <form onSubmit={handleSubmit}>
                <Stack spacing={2}>
                  <TextField
                    label="Datum"
                    type="date"
                    value={form.date}
                    onChange={handleChange('date')}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    required
                  />

                  <Stack direction="column" spacing={1}>
                    <TextField label="Gewicht (kg)" type="number" size="small" inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' } }} value={form.weight || ''} onChange={handleChange('weight')} sx={{ maxWidth: 140, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
                    <TextField label="Brust (cm)" type="number" size="small" inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' } }} value={form.chest || ''} onChange={handleChange('chest')} sx={{ maxWidth: 140, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
                    <TextField label="Taille (cm)" type="number" size="small" inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' } }} value={form.waist || ''} onChange={handleChange('waist')} sx={{ maxWidth: 140, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
                  </Stack>

                  <Stack direction="column" spacing={1}>
                    <TextField label="Huefte (cm)" type="number" size="small" inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' } }} value={form.hips || ''} onChange={handleChange('hips')} sx={{ maxWidth: 140, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
                    <TextField label="Oberarm (cm)" type="number" size="small" inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' } }} value={form.upperArm || ''} onChange={handleChange('upperArm')} sx={{ maxWidth: 140, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
                    <TextField label="Unterarm (cm)" type="number" size="small" inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' } }} value={form.forearm || ''} onChange={handleChange('forearm')} sx={{ maxWidth: 140, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
                  </Stack>

                  <Stack direction="column" spacing={1}>
                    <TextField label="Oberschenkel (cm)" type="number" size="small" inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' } }} value={form.thigh || ''} onChange={handleChange('thigh')} sx={{ maxWidth: 140, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
                    <TextField label="Wade (cm)" type="number" size="small" inputProps={{ step: '0.1', inputMode: 'decimal', style: { appearance: 'textfield' } }} value={form.calf || ''} onChange={handleChange('calf')} sx={{ maxWidth: 140, '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 } }} />
                  </Stack>

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button variant="outlined" size="small" onClick={() => router.push('/body')}>
                      Abbrechen
                    </Button>
                    <Button type="submit" variant="contained" size="small" disabled={submitting}>
                      {submitting ? 'Speichert...' : 'Speichern'}
                    </Button>
                  </Stack>
                </Stack>
              </form>
            </Box>

            <Box
              sx={{
                position: 'absolute',
                inset: 8,
                right: 0,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'flex-start',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            >
              <Image
                src={messlinienImage}
                alt="Messlinien Uebersicht fuer Koerpermessungen"
                style={{
                  width: '38vw',
                  maxWidth: 320,
                  minWidth: 220,
                  height: 'auto',
                  opacity: 0.18,
                  objectFit: 'contain',
                  translate: '5% 0',
                }}
                priority
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
