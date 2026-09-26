import { MONO } from '@libs/constants'
import type { Video } from '@libs/db'
import { formatTime } from '@libs/text'
import Bookmark from '@mui/icons-material/Bookmark'
import BookmarkBorder from '@mui/icons-material/BookmarkBorder'
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useDictionary } from '@services/dictionaryAPI'
import { useWordActions, useWords } from '@services/notebookAPI'
import { pronounce } from '@utils/pronounce'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const label = { fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' } as const

function DictionaryPanel({ word, recent, onWord, video, idx }: { word: string | null; recent: string[]; onWord: (w: string) => void; video: Video; idx: number }) {
  const { t } = useTranslation()
  return (
    <Box sx={{ flexGrow: 1, overflow: 'auto', px: 2.5, py: 2.75, display: 'flex', flexDirection: 'column', gap: 2.25 }}>
      {word ? <Entry key={word} word={word} video={video} idx={idx} /> : <Typography color="text.secondary">{t('pickWord')}</Typography>}
      {recent.length ? (
        <Box>
          <Typography sx={label}>{t('recent')}</Typography>
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
  const { t } = useTranslation()
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
  if (isError || !data) return <Typography color="secondary.main">{t('lookupFailed')}</Typography>

  const viValue = vi ?? savedWord?.vi ?? data.vi

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{word}</Typography>
          {data.ipa ? <Typography sx={{ fontFamily: MONO, fontSize: 14, color: 'text.secondary', mt: 0.5 }}>{data.ipa}</Typography> : null}
        </Box>
        <Button variant="outlined" color="inherit" aria-label={t('hearUS')} startIcon={<VolumeUpOutlined />} onClick={() => pronounce(word, data.audioUS, 'en-US')} sx={{ borderColor: 'divider' }}>US</Button>
        <Button variant="outlined" color="inherit" aria-label={t('hearUK')} startIcon={<VolumeUpOutlined />} onClick={() => pronounce(word, data.audioUK, 'en-GB')} sx={{ borderColor: 'divider' }}>UK</Button>
      </Box>
      {data.pos ? <Chip label={data.pos} variant="outlined" size="small" sx={{ alignSelf: 'flex-start', color: 'text.secondary' }} /> : null}

      <Box>
        <Typography sx={label}>{t('viLabel')}</Typography>
        <TextField
          fullWidth
          variant="standard"
          value={viValue}
          onChange={(e) => setVi(e.target.value)}
          helperText={savedWord ? undefined : t('viHint')}
          slotProps={{ htmlInput: { 'aria-label': t('viLabel') }, input: { sx: { fontSize: 18, fontWeight: 600 } } }}
          sx={{ mt: 0.5 }}
        />
      </Box>

      <Box>
        <Typography sx={label}>{t('enLabel')}</Typography>
        <Typography sx={{ fontSize: 15, lineHeight: 1.55, mt: 0.75 }}>{data.found ? data.en : t('notFound')}</Typography>
        {data.example ? <Typography sx={{ fontSize: 14, color: 'text.secondary', mt: 0.5, fontStyle: 'italic' }}>{data.example}</Typography> : null}
      </Box>

      {line ? (
        <Box>
          <Typography sx={label}>{t('inVideo')}</Typography>
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
        {savedWord ? (vi === null ? t('saved') : t('save')) : t('save')}
      </Button>
    </>
  )
}

export default DictionaryPanel
