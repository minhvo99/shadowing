import { useT } from '@hooks'
import { MONO } from '@libs/constants'
import type { Video } from '@libs/db'
import { formatTime } from '@libs/text'
import DeleteOutline from '@mui/icons-material/DeleteOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useNoteActions, useNotes } from '@services/notebookAPI'
import { useState, type RefObject } from 'react'

function NotesPanel({ video, idx, inputRef, onJump }: { video: Video; idx: number; inputRef: RefObject<HTMLTextAreaElement | null>; onJump: (i: number) => void }) {
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

export default NotesPanel
