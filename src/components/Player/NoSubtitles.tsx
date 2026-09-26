import SubtitleImport from '@components/SubtitleImport'
import { useT } from '@hooks'
import type { Video } from '@libs/db'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'

function NoSubtitles({ video }: { video: Video }) {
  const t = useT()
  return (
    <Paper sx={{ borderRadius: 4, p: 3, display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 18, width: '100%' }}>{t.noSubsTitle}</Typography>
      <Typography color="text.secondary" sx={{ width: '100%' }}>{t.noSubsBody}</Typography>
      <SubtitleImport video={video} />
    </Paper>
  )
}

export default NoSubtitles
