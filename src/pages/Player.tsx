import ArrowBack from '@mui/icons-material/ArrowBack'
import MicRounded from '@mui/icons-material/MicRounded'
import PauseRounded from '@mui/icons-material/PauseRounded'
import PauseCircleOutlineRounded from '@mui/icons-material/PauseCircleOutlineRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import RepeatRounded from '@mui/icons-material/RepeatRounded'
import SkipNextRounded from '@mui/icons-material/SkipNextRounded'
import SkipPreviousRounded from '@mui/icons-material/SkipPreviousRounded'
import StopRounded from '@mui/icons-material/StopRounded'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState, ViewTransition } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { SubtitleImport } from '../components/SubtitleImport'
import { DictionaryPanel, NotesPanel, TranscriptPanel, Words } from '../components/PlayerPanels'
import { useT } from '../i18n'
import type { Video } from '../lib/db'
import { useRecorder, waveform } from '../lib/recorder'
import { useKaraoke, useShadowing } from '../lib/shadowing'
import { formatTime, wordKey } from '../lib/text'
import { useYouTubePlayer } from '../lib/youtube-player'
import { PageTransition, TypedLink } from '../nav'
import { useNotes, usePatchVideo, useRecording, useSaveRecording, useVideo } from '../queries'
import { useSettings, useUpdateSettings } from '../settings'
import { MONO } from '../theme'

export default function PlayerPage() {
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
          <Box sx={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: 4, overflow: 'hidden', bgcolor: '#0A0A09' }}>
            <Box ref={containerRef} sx={{ position: 'absolute', inset: 0, '& iframe': { width: '100%', height: '100%', border: 0 } }} />
            {line ? (
              <Box sx={{ position: 'absolute', left: '50%', bottom: { xs: 12, md: 56 }, transform: 'translateX(-50%)', maxWidth: '86%', px: 1.75, py: 1, borderRadius: 2.5, bgcolor: 'rgba(0,0,0,.8)', color: '#fff', textAlign: 'center', pointerEvents: 'auto' }}>
                {blind ? (
                  <Typography sx={{ color: '#BDB8AE', fontWeight: 500 }}>{t.subHidden}</Typography>
                ) : (
                  <Words text={line.text} selected={word} onPick={lookUp} karaoke={karaoke} sx={{ fontSize: { xs: 16, md: 22 }, fontWeight: 500 }} overlay />
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
          {([['Space', t.keys.play], ['← →', t.keys.nav], ['L', t.keys.loop], ['P', t.keys.pause], ['R', t.keys.rec], ['N', t.keys.note]] as const).map(([k, label]) => (
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
  const t = useT()
  const s = useSettings()
  const update = useUpdateSettings()
  const outlined = { border: 1.5, borderColor: 'divider', borderRadius: 3 }
  return (
    <Paper sx={{ borderRadius: 4, px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton aria-label={t.prev} disabled={idx === 0} onClick={() => onPlayLine(idx - 1)} sx={outlined}><SkipPreviousRounded /></IconButton>
        <IconButton aria-label={playing ? t.pause : t.play} onClick={onToggle} sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}>
          {playing ? <PauseRounded /> : <PlayArrowRounded />}
        </IconButton>
        <IconButton aria-label={t.next} disabled={idx >= total - 1} onClick={() => onPlayLine(idx + 1)} sx={outlined}><SkipNextRounded /></IconButton>
      </Box>
      <Divider orientation="vertical" flexItem />
      <ToggleButton value="loop" selected={s.loop} onChange={() => update({ loop: !s.loop })} sx={toggleSx(s.loop)}>
        <RepeatRounded fontSize="small" /> {t.loop}
      </ToggleButton>
      <ToggleButton value="autoPause" selected={s.autoPause} onChange={() => update({ autoPause: !s.autoPause })} sx={toggleSx(s.autoPause)}>
        <PauseCircleOutlineRounded fontSize="small" /> {t.autoPause}
      </ToggleButton>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 14 }}>{t.gap}</Box>
        <ToggleButtonGroup exclusive size="small" value={s.delay} aria-label={t.gap} onChange={(_, v: number | null) => v !== null && update({ delay: v })}>
          {[0, 1, 1.5, 2, 3].map((v) => (
            <ToggleButton key={v} value={v} sx={{ fontFamily: MONO, px: 1.25 }}>{v ? `${v}s` : t.off}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ flexGrow: 1 }} />
      <ToggleButtonGroup exclusive size="small" value={s.speed} aria-label={t.speed} onChange={(_, v: number | null) => v && update({ speed: v })}>
        {[0.5, 0.75, 1, 1.25].map((v) => (
          <ToggleButton key={v} value={v} sx={{ fontFamily: MONO, px: 1.5 }}>{v}×</ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Paper>
  )
}

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
