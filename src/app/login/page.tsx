'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Typography,
  Button,
  Alert,
  Link as MuiLink,
} from '@mui/material';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: '/',
    });

    setLoading(false);

    if (result?.error) {
      setError('Login fehlgeschlagen. Bitte Zugangsdaten prüfen.');
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Card sx={{ width: '100%', maxWidth: 420 }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom>
            Anmelden
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Melde dich an, um deine FitFlex-Daten zu sehen.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="E-Mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={loading} fullWidth>
              {loading ? 'Anmelden...' : 'Anmelden'}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }}>
            Noch kein Konto?{' '}
            <MuiLink component={Link} href="/signup">
              Registrieren
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
