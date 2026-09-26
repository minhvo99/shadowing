import { useT } from '@hooks'
import Box from '@mui/material/Box'

const NotFound = () => {
  const t = useT()
  return (
    <Box component="main" sx={{ px: { xs: 2, md: 10 }, py: 10 }}>
      {t.notFoundPage}
    </Box>
  )
}

export default NotFound
