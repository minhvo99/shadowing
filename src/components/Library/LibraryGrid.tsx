import TypedLink from '@components/TypedLink'
import { useT } from '@hooks'
import { MONO } from '@libs/constants'
import type { Video } from '@libs/db'
import { formatTime, thumb } from '@libs/text'
import DeleteOutline from '@mui/icons-material/DeleteOutlined'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { useNotes, useWords } from '@services/notebookAPI'
import { useSettings } from '@services/settingAPI'
import { useDeleteVideo } from '@services/videoAPI'
import { startTransition, useMemo, ViewTransition } from 'react'

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

export default LibraryGrid
