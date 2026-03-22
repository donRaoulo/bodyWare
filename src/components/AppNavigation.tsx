'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Toolbar,
  AppBar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  FitnessCenter as FitnessIcon,
  Straighten as BodyIcon,
  Person as ProfileIcon,
} from '@mui/icons-material';
import { useNavigationGuard } from './NavigationGuardProvider';

interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    icon: <DashboardIcon />,
  },
  {
    id: 'trainings',
    label: 'Workouts',
    href: '/trainings',
    icon: <FitnessIcon />,
  },
  {
    id: 'body',
    label: 'Body',
    href: '/body',
    icon: <BodyIcon />,
  },
  {
    id: 'profile',
    label: 'Profil',
    href: '/profile',
    icon: <ProfileIcon />,
  },
];

export function AppNavigation() {
  const theme = useTheme();
  const pathname = usePathname();
  const { requestNavigation } = useNavigationGuard();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/signup');

  // Get current active tab
  const activeTab =
    navigationItems.find(item =>
      pathname === item.href || pathname.startsWith(item.href + '/')
    )?.id
    // treat workout sessions and measurements as trainings/body
    || (pathname?.startsWith('/start-workout') ? 'trainings'
      : pathname?.startsWith('/measurements') ? 'body'
        : 'dashboard');

  // Add bottom padding on mobile so content isn't hidden behind bottom nav
  useEffect(() => {
    if (!isMobile || isAuthPage) return;
    const original = document.body.style.paddingBottom;
    document.body.style.paddingBottom = '72px';
    return () => {
      document.body.style.paddingBottom = original;
    };
  }, [isMobile, isAuthPage]);

  if (isAuthPage) {
    return null;
  }

  const handleNavigation = (href: string) => {
    requestNavigation(href);
  };

  // Mobile: Bottom navigation
  if (isMobile) {
    return (
      <BottomNavigation
        value={activeTab}
        onChange={(_, newValue) => {
          const item = navigationItems.find(navItem => navItem.id === newValue);
          if (item) {
            handleNavigation(item.href);
          }
        }}
        sx={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          right: 8,
          maxWidth: 560,
          mx: 'auto',
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          zIndex: theme.zIndex.appBar,
        }}
      >
        {navigationItems.map((item) => (
          <BottomNavigationAction
            key={item.id}
            value={item.id}
            label={item.label}
            icon={item.icon}
            sx={{
              '&.Mui-selected': {
                color: theme.palette.primary.main,
                '& .MuiSvgIcon-root': {
                  transform: 'translateY(-1px)',
                },
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                '&.Mui-selected': {
                  fontSize: '0.875rem',
                  fontWeight: 600,
                },
              },
              '& .MuiSvgIcon-root': {
                transition: 'transform 180ms ease',
              },
            }}
          />
        ))}
      </BottomNavigation>
    );
  }

  // Desktop: Side navigation (app bar with menu items)
  return (
    <>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: '-0.01em' }}
          >
            BodyWare
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {navigationItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <Button
                  key={item.id}
                  color="inherit"
                  onClick={() => handleNavigation(item.href)}
                  startIcon={item.icon}
                  sx={{
                    borderRadius: 3,
                    px: 1.5,
                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'white' : 'text.primary',
                    border: isActive ? 'none' : '1px solid',
                    borderColor: isActive ? 'transparent' : 'divider',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
        </Toolbar>
      </AppBar>
    </>
  );
}

