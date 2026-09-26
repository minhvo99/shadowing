import { LEVELS, type Level } from '@libs/constants'
import type { Video } from '@libs/db'
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded'
import ButtonBase from '@mui/material/ButtonBase'
import type { Lesson } from '@services/catalogAPI'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import LessonPreview from './LessonPreview'

type Props = {
  level: Level
  onLevel: (l: Level) => void
  lessons: Lesson[]
  selected?: Lesson
  onSelect: (l: Lesson) => void
  byId: Map<string, Video>
  openingId?: string
  onOpen: (l: Lesson) => void
}

// Finder's selected row: solid accent, readable text.
const rowCls = (on: boolean) =>
  `flex! w-full items-center! justify-between! gap-2 rounded-lg px-3! py-2! text-left text-sm ${on ? 'bg-primary text-on-primary' : 'text-ink hover:bg-sunken'}`

/** Columns view: level → lesson → preview. Click selects, double-click (or the button) opens. */
const LessonColumns = ({ level, onLevel, lessons, selected, onSelect, byId, openingId, onOpen }: Props) => {
  const { t } = useTranslation()
  const active = useRef<HTMLButtonElement>(null)
  // Braces matter: Chrome's scrollIntoView now returns a Promise, which React would treat as the cleanup.
  useEffect(() => {
    active.current?.scrollIntoView({ block: 'nearest' })
  }, [selected?.id])

  return (
    <div className="grid h-[70vh] min-h-[420px] grid-cols-1 overflow-hidden rounded-2xl border border-line bg-surface md:grid-cols-[150px_minmax(0,1fr)_minmax(0,1.3fr)]">
      <div role="listbox" aria-label={t('levelLabel')} className="hidden flex-col gap-0.5 overflow-auto border-r border-line p-2 md:flex">
        {LEVELS.map(({ level: l }) => (
          <ButtonBase key={l} role="option" aria-selected={l === level} onClick={() => onLevel(l)} className={rowCls(l === level)}>
            <span className="font-semibold">{l}</span>
            <ChevronRightRounded fontSize="small" />
          </ButtonBase>
        ))}
      </div>
      <div role="listbox" aria-label={t('lessons')} className="flex flex-col gap-0.5 overflow-auto border-r border-line p-2">
        {lessons.map((l) => (
          <ButtonBase
            key={l.id}
            ref={l.id === selected?.id ? active : undefined}
            role="option"
            aria-selected={l.id === selected?.id}
            title={t('openHint')}
            onClick={() => onSelect(l)}
            onDoubleClick={() => onOpen(l)}
            className={rowCls(l.id === selected?.id)}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="font-mono text-xs opacity-70">{String(l.episode).padStart(2, '0')}</span>
              <span className="truncate">{l.topic}</span>
            </span>
            <ChevronRightRounded fontSize="small" className="shrink-0" />
          </ButtonBase>
        ))}
      </div>
      <div className="hidden overflow-auto p-6 md:block">
        {selected ? <LessonPreview lesson={selected} progress={byId.get(selected.id)} opening={openingId === selected.id} onOpen={() => onOpen(selected)} /> : null}
      </div>
    </div>
  )
}

export default LessonColumns
