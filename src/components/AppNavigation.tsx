'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  MonitorWeight as BodyIcon,
  Person as ProfileIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

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
    label: 'Trainings',
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
    label: 'Profile',
    href: '/profile',
    icon: <ProfileIcon />,
  },
];

export function AppNavigation() {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Get current active tab
  const activeTab = navigationItems.find(item =>
    pathname === item.href || pathname.startsWith(item.href + '/')
  )?.id || 'dashboard';

  const handleNavigation = (href: string) => {
    router.push(href);
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
          bottom: 0,
          left: 0,
          right: 0,
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
              },
              '& .MuiBottomNavigationAction-label': {
                fontSize: '0.75rem',
                '&.Mui-selected': {
                  fontSize: '0.875rem',
                  fontWeight: 600,
                },
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
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            FitFlex
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
                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'white' : 'inherit',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'primary.main',
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