import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    surface: {
      main: string;
      variant: string;
    };
    border: {
      main: string;
      thick: string;
    };
  }

  interface PaletteOptions {
    surface?: {
      main: string;
      variant: string;
    };
    border?: {
      main: string;
      thick: string;
    };
  }
}

export {};
