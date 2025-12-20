'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
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

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      setError(data?.error || 'Registrierung fehlgeschlagen');
      setLoading(false);
      return;
    }

    // Auto-login after signup
    const signInResult = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl: '/',
    });

    setLoading(false);

    if (signInResult?.error) {
      setError('Login nach Registrierung fehlgeschlagen. Bitte manuell anmelden.');
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
            Registrieren
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Erstelle dein Konto, um BodyWare zu nutzen.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
            />
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
              helperText="Mindestens 6 Zeichen"
            />
            <Button type="submit" variant="contained" disabled={loading} fullWidth>
              {loading ? 'Registrieren...' : 'Registrieren'}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ mt: 2 }}>
            Bereits ein Konto?{' '}
            <MuiLink component={Link} href="/login">
              Anmelden
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
