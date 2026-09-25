import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import { useT } from '../i18n'
import type { Video } from '../lib/db'
import { parseSubtitleFile, parseTranscriptText, toSentences, type Cue } from '../lib/text'
import { useSaveVideo, withSubtitles } from '../queries'

/** Bring your own subtitles when YouTube won't hand them to us: paste the transcript, or upload .srt/.vtt. */
export function SubtitleImport({ video, onSaved }: { video: Video; onSaved?: () => void }) {
  const t = useT()
  const save = useSaveVideo()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [fileError, setFileError] = useState(false)
  const cues = parseTranscriptText(text)

  const use = (c: Cue[]) => save.mutate(withSubtitles(video, toSentences(c)), { onSuccess: () => (setOpen(false), onSaved?.()) })

  return (
    <>
      <Button variant="contained" size="large" onClick={() => setOpen(true)}>{t.pasteTranscript}</Button>
      <Button component="label" size="large">
        {t.uploadSubs}
        <input
          hidden
          type="file"
          accept=".srt,.vtt,text/vtt"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            const c = parseSubtitleFile(await file.text())
            setFileError(!c.length)
            if (c.length) use(c)
          }}
        />
      </Button>
      {/* DownSub has no public API, so we hand the user over with the video pre-filled (subtitle.to/<url> trick). */}
      <Button size="large" href={`https://subtitle.to/https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener" endIcon={<OpenInNewRounded />}>
        {t.getFromDownsub}
      </Button>
      {fileError ? <Typography color="secondary.main" sx={{ width: '100%' }}>{t.subsInvalid}</Typography> : null}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t.pasteTranscript}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography color="text.secondary">{t.pasteSteps}</Typography>
          <TextField
            autoFocus
            multiline
            minRows={8}
            maxRows={16}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'0:00\nHi everyone…\n0:03\n…'}
            slotProps={{ htmlInput: { 'aria-label': t.pasteTranscript } }}
            helperText={text.trim() ? (cues.length ? `${cues.length} ${t.pasteFound}` : t.pasteNone) : ' '}
            error={!!text.trim() && !cues.length}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button color="inherit" onClick={() => setOpen(false)}>{t.cancel}</Button>
          <Button variant="contained" disabled={!cues.length || save.isPending} onClick={() => use(cues)}>{t.useSubs}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
