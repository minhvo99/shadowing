import type { Video } from '@libs/db'
import { thumb } from '@libs/text'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import { progressOf, type Lesson } from '@services/catalogAPI'
import { useTranslation } from 'react-i18next'

type Props = { lessons: Lesson[]; byId: Map<string, Video>; openingId?: string; onOpen: (l: Lesson) => void }

/** List view: one row per lesson, Finder-style columns. */
const LessonList = ({ lessons, byId, openingId, onOpen }: Props) => {
  const { t } = useTranslation()
  return (
    <div role="list" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="hidden grid-cols-[96px_minmax(0,1fr)_180px] gap-4 border-b border-line px-4 py-2 text-xs font-semibold tracking-wide text-muted uppercase sm:grid">
        <span />
        <span>{t('colName')}</span>
        <span>{t('colProgress')}</span>
      </div>
      {lessons.map((l) => {
        const pct = progressOf(byId.get(l.id))
        return (
          <ButtonBase
            key={l.id}
            role="listitem"
            onClick={() => onOpen(l)}
            disabled={openingId === l.id}
            className="grid! w-full grid-cols-[96px_minmax(0,1fr)] items-center! gap-4 border-b border-line px-4! py-2! text-left last:border-b-0 hover:bg-sunken sm:grid-cols-[96px_minmax(0,1fr)_180px]"
          >
            <span className="relative">
              <img src={thumb(l.id)} alt="" loading="lazy" className="block aspect-video w-24 rounded-lg bg-sunken object-cover" />
              {openingId === l.id ? (
                <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/40">
                  <CircularProgress size={18} sx={{ color: '#fff' }} />
                </span>
              ) : null}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold text-ink">{l.topic}</span>
              <span className="font-mono text-xs text-muted">
                {l.level} · {t('episode', { n: String(l.episode).padStart(2, '0') })}
              </span>
            </span>
            <span className="hidden flex-col gap-1 sm:flex">
              <span className={`text-xs font-semibold ${pct === 100 ? 'text-primary' : 'text-muted'}`}>{pct === null ? t('notStarted') : t('practicedPct', { pct })}</span>
              {pct !== null ? <LinearProgress variant="determinate" value={pct} className="h-1! rounded-full" /> : null}
            </span>
          </ButtonBase>
        )
      })}
    </div>
  )
}

export default LessonList
