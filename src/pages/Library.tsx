import LibraryGrid from '@components/Library/LibraryGrid'
import PreviewCard from '@components/Library/PreviewCard'
import StorageStrip from '@components/Library/StorageStrip'
import PageTransition from '@components/PageTransition'
import { useNavigateWithType, useT } from '@hooks'
import { MONO } from '@libs/constants'
import { parseYouTubeId } from '@libs/text'
import Close from '@mui/icons-material/Close'
import ErrorOutline from '@mui/icons-material/ErrorOutlined'
import LinkRounded from '@mui/icons-material/LinkRounded'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'
import { useLibrary } from '@services/videoAPI'
import { useState } from 'react'

function Library() {
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

export default Library
