import GridViewOutlined from '@mui/icons-material/GridViewOutlined'
import ViewCarouselOutlined from '@mui/icons-material/ViewCarouselOutlined'
import ViewColumnOutlined from '@mui/icons-material/ViewColumnOutlined'
import ViewListOutlined from '@mui/icons-material/ViewListOutlined'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Tooltip from '@mui/material/Tooltip'
import type { LessonsView } from '@services/settingAPI'
import { useTranslation } from 'react-i18next'

const MODES = [
  { value: 'grid', icon: GridViewOutlined, label: 'viewGrid' },
  { value: 'list', icon: ViewListOutlined, label: 'viewList' },
  { value: 'columns', icon: ViewColumnOutlined, label: 'viewColumns' },
  { value: 'gallery', icon: ViewCarouselOutlined, label: 'viewGallery' },
] as const

/** Finder-style view switcher: icons · list · columns · gallery. */
const ViewModeToggle = ({ value, onChange }: { value: LessonsView; onChange: (v: LessonsView) => void }) => {
  const { t } = useTranslation()
  return (
    <ToggleButtonGroup exclusive size="small" value={value} aria-label={t('viewLabel')} onChange={(_, v: LessonsView | null) => v && onChange(v)}>
      {MODES.map(({ value: v, icon: Icon, label }) => (
        <Tooltip key={v} title={t(label)}>
          <ToggleButton value={v} aria-label={t(label)} className="px-3!">
            <Icon fontSize="small" />
          </ToggleButton>
        </Tooltip>
      ))}
    </ToggleButtonGroup>
  )
}

export default ViewModeToggle
