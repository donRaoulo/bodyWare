'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from './ThemeProvider';
import { AppNavigation } from './AppNavigation';
import { NavigationGuardProvider } from './NavigationGuardProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <NavigationGuardProvider>
          <AppNavigation />
          {children}
        </NavigationGuardProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
