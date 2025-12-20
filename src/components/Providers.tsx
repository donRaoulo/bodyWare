'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './ThemeProvider';
import { AppNavigation } from './AppNavigation';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <AppNavigation />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
