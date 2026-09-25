import DeleteOutline from '@mui/icons-material/DeleteOutlined'
import FileDownloadOutlined from '@mui/icons-material/FileDownloadOutlined'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Paper from '@mui/material/Paper'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { pronounce } from '../components/PlayerPanels'
import { useT } from '../i18n'
import { download } from '../lib/download'
import { formatTime, thumb, toCsv } from '../lib/text'
import { PageTransition } from '../nav'
import { useLibrary, useNoteActions, useNotes, useWordActions, useWords } from '../queries'
import { MONO } from '../theme'

const watchUrl = (videoId: string, idx: number) => `/watch/${videoId}?s=${idx}`

export default function Notebook() {
  const t = useT()
  const [tab, setTab] = useState<'words' | 'notes'>('words')
  const [filter, setFilter] = useState('')
  const q = useDeferredValue(filter.trim().toLowerCase())
  const words = useWords().data ?? []
  const notes = useNotes().data ?? []
  const library = useLibrary().data
  const titles = useMemo(() => new Map((library ?? []).map((v) => [v.id, v.title])), [library])
  const wordActions = useWordActions()
  const noteActions = useNoteActions()

  const hit = (s: string) => !q || s.toLowerCase().includes(q)
  const shownWords = words.filter((w) => hit(`${w.word} ${w.vi} ${w.en}`)).toSorted((a, b) => b.savedAt - a.savedAt)
  const byVideo = Map.groupBy(notes.filter((n) => hit(`${n.text} ${n.sentence}`)), (n) => n.videoId)
  const groups = [...byVideo].map(([videoId, items]) => ({ videoId, items: items.toSorted((a, b) => a.idx - b.idx) }))

  return (
    <PageTransition>
      <Box component="main" sx={{ px: { xs: 2, md: 10 }, pt: 6, pb: 7, maxWidth: 1440, mx: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: '1 1 400px' }}>
            <Typography variant="h1" sx={{ fontSize: 40 }}>{t.nbTitle}</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 640, lineHeight: 1.5 }}>{t.nbSub}</Typography>
          </Box>
          <Paper component="label" sx={{ width: 320, maxWidth: '100%', height: 48, display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, border: 1.5, borderColor: 'divider' }}>
            <FilterListRounded sx={{ color: 'text.secondary' }} fontSize="small" />
            <InputBase value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t.filter} inputProps={{ 'aria-label': t.filter }} sx={{ flexGrow: 1 }} />
          </Paper>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<FileDownloadOutlined />}
            disabled={!words.length}
            onClick={() =>
              download(
                new Blob([toCsv(words.map((w) => [w.word, `${w.vi}<br>${w.en}`, w.ipa, w.sentence, titles.get(w.videoId) ?? w.videoTitle]))], { type: 'text/csv' }),
                'shadowing-words.csv',
              )
            }
            sx={{ height: 48 }}
          >
            {t.exportCsv}
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} textColor="inherit" slotProps={{ indicator: { sx: { bgcolor: 'text.primary' } } }} sx={{ mt: 3.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tab value="words" label={`${t.tWords} · ${words.length}`} />
          <Tab value="notes" label={`${t.tNotes} · ${notes.length}`} />
        </Tabs>

        {tab === 'words' ? (
          shownWords.length ? (
            <Box role="table" aria-label={t.nbTitle}>
              <Box role="row" sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '240px minmax(0,1fr) 340px 100px', gap: 3, px: 2, py: 1.75, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>
                <span role="columnheader">{t.colWord}</span>
                <span role="columnheader">{t.colMeaning}</span>
                <span role="columnheader">{t.colSource}</span>
                <span />
              </Box>
              {shownWords.map((w) => (
                <Box key={w.word} role="row" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: '240px minmax(0,1fr) 340px 100px' }, gap: { xs: 1, md: 3 }, alignItems: 'center', px: 2, py: 1.75, borderTop: 1, borderColor: 'divider' }}>
                  <Box role="cell">
                    <Typography sx={{ fontSize: 18, fontWeight: 700 }}>{w.word}</Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: 13, color: 'text.secondary' }}>{w.ipa}</Typography>
                  </Box>
                  <Box role="cell" sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 2, md: 'auto' } }}>
                    <Typography sx={{ fontWeight: 600 }}>{w.vi}</Typography>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.45 }}>{w.en}</Typography>
                  </Box>
                  <Box role="cell" component={Link} to={watchUrl(w.videoId, w.idx)} sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 3, md: 'auto' }, textDecoration: 'none', color: 'text.primary' }}>
                    <Typography sx={{ fontSize: 13, fontStyle: 'italic', lineHeight: 1.45 }}>“{w.sentence}”</Typography>
                    <Typography sx={{ fontSize: 12, color: 'primary.main', fontWeight: 600 }}>
                      <Box component="span" sx={{ fontFamily: MONO }}>{formatTime(w.start)}</Box> · {titles.get(w.videoId) ?? w.videoTitle}
                    </Typography>
                  </Box>
                  <Box role="cell" sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', gridRow: { xs: 1, md: 'auto' }, gridColumn: { xs: 2, md: 'auto' } }}>
                    <IconButton aria-label={`${t.hear} ${w.word}`} onClick={() => pronounce(w.word, undefined, 'en-US')} sx={{ bgcolor: 'sunken' }}><VolumeUpOutlined fontSize="small" /></IconButton>
                    <IconButton aria-label={`${t.remove} ${w.word}`} onClick={() => wordActions.remove(w.word)} sx={{ color: 'text.secondary' }}><DeleteOutline fontSize="small" /></IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Empty text={words.length ? t.noMatch : t.noWords} />
          )
        ) : groups.length ? (
          <Box sx={{ pt: 3.5, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 3, alignItems: 'start' }}>
            {groups.map((g) => (
              <Paper key={g.videoId} sx={{ borderRadius: 4, p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
                  <Box component="img" src={thumb(g.videoId)} alt="" sx={{ width: 96, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                  <Box>
                    <Box component={Link} to={`/watch/${g.videoId}`} sx={{ fontWeight: 700, color: 'text.primary', textDecoration: 'none', lineHeight: 1.35 }}>{titles.get(g.videoId) ?? g.videoId}</Box>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{g.items.length} {t.notes}</Typography>
                  </Box>
                </Box>
                {g.items.map((n) => (
                  <Box key={n.id} sx={{ display: 'grid', gridTemplateColumns: '64px minmax(0, 1fr) 44px', gap: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Box component={Link} to={watchUrl(n.videoId, n.idx)} sx={{ alignSelf: 'start', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, bgcolor: 'accentSoft', color: 'primary.main', fontFamily: MONO, fontSize: 12, textDecoration: 'none' }}>
                      {formatTime(n.start)}
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary', fontStyle: 'italic' }}>“{n.sentence}”</Typography>
                      <Typography sx={{ fontSize: 14, lineHeight: 1.55, mt: 0.75, whiteSpace: 'pre-wrap' }}>{n.text}</Typography>
                    </Box>
                    <IconButton aria-label={t.deleteNote} onClick={() => noteActions.remove(n.id)} sx={{ color: 'text.secondary' }}><DeleteOutline fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Paper>
            ))}
          </Box>
        ) : (
          <Empty text={notes.length ? t.noMatch : t.noNotesAll} />
        )}
      </Box>
    </PageTransition>
  )
}

function Empty({ text }: { text: string }) {
  return <Box sx={{ mt: 3, p: 4, border: '1.5px dashed', borderColor: 'divider', borderRadius: 3.5, color: 'text.secondary' }}>{text}</Box>
}
