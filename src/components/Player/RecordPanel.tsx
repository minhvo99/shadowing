import { useT } from '@hooks'
import type { Video } from '@libs/db'
import MicRounded from '@mui/icons-material/MicRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import StopRounded from '@mui/icons-material/StopRounded'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import { useRecording } from '@services/videoAPI'
import { waveform } from '@utils/waveform'
import { useQuery } from '@tanstack/react-query'

function RecordPanel({ video, idx, recording, onToggleRec, onReplay }: { video: Video; idx: number; recording: boolean; onToggleRec: () => void; onReplay: () => void }) {
  const t = useT()
  const blob = useRecording(video.id, idx).data
  const bars = useQuery({
    queryKey: ['waveform', video.id, idx, blob?.size],
    enabled: !!blob,
    queryFn: () => waveform(blob!),
  }).data

  return (
    <Paper sx={{ borderRadius: 4, px: 2.5, py: 2.25, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>{t.recTitle}</Typography>
        <Button
          variant="contained"
          color={recording ? 'inherit' : 'secondary'}
          onClick={onToggleRec}
          aria-pressed={recording}
          startIcon={recording ? <StopRounded /> : <MicRounded />}
          sx={{ borderRadius: 999, px: 2, ...(recording && { bgcolor: 'text.primary', color: 'background.default' }) }}
        >
          {recording ? t.stop : t.rec}
        </Button>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr) 44px', gap: '10px 14px', alignItems: 'center' }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{t.original}</Typography>
        <Typography sx={{ fontSize: 14, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.lines[idx]?.text}</Typography>
        <IconButton aria-label={t.playOriginal} onClick={onReplay} sx={{ border: 1.5, borderColor: 'divider' }}><PlayArrowRounded fontSize="small" /></IconButton>

        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{t.you}</Typography>
        <Box sx={{ height: 44, display: 'flex', alignItems: 'center', gap: '3px' }}>
          {bars ? (
            bars.map((b, i) => <Box key={i} sx={{ flexGrow: 1, height: `${Math.max(8, b * 100)}%`, borderRadius: '2px', bgcolor: 'secondary.main' }} />)
          ) : (
            <Typography variant="body2" color="text.secondary">{t.noRecording}</Typography>
          )}
        </Box>
        <IconButton
          aria-label={t.playMine}
          disabled={!blob}
          onClick={() => {
            const url = URL.createObjectURL(blob!)
            const a = new Audio(url)
            a.onended = () => URL.revokeObjectURL(url)
            a.play()
          }}
          sx={{ border: 1.5, borderColor: 'divider' }}
        >
          <PlayArrowRounded fontSize="small" />
        </IconButton>
      </Box>
    </Paper>
  )
}

export default RecordPanel
