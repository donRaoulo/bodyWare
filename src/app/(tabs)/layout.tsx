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
          p: { xs: 2, sm: 3, lg: 4 },
          pb: { xs: 11, md: 4 }, // Account for bottom nav on mobile
          maxWidth: 1220,
          mx: 'auto',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
