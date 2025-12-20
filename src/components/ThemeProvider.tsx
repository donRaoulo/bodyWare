'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useMemo } from 'react';

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
  const [mode, setMode] = useState<ThemeMode>('dark');
  const [primaryColor, setPrimaryColorState] = useState<string>('#58a6ff');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load theme preference from localStorage
    const savedMode = localStorage.getItem('bodyware-theme') as ThemeMode;
    if (savedMode && (savedMode === 'light' || savedMode === 'dark')) {
      setMode(savedMode);
    }
    const savedColor = localStorage.getItem('bodyware-primary');
    if (savedColor) {
      setPrimaryColorState(savedColor);
    }
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
    const primary = {
      main: primaryColor,
      dark: primaryColor,
    };
    return createTheme({
      palette: {
        mode,
        primary,
        ...(mode === 'dark'
          ? {
              background: {
                default: '#0d1117',
                paper: '#161b22',
              },
              surface: {
                main: '#21262d',
                variant: '#30363d',
              },
              text: {
                primary: '#c9d1d9',
                secondary: '#7d8590',
              },
              divider: '#30363d',
              border: {
                main: '#30363d',
                thick: '#444',
              },
              success: {
                main: '#3fb950',
                dark: '#1a7f37',
              },
              warning: {
                main: '#ff9500',
                dark: '#e36209',
              },
              error: {
                main: '#f85149',
              },
              info: {
                main: '#79c0ff',
              },
            }
          : {
              background: {
                default: '#ffffff',
                paper: '#f5f5f5',
              },
              surface: {
                main: '#ffffff',
                variant: '#e0e0e0',
              },
              text: {
                primary: '#333333',
                secondary: '#666666',
              },
              divider: '#e0e0e0',
              border: {
                main: '#e0e0e0',
                thick: '#cccccc',
              },
              success: {
                main: '#3fb950',
                dark: '#1a7f37',
              },
              warning: {
                main: '#ff9500',
                dark: '#e36209',
              },
              error: {
                main: '#f85149',
              },
              info: {
                main: '#79c0ff',
              },
            }),
      },
      typography: {
        fontFamily: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
        ].join(','),
        h1: { fontWeight: 600, fontSize: '2.5rem', lineHeight: 1.2 },
        h2: { fontWeight: 600, fontSize: '2rem', lineHeight: 1.3 },
        h3: { fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.4 },
        h4: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.4 },
        h5: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.5 },
        h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 },
        body1: { fontSize: '1rem', lineHeight: 1.6 },
        body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiCard: {
          styleOverrides: {
            root: {
              boxShadow: mode === 'dark'
                ? '0 4px 12px rgba(0, 0, 0, 0.3)'
                : '0 2px 8px rgba(0, 0, 0, 0.1)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${mode === 'dark' ? '#30363d' : '#e0e0e0'}`,
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 8,
              padding: '8px 16px',
            },
            contained: {
              boxShadow: mode === 'dark'
                ? `0 2px 8px ${primaryColor}33`
                : '0 2px 4px rgba(0, 0, 0, 0.1)',
            },
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                borderRadius: 8,
              },
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
            },
          },
        },
        MuiAppBar: {
          styleOverrides: {
            root: {
              backgroundColor: mode === 'dark' ? '#161b22' : '#ffffff',
              borderBottom: `1px solid ${mode === 'dark' ? '#30363d' : '#e0e0e0'}`,
              boxShadow: 'none',
            },
          },
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              backgroundColor: mode === 'dark' ? '#161b22' : '#ffffff',
              borderRight: `1px solid ${mode === 'dark' ? '#30363d' : '#e0e0e0'}`,
            },
          },
        },
        MuiBottomNavigation: {
          styleOverrides: {
            root: {
              backgroundColor: mode === 'dark' ? '#161b22' : '#ffffff',
              borderTop: `1px solid ${mode === 'dark' ? '#30363d' : '#e0e0e0'}`,
              boxShadow: mode === 'dark'
                ? '0 -2px 12px rgba(0, 0, 0, 0.3)'
                : '0 -2px 8px rgba(0, 0, 0, 0.1)',
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
