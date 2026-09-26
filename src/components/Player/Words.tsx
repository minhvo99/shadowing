import type { Karaoke } from '@hooks'
import { wordKey } from '@libs/text'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import { keyframes, type SxProps, type Theme } from '@mui/material/styles'

const fill = keyframes`to { background-position: 0 0; }`

/** Karaoke colouring: sung words filled, the current word fills left→right over its duration. */
function karaokeSx(i: number, k: Karaoke, overlay?: boolean) {
  const sung = overlay ? '#FFD166' : 'var(--mui-palette-primary-main)'
  const base = overlay ? '#FFFFFF' : 'var(--mui-palette-text-primary)'
  if (i < k.word) return { color: sung }
  if (i > k.word) return { color: base }
  return {
    color: 'transparent',
    backgroundImage: `linear-gradient(90deg, ${sung} 50%, ${base} 50%)`,
    backgroundSize: '200% 100%',
    backgroundPosition: '100% 0',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    animation: `${fill} ${k.dur}s linear forwards`,
    animationPlayState: k.running ? 'running' : 'paused',
  }
}

/** A sentence rendered as clickable words (for dictionary lookups), optionally karaoke-coloured. */
function Words({ text, selected, onPick, sx, overlay, karaoke }: { text: string; selected: string | null; onPick: (w: string) => void; sx?: SxProps<Theme>; overlay?: boolean; karaoke?: Karaoke }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: overlay ? 'center' : 'flex-start', ...sx }}>
      {text.split(/\s+/).map((tok, i) => {
        const on = !!selected && wordKey(tok) === selected
        return (
          <ButtonBase
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              onPick(tok)
            }}
            sx={{
              font: 'inherit',
              px: '4px',
              py: '1px',
              borderRadius: 1.5,
              lineHeight: 1.45,
              ...(overlay
                ? { color: on ? '#1B1B18' : '#fff', bgcolor: on ? '#F3EFE6' : 'transparent', '&:hover': { bgcolor: on ? '#F3EFE6' : 'rgba(255,255,255,.15)' } }
                : {
                    color: on ? 'primary.contrastText' : 'inherit',
                    bgcolor: on ? 'primary.main' : 'transparent',
                    textDecoration: 'underline dotted',
                    textDecorationColor: 'var(--mui-palette-text-secondary)',
                    textUnderlineOffset: 4,
                  }),
              ...(karaoke && !on && karaokeSx(i, karaoke, overlay)),
            }}
          >
            {tok}
          </ButtonBase>
        )
      })}
    </Box>
  )
}

export default Words
