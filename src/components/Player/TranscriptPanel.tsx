import { type Karaoke } from '@hooks'
import { MONO } from '@libs/constants'
import type { Video } from '@libs/db'
import { formatTime, maskText } from '@libs/text'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useSettings, useUpdateSettings, type View } from '@services/settingAPI'
import { useEffect, useRef } from 'react'
import Words from './Words'
import { useTranslation } from 'react-i18next'

function TranscriptPanel({ lines, idx, done, word, karaoke, onPick, onWord }: { lines: Video['lines']; idx: number; done: number[]; word: string | null; karaoke?: Karaoke; onPick: (i: number) => void; onWord: (w: string) => void }) {
  const { t } = useTranslation()
  const { view } = useSettings()
  const update = useUpdateSettings()
  const list = useRef<HTMLDivElement>(null)
  const active = useRef<HTMLDivElement>(null)
  const doneSet = new Set(done)
  const blind = view === 'blind'

  // Keep the current sentence in view without scrolling the whole page.
  useEffect(() => {
    const c = list.current
    const el = active.current
    if (c && el) c.scrollTo({ top: el.offsetTop - c.clientHeight / 3, behavior: 'smooth' })
  }, [idx])

  return (
    <>
      <Box sx={{ px: 2, pt: 1.75, pb: 1, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <ToggleButtonGroup exclusive fullWidth size="small" value={view} aria-label={t('modeLabel')} onChange={(_, v: View | null) => v && update({ view: v })}>
          <ToggleButton value="text">{t('mText')}</ToggleButton>
          <ToggleButton value="karaoke">{t('mKaraoke')}</ToggleButton>
          <ToggleButton value="blind">{t('mBlind')}</ToggleButton>
        </ToggleButtonGroup>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t('tapHint')}</Typography>
      </Box>
      <Box ref={list} sx={{ flexGrow: 1, overflow: 'auto', px: 1, pb: 1, position: 'relative' }}>
        {lines.map((l, i) =>
          i === idx ? (
            <Box key={i} ref={active} sx={{ display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr)', gap: 1.25, p: 1.5, borderRadius: 3, bgcolor: 'accentSoft' }}>
              <Box sx={{ fontFamily: MONO, fontSize: 12, color: 'primary.main', pt: 0.5 }}>{formatTime(l.start)}</Box>
              <Box>
                <Words text={l.text} selected={word} onPick={onWord} karaoke={karaoke} sx={{ fontSize: 15, fontWeight: 600, ml: '-4px' }} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>{doneSet.has(i) ? t('practiced') : t('notYet')}</Typography>
              </Box>
            </Box>
          ) : (
            <ButtonBase
              key={i}
              onClick={() => onPick(i)}
              // Long transcripts: let the browser skip layout for off-screen rows.
              sx={{ width: '100%', display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr)', gap: 1.25, p: 1.5, borderRadius: 3, textAlign: 'left', contentVisibility: 'auto', containIntrinsicSize: 'auto 64px', '&:hover': { bgcolor: 'background.default' } }}
            >
              <Box sx={{ fontFamily: MONO, fontSize: 12, color: 'text.secondary', pt: 0.375 }}>{formatTime(l.start)}</Box>
              <Box>
                <Typography sx={{ fontSize: 15, lineHeight: 1.45, color: blind ? 'text.secondary' : 'text.primary' }}>{blind ? maskText(l.text) : l.text}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>{doneSet.has(i) ? t('practiced') : t('notYet')}</Typography>
              </Box>
            </ButtonBase>
          ),
        )}
      </Box>
    </>
  )
}

export default TranscriptPanel
