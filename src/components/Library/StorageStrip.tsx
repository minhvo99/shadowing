import { useT } from '@hooks'
import { exportBackup } from '@libs/db'
import StorageOutlined from '@mui/icons-material/StorageOutlined'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useImportBackup } from '@services/videoAPI'
import { download } from '@utils/download'

function StorageStrip({ onMessage }: { onMessage: (m: string) => void }) {
  const t = useT()
  const importBackup = useImportBackup()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, px: 2.5, border: '1.5px dashed', borderColor: 'divider', borderRadius: 3.5, flexWrap: 'wrap' }}>
      <StorageOutlined sx={{ color: 'text.secondary' }} />
      <Box sx={{ flex: '1 1 320px' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{t.storeTitle}</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t.storeBody}</Typography>
      </Box>
      <Button
        variant="outlined"
        color="inherit"
        sx={{ borderColor: 'divider' }}
        onClick={async () => download(await exportBackup(), `shadowing-backup-${new Date().toISOString().slice(0, 10)}.json`)}
      >
        {t.export}
      </Button>
      <Button component="label">
        {t.import}
        <input
          hidden
          type="file"
          accept="application/json,.json"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) importBackup.mutate(file, { onSuccess: () => onMessage(t.imported), onError: () => onMessage(t.importFailed) })
          }}
        />
      </Button>
    </Box>
  )
}

export default StorageStrip
