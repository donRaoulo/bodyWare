'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

type GuardState = {
  enabled: boolean;
  message: string;
};

type NavigationGuardContextValue = {
  setGuard: (guard: GuardState) => void;
  clearGuard: () => void;
  requestNavigation: (href: string) => void;
  guardEnabled: boolean;
};

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null);

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [guard, setGuardState] = useState<GuardState>({ enabled: false, message: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const setGuard = useCallback((next: GuardState) => {
    setGuardState(next);
  }, []);

  const clearGuard = useCallback(() => {
    setGuardState({ enabled: false, message: '' });
    setDialogOpen(false);
    setPendingHref(null);
  }, []);

  const requestNavigation = useCallback(
    (href: string) => {
      if (!guard.enabled || href === pathname) {
        router.push(href);
        return;
      }
      setPendingHref(href);
      setDialogOpen(true);
    },
    [guard.enabled, pathname, router]
  );

  const handleCancel = () => {
    setDialogOpen(false);
    setPendingHref(null);
  };

  const handleDiscard = () => {
    const target = pendingHref;
    setDialogOpen(false);
    setPendingHref(null);
    if (target) {
      router.push(target);
    }
  };

  useEffect(() => {
    if (!guard.enabled) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [guard.enabled]);

  const value = useMemo(
    () => ({
      setGuard,
      clearGuard,
      requestNavigation,
      guardEnabled: guard.enabled,
    }),
    [clearGuard, guard.enabled, requestNavigation, setGuard]
  );

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
      <Dialog open={dialogOpen} onClose={handleCancel}>
        <DialogTitle>Eingabe nicht gespeichert</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {guard.message || 'Deine Eingaben sind noch nicht gespeichert. Wenn du jetzt gehst, gehen sie verloren.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel}>Abbrechen</Button>
          <Button onClick={handleDiscard} color="error" variant="contained">
            Verwerfen
          </Button>
        </DialogActions>
      </Dialog>
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext);
  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider');
  }
  return context;
}
