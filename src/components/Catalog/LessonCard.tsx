import { thumb } from '@libs/text'
import type { Video } from '@libs/db'
import type { Lesson } from '@services/catalogAPI'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import { ViewTransition } from 'react'
import { useTranslation } from 'react-i18next'

type Props = { lesson: Lesson; progress?: Video; opening: boolean; onOpen: () => void }

const LessonCard = ({ lesson, progress, opening, onOpen }: Props) => {
  const { t } = useTranslation()
  const pct = progress?.lines.length ? Math.round((progress.done.length / progress.lines.length) * 100) : 0

  return (
    <ButtonBase onClick={onOpen} disabled={opening} className="group flex! flex-col! items-stretch! gap-3 rounded-2xl text-left">
      <div className="relative overflow-hidden rounded-2xl bg-sunken">
        {/* Same name as the player frame: the thumbnail morphs into the video when the lesson opens. */}
        <ViewTransition name={`video-${lesson.id}`} share="morph">
          <img src={thumb(lesson.id)} alt="" loading="lazy" className="block aspect-video w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        </ViewTransition>
        <span className="absolute top-2.5 left-2.5 rounded-md bg-black/70 px-2 py-0.5 font-mono text-xs text-white">
          {t('episode', { n: String(lesson.episode).padStart(2, '0') })}
        </span>
        {opening ? (
          <div className="absolute inset-0 grid place-items-center bg-black/40">
            <CircularProgress size={32} sx={{ color: '#fff' }} />
          </div>
        ) : null}
        {progress ? (
          <LinearProgress
            variant="determinate"
            value={pct}
            aria-label={`${pct}%`}
            className="absolute! right-0 bottom-0 left-0 h-1.5!"
            sx={{ bgcolor: 'rgba(255,255,255,.25)', '& .MuiLinearProgress-bar': { bgcolor: '#F3EFE6' } }}
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <span className="text-base leading-snug font-semibold text-ink">{lesson.topic}</span>
        <span className={`text-xs font-semibold ${pct >= 100 ? 'text-primary' : 'text-muted'}`}>
          {lesson.level} · {progress ? t('practicedPct', { pct }) : t('notStarted')}
        </span>
      </div>
    </ButtonBase>
  )
}

export default LessonCard
