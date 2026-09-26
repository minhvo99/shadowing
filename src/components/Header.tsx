import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import { useColorScheme } from '@mui/material/styles'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import { NavLink } from 'react-router'
import { useT } from '@hooks'
import { MONO } from '@libs/constants'
import { useSettings, useUpdateSettings, type Lang } from '@services/settingAPI'

function Logo() {
  return (
    <Box component={NavLink} to="/" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontWeight: 700, fontSize: 19, letterSpacing: '-0.02em', color: 'text.primary', textDecoration: 'none' }}>
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" strokeLinecap="round" strokeWidth="2.4" aria-hidden>
        <path d="M4 15h2M9 9v12M14 5v20M19 10v10M24 13v4" stroke="currentColor" />
        <path d="M7 18h2M12 13v10M17 9v18M22 14v8M27 16v4" stroke="var(--mui-palette-primary-main)" opacity="0.6" />
      </svg>
      <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Shadowing Studio</Box>
    </Box>
  )
}

const linkSx = {
  display: 'flex',
  alignItems: 'center',
  color: 'text.secondary',
  textDecoration: 'none',
  borderBottom: '2px solid transparent',
  '&.active': { color: 'text.primary', borderBottomColor: 'currentColor' },
} as const

function Header() {
  const t = useT()
  const { lang } = useSettings()
  const update = useUpdateSettings()
  const { mode, systemMode, setMode } = useColorScheme()
  const dark = (mode === 'system' ? systemMode : mode) === 'dark'

  return (
    <Box component="header" sx={{ height: 72, px: { xs: 2, md: 10 }, display: 'flex', alignItems: 'center', gap: { xs: 2, md: 6 }, borderBottom: 1, borderColor: 'divider' }}>
      <Logo />
      <Box component="nav" aria-label={t.navLabel} sx={{ display: 'flex', gap: { xs: 2, md: 4 }, alignSelf: 'stretch', fontSize: 15, fontWeight: 500 }}>
        <Box component={NavLink} to="/" end sx={linkSx}>{t.library}</Box>
        <Box component={NavLink} to="/notebook" sx={linkSx}>{t.notebook}</Box>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <ToggleButtonGroup
        exclusive
        size="small"
        value={lang}
        aria-label={t.langLabel}
        onChange={(_, v: Lang | null) => v && update({ lang: v })}
      >
        {(['vi', 'en'] as const).map((l) => (
          <ToggleButton key={l} value={l} sx={{ fontFamily: MONO, fontSize: 13, minWidth: 46 }}>{l.toUpperCase()}</ToggleButton>
        ))}
      </ToggleButtonGroup>
      <Tooltip title={t.themeLabel}>
        <IconButton aria-label={t.themeLabel} aria-pressed={dark} onClick={() => setMode(dark ? 'light' : 'dark')} sx={{ border: 1.5, borderColor: 'divider', borderRadius: 3 }}>
          {dark ? <LightModeOutlined /> : <DarkModeOutlined />}
        </IconButton>
      </Tooltip>
    </Box>
  )
}

export default Header
