'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { alpha, createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleColorMode: () => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'dark';
    const savedMode = localStorage.getItem('bodyware-theme') as ThemeMode | null;
    return savedMode === 'light' || savedMode === 'dark' ? savedMode : 'dark';
  });
  const [primaryColor, setPrimaryColorState] = useState<string>(() => {
    if (typeof window === 'undefined') return '#58a6ff';
    return localStorage.getItem('bodyware-primary') || '#58a6ff';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydrate primary color from user settings once
  useEffect(() => {
    const loadSettingsColor = async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) return;
        const data = await res.json();
        const color = data?.data?.primaryColor;
        if (typeof color === 'string' && color.startsWith('#') && color.length >= 4) {
          setPrimaryColorState(color);
          localStorage.setItem('bodyware-primary', color);
        }
      } catch {
        // ignore
      }
    };
    loadSettingsColor();
  }, []);

  const toggleColorMode = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('bodyware-theme', newMode);
  };

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color);
    localStorage.setItem('bodyware-primary', color);
  };

  const theme = useMemo(() => {
    const isDark = mode === 'dark';
    const backgroundDefault = isDark ? '#0f1115' : '#f6f8fc';
    const backgroundPaper = isDark ? '#171a20' : '#ffffff';
    const borderMain = isDark ? alpha('#ffffff', 0.14) : '#d7dfed';
    const borderStrong = isDark ? alpha('#ffffff', 0.24) : '#c1cde0';
    const surfaceMain = isDark ? '#1d222b' : '#f9fbff';
    const surfaceVariant = isDark ? '#262d38' : '#edf3ff';
    const textPrimary = isDark ? '#e8edf6' : '#1b2432';
    const textSecondary = isDark ? '#9ba9bf' : '#556176';

    return createTheme({
      palette: {
        mode,
        primary: {
          main: primaryColor,
          dark: primaryColor,
          contrastText: '#ffffff',
        },
        background: {
          default: backgroundDefault,
          paper: backgroundPaper,
        },
        surface: {
          main: surfaceMain,
          variant: surfaceVariant,
        },
        text: {
          primary: textPrimary,
          secondary: textSecondary,
        },
        divider: borderMain,
        border: {
          main: borderMain,
          thick: borderStrong,
        },
        success: {
          main: '#30c978',
          dark: '#1f9257',
        },
        warning: {
          main: '#f9a825',
          dark: '#cf8600',
        },
        error: {
          main: '#f0626c',
        },
        info: {
          main: '#42a5f5',
        },
      },
      typography: {
        fontFamily: ['var(--font-geist-sans)', '"Avenir Next"', '"Segoe UI"', 'sans-serif'].join(','),
        h1: { fontWeight: 750, fontSize: '2.7rem', lineHeight: 1.08, letterSpacing: '-0.02em' },
        h2: { fontWeight: 700, fontSize: '2.1rem', lineHeight: 1.15, letterSpacing: '-0.015em' },
        h3: { fontWeight: 700, fontSize: '1.8rem', lineHeight: 1.2, letterSpacing: '-0.01em' },
        h4: { fontWeight: 680, fontSize: '1.45rem', lineHeight: 1.25, letterSpacing: '-0.01em' },
        h5: { fontWeight: 650, fontSize: '1.2rem', lineHeight: 1.3 },
        h6: { fontWeight: 650, fontSize: '1.02rem', lineHeight: 1.35 },
        body1: { fontSize: '0.98rem', lineHeight: 1.55 },
        body2: { fontSize: '0.87rem', lineHeight: 1.5 },
      },
      shape: {
        borderRadius: 14,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              background: isDark
                ? 'radial-gradient(circle at 2% 2%, #2a2f38 0%, #171c24 40%, #0f1115 100%)'
                : 'radial-gradient(circle at 2% 2%, #f0f6ff 0%, #f7faff 45%, #f5f8fc 100%)',
              backgroundAttachment: 'fixed',
            },
            '::selection': {
              backgroundColor: alpha(primaryColor, 0.28),
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 18,
              backgroundColor: alpha(backgroundPaper, isDark ? 0.92 : 0.88),
              backdropFilter: 'blur(12px)',
              border: `1px solid ${borderMain}`,
              boxShadow: isDark
                ? '0 8px 24px rgba(0, 0, 0, 0.35)'
                : '0 10px 28px rgba(16, 42, 67, 0.08)',
              transition: 'transform 180ms ease, box-shadow 220ms ease, border-color 180ms ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                borderColor: alpha(primaryColor, 0.45),
                boxShadow: isDark
                  ? `0 12px 28px ${alpha('#000000', 0.45)}`
                  : `0 14px 30px ${alpha(primaryColor, 0.18)}`,
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: `1px solid ${borderMain}`,
            },
          },
        },
        MuiButton: {
          defaultProps: {
            disableElevation: true,
          },
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 620,
              borderRadius: 12,
              padding: '9px 16px',
              transition: 'transform 140ms ease, background-color 180ms ease, box-shadow 180ms ease',
              '&:active': {
                transform: 'translateY(1px)',
              },
            },
            contained: {
              backgroundImage: `linear-gradient(135deg, ${alpha(primaryColor, 0.98)} 0%, ${alpha(primaryColor, 0.8)} 100%)`,
              boxShadow: `0 8px 18px ${alpha(primaryColor, 0.28)}`,
              '&:hover': {
                boxShadow: `0 12px 24px ${alpha(primaryColor, 0.34)}`,
              },
            },
            outlined: {
              borderColor: alpha(primaryColor, 0.38),
              backgroundColor: alpha(primaryColor, isDark ? 0.14 : 0.06),
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
                backgroundColor: alpha(backgroundPaper, isDark ? 0.85 : 0.92),
                transition: 'border-color 180ms ease, box-shadow 180ms ease',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: alpha(primaryColor, 0.45),
                },
              },
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              fontWeight: 560,
              transition: 'all 160ms ease',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: alpha(backgroundPaper, isDark ? 0.78 : 0.9),
              backdropFilter: 'blur(10px)',
              borderBottom: `1px solid ${borderMain}`,
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.06)',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundColor: alpha(backgroundPaper, isDark ? 0.9 : 0.95),
              borderRight: `1px solid ${borderMain}`,
            },
          },
        },
        MuiBottomNavigation: {
          styleOverrides: {
            root: {
              backgroundColor: alpha(backgroundPaper, isDark ? 0.9 : 0.95),
              borderTop: `1px solid ${borderMain}`,
              boxShadow: isDark
                ? '0 -8px 20px rgba(0, 0, 0, 0.28)'
                : '0 -8px 20px rgba(16, 42, 67, 0.09)',
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 18,
              backdropFilter: 'blur(8px)',
            },
          },
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: 12,
            },
          },
        },
      },
    });
  }, [mode, primaryColor]);

  // Avoid hydration mismatches by rendering after mount when theme is known
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleColorMode, primaryColor, setPrimaryColor }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}
