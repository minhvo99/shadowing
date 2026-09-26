import { DELAYS, MONO, SPEEDS } from '@libs/constants'
import PauseCircleOutlineRounded from '@mui/icons-material/PauseCircleOutlineRounded'
import PauseRounded from '@mui/icons-material/PauseRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import RepeatRounded from '@mui/icons-material/RepeatRounded'
import SkipNextRounded from '@mui/icons-material/SkipNextRounded'
import SkipPreviousRounded from '@mui/icons-material/SkipPreviousRounded'
import SubtitlesOffOutlined from '@mui/icons-material/SubtitlesOffOutlined'
import SubtitlesOutlined from '@mui/icons-material/SubtitlesOutlined'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useSettings, useUpdateSettings } from '@services/settingAPI'
import { useTranslation } from 'react-i18next'

const toggleSx = (on: boolean) => ({
  gap: 1,
  px: 1.75,
  fontWeight: 600,
  border: '1.5px solid',
  borderColor: on ? 'primary.main' : 'divider',
  borderRadius: 3,
  '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'accentSoft', color: 'text.primary' },
})

function Controls({ idx, total, playing, onToggle, onPlayLine }: { idx: number; total: number; playing: boolean; onToggle: () => void; onPlayLine: (i: number) => void }) {
  const { t } = useTranslation()
  const s = useSettings()
  const update = useUpdateSettings()
  const outlined = { border: 1.5, borderColor: 'divider', borderRadius: 3 }
  return (
    <Paper sx={{ borderRadius: 4, px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton aria-label={t('prev')} disabled={idx === 0} onClick={() => onPlayLine(idx - 1)} sx={outlined}><SkipPreviousRounded /></IconButton>
        <IconButton aria-label={playing ? t('pause') : t('play')} onClick={onToggle} sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}>
          {playing ? <PauseRounded /> : <PlayArrowRounded />}
        </IconButton>
        <IconButton aria-label={t('next')} disabled={idx >= total - 1} onClick={() => onPlayLine(idx + 1)} sx={outlined}><SkipNextRounded /></IconButton>
      </Box>
      <Divider orientation="vertical" flexItem />
      <ToggleButton value="loop" selected={s.loop} onChange={() => update({ loop: !s.loop })} sx={toggleSx(s.loop)}>
        <RepeatRounded fontSize="small" /> {t('loop')}
      </ToggleButton>
      <ToggleButton value="overlay" selected={s.overlay} onChange={() => update({ overlay: !s.overlay })} sx={toggleSx(s.overlay)}>
        {s.overlay ? <SubtitlesOutlined fontSize="small" /> : <SubtitlesOffOutlined fontSize="small" />} {t('overlay')}
      </ToggleButton>
      <ToggleButton value="autoPause" selected={s.autoPause} onChange={() => update({ autoPause: !s.autoPause })} sx={toggleSx(s.autoPause)}>
        <PauseCircleOutlineRounded fontSize="small" /> {t('autoPause')}
      </ToggleButton>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 14 }}>{t('gap')}</Box>
        <ToggleButtonGroup exclusive size="small" value={s.delay} aria-label={t('gap')} onChange={(_, v: number | null) => v !== null && update({ delay: v })}>
          {DELAYS.map((v) => (
            <ToggleButton key={v} value={v} sx={{ fontFamily: MONO, px: 1.25 }}>{v ? `${v}s` : t('off')}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <ToggleButtonGroup exclusive size="small" value={s.speed} aria-label={t('speed')} onChange={(_, v: number | null) => v && update({ speed: v })}>
        {SPEEDS.map((v) => (
          <ToggleButton key={v} value={v} sx={{ fontFamily: MONO, px: 1.5 }}>{v}×</ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Paper>
  )
}

export default Controls
