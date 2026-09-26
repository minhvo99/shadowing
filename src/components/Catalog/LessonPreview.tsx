import type { Video } from '@libs/db'
import { thumb } from '@libs/text'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import { progressOf, type Lesson } from '@services/catalogAPI'
import { useTranslation } from 'react-i18next'

type Props = { lesson: Lesson; progress?: Video; opening: boolean; onOpen: () => void; large?: boolean }

/** Details of the selected lesson (columns view's last column, gallery's stage). */
const LessonPreview = ({ lesson, progress, opening, onOpen, large }: Props) => {
  const { t } = useTranslation()
  const pct = progressOf(progress)
  return (
    <div className={`flex gap-5 ${large ? 'flex-col md:flex-row md:items-end' : 'flex-col'}`}>
      <img src={thumb(lesson.id)} alt="" className={`aspect-video rounded-2xl bg-sunken object-cover ${large ? 'w-full md:w-3/5' : 'w-full'}`} />
      <div className="flex min-w-0 flex-col gap-2">
        <span className="font-mono text-xs text-muted">
          {lesson.level} · {t('episode', { n: String(lesson.episode).padStart(2, '0') })}
        </span>
        <h2 className={`m-0 font-bold tracking-tight text-ink ${large ? 'text-3xl' : 'text-xl'}`}>{lesson.topic}</h2>
        <span className="text-sm text-muted">{pct === null ? t('notStarted') : t('practicedPct', { pct })}</span>
        {pct !== null ? <LinearProgress variant="determinate" value={pct} className="h-1.5! rounded-full" /> : null}
        <Button variant="contained" size="large" startIcon={<PlayArrowRounded />} loading={opening} onClick={onOpen} className="mt-2 self-start">
          {t('practiceLesson')}
        </Button>
      </div>
    </div>
  )
}

export default LessonPreview
