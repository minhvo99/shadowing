import BookmarkBorder from '@mui/icons-material/BookmarkBorder'
import Bookmark from '@mui/icons-material/Bookmark'
import CheckRounded from '@mui/icons-material/CheckRounded'
import Close from '@mui/icons-material/Close'
import DeleteOutline from '@mui/icons-material/DeleteOutlined'
import ErrorOutline from '@mui/icons-material/ErrorOutlined'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
import LinkRounded from '@mui/icons-material/LinkRounded'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import LinearProgress from '@mui/material/LinearProgress'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import { startTransition, useMemo, useState, ViewTransition } from 'react'
import { useT, type Strings } from '../i18n'
import { exportBackup, type Video } from '../lib/db'
import { download } from '../lib/download'
import { SubtitleImport } from '../components/SubtitleImport'
import { formatTime, parseYouTubeId, thumb } from '../lib/text'
import { PageTransition, TypedLink, useNavigateWithType } from '../nav'
import { useDeleteVideo, useImportBackup, useLibrary, useNotes, useSaveVideo, useVideo, useWords } from '../queries'
import { useSettings } from '../settings'
import { MONO } from '../theme'

export function Library() {
  const t = useT()
  const [url, setUrl] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const id = parseYouTubeId(url)
  const empty = !url.trim()
  const library = useLibrary().data ?? []
  const inLibrary = !!id && library.some((v) => v.id === id)
  const go = useNavigateWithType()

  const paste = async () => {
    try {
      setUrl(await navigator.clipboard.readText())
    } catch {
      /* clipboard permission denied: the user can still paste manually */
    }
  }

  return (
    <PageTransition>
      <Box component="main" sx={{ px: { xs: 2, md: 10 }, pt: { xs: 4, md: 7 }, pb: 7, display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 1440, mx: 'auto' }}>
        <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="h1" sx={{ maxWidth: 860 }}>{t.headline}</Typography>
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault()
              if (id) go(`/watch/${id}`, 'nav-forward')
            }}
            sx={{ display: 'flex', gap: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}
          >
            <Paper
              component="label"
              sx={{ flexGrow: 1, minWidth: 0, height: 62, display: 'flex', alignItems: 'center', gap: 1.5, pl: 2.5, pr: 1, border: 1.5, borderColor: !empty && !id ? 'secondary.main' : 'text.primary', borderRadius: 3.5 }}
            >
              <LinkRounded />
              <InputBase
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=…"
                inputProps={{ 'aria-label': t.urlLabel, inputMode: 'url' }}
                sx={{ flexGrow: 1, fontFamily: MONO, fontSize: 16 }}
              />
              {!empty ? (
                <IconButton aria-label={t.clear} onClick={() => setUrl('')}>
                  <Close fontSize="small" />
                </IconButton>
              ) : null}
              <Button onClick={paste} sx={{ bgcolor: 'background.default', color: 'text.primary', px: 2 }}>{t.paste}</Button>
            </Paper>
            <Button type="submit" variant="contained" disabled={!id} sx={{ height: 62, px: 4.25, borderRadius: 3.5, fontSize: 16 }}>{t.open}</Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', gap: 1.25, flexWrap: 'wrap', fontSize: 13 }}>
            <b>{t.accepts}</b>
            {['youtube.com/watch?v=…', 'youtu.be/…', 'youtube.com/shorts/…'].map((f) => (
              <Box key={f} component="span" sx={{ fontFamily: MONO }}>{f} ·</Box>
            ))}
            <span>{t.orId}</span>
          </Typography>

          {id ? (
            <PreviewCard id={id} shared={!inLibrary} />
          ) : empty ? (
            <Box sx={{ p: 2.5, border: '1.5px dashed', borderColor: 'divider', borderRadius: 4, color: 'text.secondary' }}>{t.emptyHint}</Box>
          ) : (
            <Alert severity="error" variant="outlined" icon={<ErrorOutline />} sx={{ borderRadius: 4, bgcolor: 'background.paper' }}>
              <b>{t.invalidTitle}</b>
              <br />
              {t.invalidBody}
            </Alert>
          )}
        </Box>

        <LibraryGrid videos={library} />
        <StorageStrip onMessage={setToast} />
      </Box>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </PageTransition>
  )
}

function captionsLabel(t: Strings, c: Video['captions']) {
  return { manual: t.captionsManual, auto: t.captionsAuto, none: t.captionsNone, file: t.captionsFile }[c]
}

function PreviewCard({ id, shared }: { id: string; shared: boolean }) {
  const t = useT()
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
            <Typography color="text.secondary">{t.loadingVideo}</Typography>
          </>
        ) : error || !video ? (
          <Typography color="secondary.main">{t.loadFailed}: {error?.message}</Typography>
        ) : (
          <>
            <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>{video.title}</Typography>
            <Typography color="text.secondary">{[video.author, video.duration ? formatTime(video.duration) : ''].filter(Boolean).join(' · ')}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 14, color: video.captions === 'none' ? 'secondary.main' : 'text.primary' }}>
              {video.captions === 'none' ? <InfoOutlined fontSize="small" /> : <CheckRounded fontSize="small" color="primary" />}
              {captionsLabel(t, video.captions)}
              {video.lines.length ? ` · ${video.lines.length} ${t.sentences}` : ''}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25, mt: 0.75, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => save.mutate({ ...video, openedAt: Date.now() }, { onSuccess: () => go(`/watch/${id}`, 'nav-forward') })}
              >
                {saved ? t.continue : t.start}
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
                {saved ? t.added : t.add}
              </Button>
              {video.captions === 'none' ? <SubtitleImport video={video} onSaved={() => go(`/watch/${id}`, 'nav-forward')} /> : null}
            </Box>
          </>
        )}
      </Box>
    </Paper>
  )
}

