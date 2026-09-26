import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/jetbrains-mono/500.css'
import './index.css'
import '@configs/i18n'
import theme from '@configs/MUI.config'
import Library from '@pages/Library'
import NotFound from '@pages/NotFound'
import RootLayout from '@pages/RootLayout'
import CssBaseline from '@mui/material/CssBaseline'
import GlobalStyles from '@mui/material/GlobalStyles'
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles'
import { queryClient } from '@services/rootApi'
import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'

// The player and notebook are only needed after navigation; keep them out of the first load.
const Player = lazy(() => import('@pages/Player'))
const Notebook = lazy(() => import('@pages/Notebook'))
const Catalog = lazy(() => import('@pages/Catalog'))

// Declarative <BrowserRouter> (not createBrowserRouter): its navigations update state synchronously
// inside our startTransition, so addTransitionType reaches the page view transitions.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StyledEngineProvider enableCssLayer>
      <GlobalStyles styles="@layer theme, base, mui, components, utilities;" />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme} defaultMode="light">
          <CssBaseline enableColorScheme />
          <BrowserRouter>
            <Routes>
              <Route element={<RootLayout />}>
                <Route path="/" element={<Library />} />
                <Route path="/watch/:id" element={<Player />} />
                <Route path="/lessons" element={<Catalog />} />
                <Route path="/notebook" element={<Notebook />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </StyledEngineProvider>
  </StrictMode>,
)
