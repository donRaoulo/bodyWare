'use client';

import { useMediaQuery, useTheme, Box } from '@mui/material';

export default function TabLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        minHeight: '100vh',
        pt: isMobile ? 0 : 8, // Account for AppBar on desktop
      }}
    >
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          p: { xs: 2, sm: 3 },
          pb: { xs: 10, md: 3 }, // Account for bottom nav on mobile
        }}
      >
        {children}
      </Box>
    </Box>
  );
}