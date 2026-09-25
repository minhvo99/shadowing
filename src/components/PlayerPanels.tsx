import Bookmark from '@mui/icons-material/Bookmark'
import BookmarkBorder from '@mui/icons-material/BookmarkBorder'
import DeleteOutline from '@mui/icons-material/DeleteOutlined'
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { keyframes, type SxProps, type Theme } from '@mui/material/styles'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useT } from '../i18n'
import type { Video } from '../lib/db'
import type { Karaoke } from '../lib/shadowing'
import { formatTime, maskText, wordKey } from '../lib/text'
import { useDictionary, useNoteActions, useNotes, useWordActions, useWords } from '../queries'
import { useSettings, useUpdateSettings, type Mode } from '../settings'
import { MONO } from '../theme'

const label = { fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' } as const

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
export function Words({ text, selected, onPick, sx, overlay, karaoke }: { text: string; selected: string | null; onPick: (w: string) => void; sx?: SxProps<Theme>; overlay?: boolean; karaoke?: Karaoke }) {
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

export function TranscriptPanel({ lines, idx, done, word, karaoke, onPick, onWord }: { lines: Video['lines']; idx: number; done: number[]; word: string | null; karaoke?: Karaoke; onPick: (i: number) => void; onWord: (w: string) => void }) {
  const t = useT()
  const { mode } = useSettings()
  const update = useUpdateSettings()
  const list = useRef<HTMLDivElement>(null)
  const active = useRef<HTMLDivElement>(null)
  const doneSet = new Set(done)
  const blind = mode === 'blind'

  // Keep the current sentence in view without scrolling the whole page.
  useEffect(() => {
    const c = list.current
    const el = active.current
    if (c && el) c.scrollTo({ top: el.offsetTop - c.clientHeight / 3, behavior: 'smooth' })
  }, [idx])

  return (
    <>
      <Box sx={{ px: 2, pt: 1.75, pb: 1, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <ToggleButtonGroup exclusive fullWidth size="small" value={mode} aria-label={t.modeLabel} onChange={(_, v: Mode | null) => v && update({ mode: v })}>
          <ToggleButton value="listen">{t.mListen}</ToggleButton>
          <ToggleButton value="along">{t.mAlong}</ToggleButton>
          <ToggleButton value="blind">{t.mBlind}</ToggleButton>
          <ToggleButton value="karaoke">{t.mKaraoke}</ToggleButton>
        </ToggleButtonGroup>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{t.tapHint}</Typography>
      </Box>
      <Box ref={list} sx={{ flexGrow: 1, overflow: 'auto', px: 1, pb: 1, position: 'relative' }}>
        {lines.map((l, i) =>
          i === idx ? (
            <Box key={i} ref={active} sx={{ display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr)', gap: 1.25, p: 1.5, borderRadius: 3, bgcolor: 'accentSoft' }}>
              <Box sx={{ fontFamily: MONO, fontSize: 12, color: 'primary.main', pt: 0.5 }}>{formatTime(l.start)}</Box>
              <Box>
                <Words text={l.text} selected={word} onPick={onWord} karaoke={karaoke} sx={{ fontSize: 15, fontWeight: 600, ml: '-4px' }} />
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>{doneSet.has(i) ? t.practiced : t.notYet}</Typography>
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
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.75 }}>{doneSet.has(i) ? t.practiced : t.notYet}</Typography>
              </Box>
            </ButtonBase>
          ),
        )}
      </Box>
    </>
  )
}

export function NotesPanel({ video, idx, inputRef, onJump }: { video: Video; idx: number; inputRef: RefObject<HTMLTextAreaElement | null>; onJump: (i: number) => void }) {
  const t = useT()
  const notes = (useNotes().data ?? []).filter((n) => n.videoId === video.id).sort((a, b) => a.idx - b.idx || a.createdAt - b.createdAt)
  const actions = useNoteActions()
  const [draft, setDraft] = useState('')
  const line = video.lines[idx]

  const save = () => {
    const text = draft.trim()
    if (!text || !line) return
    actions.add({ videoId: video.id, idx, start: line.start, sentence: line.text, text })
    setDraft('')
  }

  return (
    <>
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {notes.length ? (
          notes.map((n) => (
            <Box key={n.id} sx={{ p: 1.75, borderRadius: 3, bgcolor: 'background.default', display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip
                  clickable
                  size="small"
                  onClick={() => onJump(n.idx)}
                  label={`${formatTime(n.start)} · ${t.sentence} ${n.idx + 1}`}
                  sx={{ fontFamily: MONO, fontSize: 12, bgcolor: 'accentSoft', color: 'primary.main' }}
                />
                <Box sx={{ flexGrow: 1 }} />
                <IconButton size="small" aria-label={t.deleteNote} onClick={() => actions.remove(n.id)} sx={{ color: 'text.secondary' }}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Box>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontStyle: 'italic' }}>“{n.sentence}”</Typography>
              <Typography sx={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{n.text}</Typography>
            </Box>
          ))
        ) : (
          <Box sx={{ p: 3, border: '1.5px dashed', borderColor: 'divider', borderRadius: 3, color: 'text.secondary', fontSize: 14 }}>{t.noNotes}</Box>
        )}
      </Box>
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <TextField
          inputRef={inputRef}
          label={line ? `${t.noteFor} ${idx + 1} · ${formatTime(line.start)}` : t.noteFor}
          placeholder={t.notePh}
          multiline
          minRows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save()
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Typography sx={{ flexGrow: 1, fontSize: 12, color: 'text.secondary' }}>{t.noteHint}</Typography>
          <Button variant="contained" onClick={save} disabled={!draft.trim()}>{t.saveNote}</Button>
        </Box>
      </Box>
    </>
  )
}

// Recorded pronunciation when the dictionary has one, otherwise the browser's own voice.
export function pronounce(word: string, url: string | undefined, lang: 'en-US' | 'en-GB') {
  if (url) return void new Audio(url).play()
  speechSynthesis.cancel()
  speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(word), { lang }))
}

export function DictionaryPanel({ word, recent, onWord, video, idx }: { word: string | null; recent: string[]; onWord: (w: string) => void; video: Video; idx: number }) {
  const t = useT()
  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2.5, py: 2.75, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      {word ? <Entry key={word} word={word} video={video} idx={idx} /> : <Typography color="text.secondary">{t.pickWord}</Typography>}
      {recent.length ? (
        <Box>
          <Typography sx={label}>{t.recent}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1 }}>
            {recent.map((w) => (
              <Chip key={w} label={w} variant="outlined" clickable onClick={() => onWord(w)} />
            ))}
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}

function Entry({ word, video, idx }: { word: string; video: Video; idx: number }) {
  const t = useT()
  const { data, isPending, isError } = useDictionary(word)
  const savedWord = useWords().data?.find((w) => w.word === word)
  const actions = useWordActions()
  const [vi, setVi] = useState<string | null>(null)
  const line = savedWord ? { text: savedWord.sentence, start: savedWord.start } : video.lines[idx]

  if (isPending) {
    return (
      <Box>
        <Skeleton width="50%" height={48} />
        <Skeleton width="30%" />
        <Skeleton height={80} />
      </Box>
    )
  }
  if (isError || !data) return <Typography color="secondary.main">{t.lookupFailed}</Typography>

  const viValue = vi ?? savedWord?.vi ?? data.vi

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{word}</Typography>
          {data.ipa ? <Typography sx={{ fontFamily: MONO, fontSize: 14, color: 'text.secondary', mt: 0.5 }}>{data.ipa}</Typography> : null}
        </Box>
        <Button variant="outlined" color="inherit" aria-label={t.hearUS} startIcon={<VolumeUpOutlined />} onClick={() => pronounce(word, data.audioUS, 'en-US')} sx={{ borderColor: 'divider' }}>US</Button>
        <Button variant="outlined" color="inherit" aria-label={t.hearUK} startIcon={<VolumeUpOutlined />} onClick={() => pronounce(word, data.audioUK, 'en-GB')} sx={{ borderColor: 'divider' }}>UK</Button>
      </Box>
      {data.pos ? <Chip label={data.pos} variant="outlined" size="small" sx={{ alignSelf: 'flex-start', color: 'text.secondary' }} /> : null}

      <Box>
        <Typography sx={label}>{t.viLabel}</Typography>
        <TextField
          fullWidth
          variant="standard"
          value={viValue}
          onChange={(e) => setVi(e.target.value)}
          helperText={savedWord ? undefined : t.viHint}
          slotProps={{ htmlInput: { 'aria-label': t.viLabel }, input: { sx: { fontSize: 18, fontWeight: 600 } } }}
          sx={{ mt: 0.5 }}
        />
      </Box>

      <Box>
        <Typography sx={label}>{t.enLabel}</Typography>
        <Typography sx={{ fontSize: 15, lineHeight: 1.55, mt: 0.75 }}>{data.found ? data.en : t.notFound}</Typography>
        {data.example ? <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5, fontStyle: 'italic' }}>{data.example}</Typography> : null}
      </Box>

      {line ? (
        <Box>
          <Typography sx={label}>{t.inVideo}</Typography>
          <Box sx={{ mt: 0.75, px: 1.75, py: 1.5, borderRadius: 2.5, bgcolor: 'background.default', display: 'flex', gap: 1.25, fontSize: 14 }}>
            <Box sx={{ fontFamily: MONO, fontSize: 12, color: 'primary.main', pt: 0.25 }}>{formatTime(line.start)}</Box>
            <Box sx={{ fontStyle: 'italic', lineHeight: 1.5 }}>{line.text}</Box>
          </Box>
        </Box>
      ) : null}

      <Button
        size="large"
        variant={savedWord ? 'outlined' : 'contained'}
        aria-pressed={!!savedWord}
        startIcon={savedWord ? <Bookmark /> : <BookmarkBorder />}
        onClick={() => {
          if (savedWord && vi === null) return actions.remove(word)
          if (!line) return
          actions.save({
            word,
            ipa: data.ipa,
            vi: viValue,
            en: data.en,
            sentence: line.text,
            start: line.start,
            idx: savedWord?.idx ?? idx,
            videoId: savedWord?.videoId ?? video.id,
            videoTitle: savedWord?.videoTitle ?? video.title,
          })
          setVi(null)
        }}
      >
        {savedWord ? (vi === null ? t.saved : t.save) : t.save}
      </Button>
    </>
  )
}
