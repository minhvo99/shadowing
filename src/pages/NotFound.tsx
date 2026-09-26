import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'

const NotFound = () => {
  const { t } = useTranslation()
  return (
    <Box component="main" sx={{ px: { xs: 2, md: 10 }, py: 10 }}>
      {t('notFoundPage')}
    </Box>
  )
}

export default NotFound
