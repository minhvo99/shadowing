import type { Video } from '@libs/db'
import { thumb } from '@libs/text'
import ButtonBase from '@mui/material/ButtonBase'
import type { Lesson } from '@services/catalogAPI'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import LessonPreview from './LessonPreview'

type Props = { lessons: Lesson[]; selected?: Lesson; onSelect: (l: Lesson) => void; byId: Map<string, Video>; openingId?: string; onOpen: (l: Lesson) => void }

/** Gallery view: big preview on stage, thumbnail strip below. ←/→ move, Enter opens. */
const LessonGallery = ({ lessons, selected, onSelect, byId, openingId, onOpen }: Props) => {
  const { t } = useTranslation()
  const active = useRef<HTMLButtonElement>(null)
  // Braces matter: Chrome's scrollIntoView now returns a Promise, which React would treat as the cleanup.
  useEffect(() => {
    active.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [selected?.id])

  const i = lessons.findIndex((l) => l.id === selected?.id)
  const onKey = (e: KeyboardEvent) => {
    const next = e.key === 'ArrowRight' ? lessons[i + 1] : e.key === 'ArrowLeft' ? lessons[i - 1] : undefined
    if (next) {
      e.preventDefault()
      onSelect(next)
    } else if (e.key === 'Enter' && selected) {
      e.preventDefault()
      onOpen(selected)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-line bg-surface p-5">
        {selected ? <LessonPreview large lesson={selected} progress={byId.get(selected.id)} opening={openingId === selected.id} onOpen={() => onOpen(selected)} /> : null}
      </div>
      <div
        role="listbox"
        aria-label={t('lessons')}
        tabIndex={0}
        onKeyDown={onKey}
        className="flex gap-2 overflow-x-auto rounded-2xl p-1 pb-3 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {lessons.map((l) => {
          const on = l.id === selected?.id
          return (
            <ButtonBase
              key={l.id}
              ref={on ? active : undefined}
              role="option"
              aria-selected={on}
              aria-label={l.topic}
              title={t('openHint')}
              tabIndex={-1}
              onClick={() => onSelect(l)}
              onDoubleClick={() => onOpen(l)}
              className={`shrink-0 overflow-hidden rounded-lg ring-offset-2 ring-offset-canvas ${on ? 'ring-3 ring-primary' : 'opacity-75 hover:opacity-100'}`}
            >
              <img src={thumb(l.id)} alt="" loading="lazy" className="block aspect-video w-32 bg-sunken object-cover" />
            </ButtonBase>
          )
        })}
      </div>
    </div>
  )
}

export default LessonGallery
