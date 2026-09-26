import { useT } from '@hooks'
import { MONO } from '@libs/constants'
import type { Video } from '@libs/db'
import { formatTime } from '@libs/text'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'

function Timeline({ lines, idx, done, onPick }: { lines: Video['lines']; idx: number; done: number[]; onPick: (i: number) => void }) {
  const t = useT()
  const doneSet = new Set(done)
  return (
    <Box>
      <Box role="group" aria-label={t.sentence} sx={{ display: 'flex', gap: lines.length > 60 ? '1px' : '3px', height: 12 }}>
        {lines.map((l, i) => (
          <ButtonBase
            key={i}
            aria-label={`${t.sentence} ${i + 1}`}
            aria-current={i === idx}
            onClick={() => onPick(i)}
            sx={{ flex: `${Math.max(0.3, l.end - l.start)} 1 0`, borderRadius: '3px', bgcolor: i === idx ? 'primary.main' : doneSet.has(i) ? 'primary.main' : 'divider', opacity: i !== idx && doneSet.has(i) ? 0.4 : 1 }}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, fontFamily: MONO, fontSize: 12, color: 'text.secondary' }}>
        <span>
          {t.sentence} {idx + 1} / {lines.length} · {formatTime(lines[idx].start)}–{formatTime(lines[idx].end)}
        </span>
        <span>{formatTime(lines[lines.length - 1].end)}</span>
      </Box>
    </Box>
  )
}

export default Timeline
