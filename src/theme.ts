import { createTheme } from '@mui/material/styles'

declare module '@mui/material/styles' {
  interface Palette {
    sunken: string
    accentSoft: string
  }
  interface PaletteOptions {
    sunken?: string
    accentSoft?: string
  }
}

export const MONO = '"JetBrains Mono", ui-monospace, monospace'

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#0E6B5C', contrastText: '#FFFFFF' },
        secondary: { main: '#C2410C', contrastText: '#FFFFFF' },
        background: { default: '#F3EFE6', paper: '#FFFFFF' },
        text: { primary: '#1B1B18', secondary: '#5E5A52' },
        divider: '#DDD6C8',
        sunken: '#E7E0D1',
        accentSoft: '#E1EEEA',
      },
    },
    dark: {
      palette: {
        primary: { main: '#4CC2AB', contrastText: '#0B1F1B' },
        secondary: { main: '#F08A55', contrastText: '#1E0F06' },
        background: { default: '#131311', paper: '#1C1B18' },
        text: { primary: '#EDE8DE', secondary: '#A8A196' },
        divider: '#36332D',
        sunken: '#26241F',
        accentSoft: '#1C3832',
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Be Vietnam Pro", system-ui, sans-serif',
    h1: { fontSize: 'clamp(2rem, 4vw, 2.875rem)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.08 },
    h2: { fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.01em' },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 44 } } },
    MuiIconButton: { styleOverrides: { root: { width: 44, height: 44 } } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600, minHeight: 48 } } },
    MuiToggleButton: { styleOverrides: { root: { textTransform: 'none', border: 0, borderRadius: 8, minHeight: 38 } } },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: ({ theme }) => ({ padding: 3, gap: 2, borderRadius: 11, backgroundColor: theme.vars.palette.sunken }),
        grouped: ({ theme }) => ({
          border: 0,
          borderRadius: '8px !important',
          '&.Mui-selected, &.Mui-selected:hover': { backgroundColor: theme.vars.palette.background.paper, color: theme.vars.palette.text.primary },
        }),
      },
    },
  },
})
