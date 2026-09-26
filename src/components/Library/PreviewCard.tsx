import SubtitleImport from '@components/SubtitleImport'
import { useNavigateWithType } from '@hooks'
import { MONO } from '@libs/constants'
import type { Video } from '@libs/db'
import { formatTime, thumb } from '@libs/text'
import Bookmark from '@mui/icons-material/Bookmark'
import BookmarkBorder from '@mui/icons-material/BookmarkBorder'
import CheckRounded from '@mui/icons-material/CheckRounded'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import { useLibrary, useSaveVideo, useVideo } from '@services/videoAPI'
import { ViewTransition } from 'react'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'

function captionsLabel(t: TFunction, c: Video['captions']) {
  return { manual: t('captionsManual'), auto: t('captionsAuto'), none: t('captionsNone'), file: t('captionsFile') }[c]
}

function PreviewCard({ id, shared }: { id: string; shared: boolean }) {
  const { t } = useTranslation()
  const { data: video, isPending, error } = useVideo(id)
  const save = useSaveVideo()
  const go = useNavigateWithType()
  const saved = useLibrary().data?.some((v) => v.id === id) ?? false

  const image = <Box component="img" src={thumb(id)} alt="" sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 3, display: 'block', bgcolor: 'sunken' }} />

  return (
    <Paper sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 4.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '320px minmax(0, 1fr)' }, gap: 3.5, alignItems: 'center' }}>
      {shared ? <ViewTransition name={`video-${id}`} share="morph">{image}</ViewTransition> : image}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, minWidth: 0 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: 12, color: 'primary.main' }}>ID {id}</Typography>
        {isPending ? (
          <>
            <Skeleton width="70%" height={32} />
            <Typography color="text.secondary">{t('loadingVideo')}</Typography>
          </>
        ) : error || !video ? (
          <Typography color="secondary.main">{t('loadFailed')}: {error?.message}</Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{video.title}</Typography>
            <Typography color="text.secondary">{[video.author, video.duration ? formatTime(video.duration) : ''].filter(Boolean).join(' · ')}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 14, color: video.captions === 'none' ? 'secondary.main' : 'text.primary' }}>
              {video.captions === 'none' ? <InfoOutlined fontSize="small" /> : <CheckRounded fontSize="small" color="primary" />}
              {captionsLabel(t, video.captions)}
              {video.lines.length ? ` · ${video.lines.length} ${t('sentences')}` : ''}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25, mt: 0.75, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => save.mutate({ ...video, openedAt: Date.now() }, { onSuccess: () => go(`/watch/${id}`, 'nav-forward') })}
              >
                {saved ? t('continue') : t('start')}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                aria-pressed={saved}
                startIcon={saved ? <Bookmark /> : <BookmarkBorder />}
                disabled={saved}
                onClick={() => save.mutate(video)}
                sx={{ borderColor: 'divider' }}
              >
                {saved ? t('added') : t('add')}
              </Button>
              {video.captions === 'none' ? <SubtitleImport video={video} onSaved={() => go(`/watch/${id}`, 'nav-forward')} /> : null}
            </Box>
          </>
        )}
      </Box>
    </Paper>
  )
}

export default PreviewCard
