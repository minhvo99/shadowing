import Controls from '@components/Player/Controls'
import DictionaryPanel from '@components/Player/DictionaryPanel'
import NoSubtitles from '@components/Player/NoSubtitles'
import NotesPanel from '@components/Player/NotesPanel'
import RecordPanel from '@components/Player/RecordPanel'
import Timeline from '@components/Player/Timeline'
import TranscriptPanel from '@components/Player/TranscriptPanel'
import Words from '@components/Player/Words'
import PageTransition from '@components/PageTransition'
import TypedLink from '@components/TypedLink'
import { useKaraoke, useRecorder, useShadowing, useT, useYouTubePlayer } from '@hooks'
import { MONO } from '@libs/constants'
import type { Video } from '@libs/db'
import { formatTime, wordKey } from '@libs/text'
import ArrowBack from '@mui/icons-material/ArrowBack'
import MicRounded from '@mui/icons-material/MicRounded'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useNotes } from '@services/notebookAPI'
import { useSettings, useUpdateSettings } from '@services/settingAPI'
import { usePatchVideo, useSaveRecording, useVideo } from '@services/videoAPI'
import { useEffect, useRef, useState, ViewTransition } from 'react'
import { useParams, useSearchParams } from 'react-router'

const PlayerPage = () => {
  const { id = '' } = useParams()
  const t = useT()
  const { data: video, error } = useVideo(id)

  return (
    <PageTransition>
      <Box component="main" sx={{ px: { xs: 2, md: 10 }, py: 3.5, maxWidth: 1600, mx: 'auto' }}>
        <TypedLink to="/" type="nav-back" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, textDecoration: 'none', color: 'var(--mui-palette-primary-main)', marginBottom: 16 }}>
          <ArrowBack sx={{ fontSize: 16 }} /> {t.back}
        </TypedLink>
        {error ? (
          <Typography color="secondary.main">{t.loadFailed}: {error.message}</Typography>
        ) : !video ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 6 }}>
            <CircularProgress size={24} /> {t.loadingVideo}
          </Box>
        ) : (
          <Session key={`${video.id}:${video.lines.length}`} video={video} />
        )}
      </Box>
    </PageTransition>
  )
}

type PanelTab = 'transcript' | 'notes' | 'dict'

