import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import '@fontsource/jetbrains-mono/500.css'
import './transitions.css'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, StrictMode, Suspense, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Header } from './components/Header'
import { useT } from './i18n'
import { Library } from './pages/Library'
import { queryClient } from './queries'
import { useSettings } from './settings'
import { theme } from './theme'

// The player and notebook are only needed after navigation; keep them out of the first load.
const Player = lazy(() => import('./pages/Player'))
const Notebook = lazy(() => import('./pages/Notebook'))

function NotFound() {
  return <main style={{ padding: 80 }}>{useT().notFoundPage}</main>
}

function App() {
  const { lang } = useSettings()
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <>
      <Header />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/watch/:id" element={<Player />} />
          <Route path="/notebook" element={<Notebook />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme} defaultMode="light">
        <CssBaseline enableColorScheme />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