function LibraryGrid({ videos }: { videos: Video[] }) {
  const t = useT()
  const { lang } = useSettings()
  const notes = useNotes().data
  const words = useWords().data
  const del = useDeleteVideo()

  // One pass over notes/words instead of filtering per card.
  const notesBy = useMemo(() => Map.groupBy(notes ?? [], (n) => n.videoId), [notes])
  const wordsBy = useMemo(() => Map.groupBy(words ?? [], (w) => w.videoId), [words])

  const rtf = useMemo(() => new Intl.RelativeTimeFormat(lang, { numeric: 'auto' }), [lang])
  const when = (v: Video) => {
    if (v.lines.length && v.done.length >= v.lines.length) return t.completed
    if (!v.done.length) return t.notStarted
    const days = Math.round((v.openedAt - Date.now()) / 86_400_000)
    return rtf.format(days, 'day')
  }

  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
        <Typography variant="h2">{t.yourLib}</Typography>
        <Typography sx={{ fontFamily: MONO, fontSize: 13, color: 'text.secondary' }}>{videos.length} {t.videos}</Typography>
      </Box>
      {videos.length ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 3 }}>
          {videos.map((v) => {
            const c = { notes: notesBy.get(v.id)?.length ?? 0, words: wordsBy.get(v.id)?.length ?? 0 }
            const pct = v.lines.length ? (v.done.length / v.lines.length) * 100 : 0
            return (
              <ViewTransition key={v.id}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, minWidth: 0 }}>
                  <TypedLink to={`/watch/${v.id}`} type="nav-forward" style={{ color: 'inherit', textDecoration: 'none' }}>
                    <Box sx={{ position: 'relative', borderRadius: 3.5, overflow: 'hidden', '&:hover img': { transform: 'scale(1.03)' } }}>
                      <ViewTransition name={`video-${v.id}`} share="morph">
                        <Box component="img" src={thumb(v.id)} alt="" loading="lazy" sx={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', bgcolor: 'sunken', transition: 'transform .2s' }} />
                      </ViewTransition>
                      {v.duration ? (
                        <Box sx={{ position: 'absolute', right: 10, top: 10, fontFamily: MONO, fontSize: 12, color: '#fff', bgcolor: 'rgba(0,0,0,.72)', borderRadius: 1.5, px: 0.875, py: 0.375 }}>{formatTime(v.duration)}</Box>
                      ) : null}
                      <LinearProgress variant="determinate" value={pct} aria-label={`${Math.round(pct)}%`} sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 5, bgcolor: 'rgba(255,255,255,.25)', '& .MuiLinearProgress-bar': { bgcolor: '#F3EFE6' } }} />
                    </Box>
                    <Typography sx={{ mt: 1.5, fontWeight: 600, lineHeight: 1.35 }}>{v.title}</Typography>
                  </TypedLink>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        {v.done.length}/{v.lines.length} {t.sentences} · {c.notes} {t.notes} · {c.words} {t.words}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: pct >= 100 ? 'primary.main' : 'text.secondary' }}>{when(v)}</Typography>
                    </Box>
                    <IconButton
                      aria-label={`${t.deleteVideo}: ${v.title}`}
                      onClick={() => {
                        if (confirm(t.deleteConfirm)) startTransition(() => del.mutate(v.id))
                      }}
                      sx={{ color: 'text.secondary', mt: -1 }}
                    >
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </ViewTransition>
            )
          })}
        </Box>
      ) : (
        <Box sx={{ p: 4, border: '1.5px dashed', borderColor: 'divider', borderRadius: 4, color: 'text.secondary' }}>{t.libEmpty}</Box>
      )}
    </Box>
  )
}

function StorageStrip({ onMessage }: { onMessage: (m: string) => void }) {
  const t = useT()
  const importBackup = useImportBackup()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, px: 2.5, border: '1.5px dashed', borderColor: 'divider', borderRadius: 3.5, flexWrap: 'wrap' }}>
      <StorageOutlined sx={{ color: 'text.secondary' }} />
      <Box sx={{ flex: '1 1 320px' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t.storeTitle}</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t.storeBody}</Typography>
      </Box>
      <Button
        variant="outlined"
        color="inherit"
        sx={{ borderColor: 'divider' }}
        onClick={async () => download(await exportBackup(), `shadowing-backup-${new Date().toISOString().slice(0, 10)}.json`)}
      >
        {t.export}
      </Button>
      <Button component="label">
        {t.import}
        <input
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) importBackup.mutate(file, { onSuccess: () => onMessage(t.imported), onError: () => onMessage(t.importFailed) })
          }}
        />
      </Button>
    </Box>
  )
}
