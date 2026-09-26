import LessonCard from '@components/Catalog/LessonCard'
import LessonColumns from '@components/Catalog/LessonColumns'
import LessonGallery from '@components/Catalog/LessonGallery'
import LessonList from '@components/Catalog/LessonList'
import ViewModeToggle from '@components/Catalog/ViewModeToggle'
import PageTransition from '@components/PageTransition'
import { useNavigateWithType } from '@hooks'
import { LEVELS, type Level } from '@libs/constants'
import FilterListRounded from '@mui/icons-material/FilterListRounded'
import Alert from '@mui/material/Alert'
import InputBase from '@mui/material/InputBase'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import { useLessons, useOpenLesson, type Lesson } from '@services/catalogAPI'
import { useSettings, useUpdateSettings } from '@services/settingAPI'
import { useLibrary } from '@services/videoAPI'
import { useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

const Catalog = () => {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const level = (LEVELS.find((l) => l.level === params.get('level'))?.level ?? LEVELS[0].level) as Level
  const [filter, setFilter] = useState('')
  const q = useDeferredValue(filter.trim().toLowerCase())
  const { data: lessons, isPending, error } = useLessons(level)
  const library = useLibrary().data
  const byId = useMemo(() => new Map((library ?? []).map((v) => [v.id, v])), [library])
  const open = useOpenLesson()
  const go = useNavigateWithType()
  const [failed, setFailed] = useState(false)
  const { lessonsView: view } = useSettings()
  const update = useUpdateSettings()
  const [selectedId, setSelectedId] = useState<string>()

  const shown = (lessons ?? []).filter((l) => !q || l.topic.toLowerCase().includes(q))
  // Columns/gallery keep a selection (Finder-style); fall back to the first lesson shown.
  const selected = shown.find((l) => l.id === selectedId) ?? shown[0]
  const openingId = open.isPending ? open.variables?.id : undefined
  const openLesson = (l: Lesson) => open.mutate(l, { onSuccess: (v) => go(`/watch/${v.id}`, 'nav-forward'), onError: () => setFailed(true) })
  const setLevel = (l: Level) => setParams({ level: l }, { replace: true })
  const views = { lessons: shown, byId, openingId, onOpen: openLesson, selected, onSelect: (l: Lesson) => setSelectedId(l.id) }

  return (
    <PageTransition>
      <main className="mx-auto flex max-w-[1440px] flex-col gap-7 px-4 pt-8 pb-14 md:px-20 md:pt-12">
        <header className="flex flex-wrap items-end gap-4">
          <div className="flex-[1_1_420px]">
            <h1 className="m-0 text-4xl font-bold tracking-tight text-ink md:text-[2.6rem]">{t('lessonsTitle')}</h1>
            <p className="mt-2 mb-0 max-w-2xl leading-relaxed text-muted">{t('lessonsSub')}</p>
          </div>
          <Paper component="label" className="flex h-12 w-80 max-w-full items-center gap-2.5 border-[1.5px]! border-line! px-3.5">
            <FilterListRounded fontSize="small" className="text-muted" />
            <InputBase value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={t('filterTopic')} inputProps={{ 'aria-label': t('filterTopic') }} className="grow" />
          </Paper>
        </header>

        <div className="flex items-center gap-4 border-b border-line">
          {/* Columns view has its own level column on wide screens. */}
          <Tabs
            value={level}
            onChange={(_, v: Level) => setLevel(v)}
            aria-label={t('levelLabel')}
            textColor="inherit"
            slotProps={{ indicator: { sx: { bgcolor: 'text.primary' } } }}
            className={`grow ${view === 'columns' ? 'md:invisible' : ''}`}
          >
            {LEVELS.map(({ level: l }) => (
              <Tab key={l} value={l} label={<LevelLabel level={l} />} />
            ))}
          </Tabs>
          <ViewModeToggle value={view} onChange={(v) => update({ lessonsView: v })} />
        </div>

        {error ? (
          <Alert severity="error">{t('lessonsLoadFailed')}</Alert>
        ) : isPending ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-6">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} variant="rounded" className="aspect-video h-auto! rounded-2xl!" />
            ))}
          </div>
        ) : !shown.length ? (
          <div className="rounded-2xl border-[1.5px] border-dashed border-line p-8 text-muted">{t('noLessons')}</div>
        ) : view === 'list' ? (
          <LessonList {...views} />
        ) : view === 'columns' ? (
          <LessonColumns {...views} level={level} onLevel={setLevel} />
        ) : view === 'gallery' ? (
          <LessonGallery {...views} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-6 gap-y-8">
            {shown.map((l) => (
              <LessonCard key={l.id} lesson={l} progress={byId.get(l.id)} opening={openingId === l.id} onOpen={() => openLesson(l)} />
            ))}
          </div>
        )}
      </main>
      <Snackbar open={failed} autoHideDuration={4000} onClose={() => setFailed(false)} message={t('openFailed')} />
    </PageTransition>
  )
}

// "A1 · 58 bài" — the count loads per tab.
const LevelLabel = ({ level }: { level: Level }) => {
  const { t } = useTranslation()
  const count = useLessons(level).data?.length
  return (
    <span className="flex items-center gap-2 font-semibold">
      {level}
      {count !== undefined ? <span className="rounded-full bg-sunken px-2 font-mono text-xs text-muted">{t('lessonCount', { count })}</span> : null}
    </span>
  )
}

export default Catalog