function Session({ video }: { video: Video }) {
  const t = useT()
  const settings = useSettings()
  const update = useUpdateSettings()
  const patch = usePatchVideo(video.id)
  const [params] = useSearchParams()
  const [idx, setIdx] = useState(() => {
    const s = params.has('s') ? Number(params.get('s')) : NaN
    return Number.isInteger(s) && s >= 0 && s < video.lines.length ? s : Math.min(video.lastIdx, Math.max(0, video.lines.length - 1))
  })
  const [tab, setTab] = useState<PanelTab>('transcript')
  const [word, setWord] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const noteInput = useRef<HTMLTextAreaElement>(null)
  const noteCount = useNotes().data?.filter((n) => n.videoId === video.id).length ?? 0

  const { containerRef, player, playing } = useYouTubePlayer(video.id)
  const lines = video.lines
  const line = lines[idx]

  const { playLine, toggle, waiting, atEnd } = useShadowing({
    player,
    lines,
    idx,
    setIdx,
    settings,
    onSentenceDone: (i) => patch.mutate((v) => ({ done: v.done.includes(i) ? v.done : [...v.done, i] })),
  })

  // Opening a video saves it to the library; remember the sentence as it changes.
  useEffect(() => {
    patch.mutate(() => ({ lastIdx: idx, openedAt: Date.now() }))
  }, [idx])

  const saveRec = useSaveRecording(video.id)
  const recorder = useRecorder(
    (blob) => saveRec.mutate({ idx, blob }),
    () => setToast(t.micDenied),
  )

  const lookUp = (w: string) => {
    const k = wordKey(w)
    if (!k) return
    setWord(k)
    setTab('dict')
    setRecent((r) => [k, ...r.filter((x) => x !== k)].slice(0, 8))
  }

  // Keyboard shortcuts; skipped while typing.
  const keysRef = useRef({ toggle, playLine, idx, playing, recorder, settings })
  keysRef.current = { toggle, playLine, idx, playing, recorder, settings }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest('input, textarea, [contenteditable="true"]')) return
      const k = keysRef.current
      const actions: Record<string, () => void> = {
        ' ': () => k.toggle(k.playing),
        ArrowLeft: () => k.playLine(k.idx - 1),
        ArrowRight: () => k.playLine(k.idx + 1),
        l: () => update({ loop: !k.settings.loop }),
        p: () => update({ autoPause: !k.settings.autoPause }),
        c: () => update({ overlay: !k.settings.overlay }),
        r: () => k.recorder.toggle(),
        n: () => {
          setTab('notes')
          requestAnimationFrame(() => noteInput.current?.focus())
        },
      }
      const action = actions[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (action && !(e.key === ' ' && el.closest('button, a, [role="tab"]'))) {
        e.preventDefault()
        action()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [update])

  const blind = settings.view === 'blind'
  const karaoke = useKaraoke(player, line, settings.view === 'karaoke', playing && !waiting, settings.speed)

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 460px' }, gap: 3.5, alignItems: 'start' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25, minWidth: 0 }}>
        <ViewTransition name={`video-${video.id}`} share="morph">
          <Box sx={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: 4, overflow: 'hidden', bgcolor: '#0A0A09', containerType: 'inline-size' }}>
            <Box ref={containerRef} sx={{ position: 'absolute', inset: 0, '& iframe': { width: '100%', height: '100%', border: 0 } }} />
            {line && settings.overlay ? (
              // Sized to the video (cqw) and kept above YouTube's control bar.
              <Box sx={{ position: 'absolute', left: '50%', bottom: '14%', transform: 'translateX(-50%)', width: 'max-content', maxWidth: '82%', px: 1.25, py: 0.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,.72)', color: '#fff', textAlign: 'center', fontSize: 'clamp(12px, 2.3cqw, 19px)', lineHeight: 1.35 }}>
                {blind ? (
                  <Typography sx={{ color: '#BDB8AE', fontWeight: 500, fontSize: 'inherit' }}>{t.subHidden}</Typography>
                ) : (
                  <Words text={line.text} selected={word} onPick={lookUp} karaoke={karaoke} sx={{ fontSize: 'inherit', fontWeight: 500 }} overlay />
                )}
              </Box>
            ) : null}
            {waiting || atEnd ? (
              <Box role="status" sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderRadius: 999, bgcolor: 'secondary.main', color: 'secondary.contrastText', fontWeight: 600, fontSize: 14 }}>
                <MicRounded fontSize="small" /> {waiting ? t.yourTurn : t.pausedAtEnd}
              </Box>
            ) : null}
          </Box>
        </ViewTransition>

        {lines.length ? (
          <>
            <Timeline lines={lines} idx={idx} done={video.done} onPick={playLine} />
            <Controls idx={idx} total={lines.length} playing={playing && !waiting} onToggle={() => toggle(playing)} onPlayLine={playLine} />
            <RecordPanel video={video} idx={idx} recording={recorder.recording} onToggleRec={recorder.toggle} onReplay={() => playLine(idx)} />
          </>
        ) : (
          <NoSubtitles video={video} />
        )}
      </Box>

      <Paper component="aside" sx={{ borderRadius: 4, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: { lg: 'sticky' }, top: 16, height: { xs: 640, lg: 'calc(100vh - 72px - 56px)' }, minHeight: 520 }}>
        <Box sx={{ px: 2.5, pt: 2.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3 }}>{video.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {[video.author, video.duration ? formatTime(video.duration) : '', `${video.done.length}/${lines.length} ${t.sentences}`].filter(Boolean).join(' · ')}
          </Typography>
          <Tabs value={tab} onChange={(_, v: PanelTab) => setTab(v)} variant="fullWidth" aria-label={t.panel} textColor="inherit" slotProps={{ indicator: { sx: { bgcolor: 'text.primary' } } }} sx={{ mt: 1 }}>
            <Tab value="transcript" label={t.tTranscript} />
            <Tab value="notes" label={noteCount ? `${t.tNotes} · ${noteCount}` : t.tNotes} />
            <Tab value="dict" label={t.tDict} />
          </Tabs>
        </Box>
        {tab === 'transcript' ? (
          <TranscriptPanel lines={lines} idx={idx} done={video.done} word={word} karaoke={karaoke} onPick={playLine} onWord={lookUp} />
        ) : tab === 'notes' ? (
          <NotesPanel video={video} idx={idx} inputRef={noteInput} onJump={playLine} />
        ) : (
          <DictionaryPanel word={word} recent={recent} onWord={lookUp} video={video} idx={idx} />
        )}
        <Box sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 1.75, flexWrap: 'wrap', fontSize: 12, color: 'text.secondary' }}>
          {([['Space', t.keys.play], ['← →', t.keys.nav], ['L', t.keys.loop], ['P', t.keys.pause], ['C', t.keys.overlay], ['R', t.keys.rec], ['N', t.keys.note]] as const).map(([k, label]) => (
            <span key={k}>
              <Box component="kbd" sx={{ fontFamily: MONO, border: 1, borderColor: 'divider', borderRadius: 1, px: 0.75, color: 'text.primary' }}>{k}</Box> {label}
            </span>
          ))}
        </Box>
      </Paper>
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Box>
  )
}

export default PlayerPage
