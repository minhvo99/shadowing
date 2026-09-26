import { LEVELS, type Level } from '@libs/constants'
import * as db from '@libs/db'
import type { Video } from '@libs/db'
import { parseSubtitleFile, toSentences } from '@libs/text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from './rootApi'

export type Lesson = { id: string; level: Level; episode: number; title: string; topic: string; file: string }

type Report = {
  results: { status: 'existing' | 'downloaded' | 'skipped' | 'failed'; filename: string; item: { id: string; title: string; position: number } }[]
}

// "A1 English Listening Practice - Cooking" → "Cooking"; other playlist videos keep their full title.
const TOPIC_PREFIX = /^[ABC][12] English Listening Practice\s*[-–:]\s*/i

async function fetchLessons(level: Level): Promise<Lesson[]> {
  const { dir } = LEVELS.find((l) => l.level === level)!
  const res = await fetch(`/${dir}/download-report.json`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const report: Report = await res.json()
  return report.results
    .filter((r) => r.status === 'existing' || r.status === 'downloaded') // skipped/failed have no subtitle file
    .map(({ item, filename }) => ({
      id: item.id,
      level,
      episode: item.position + 1,
      title: item.title,
      topic: item.title.replace(TOPIC_PREFIX, ''),
      // The report names files "….en-orig.vtt"; they are saved without the language suffix.
      file: `/${dir}/${encodeURIComponent(filename.replace(/\.en(-orig)?\.vtt$/, '.vtt'))}`,
    }))
}

/** Percent of sentences practiced, or null when the lesson was never opened. */
export const progressOf = (v?: Video): number | null => (v?.lines.length ? Math.round((v.done.length / v.lines.length) * 100) : null)

export const useLessons = (level: Level) => useQuery({ queryKey: keys.lessons(level), queryFn: () => fetchLessons(level) })

/** Opening a lesson builds the video from our own .vtt (no YouTube or server call) and saves it to the library. */
export function useOpenLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lesson: Lesson): Promise<Video> => {
      const local = await db.getVideo(lesson.id)
      if (local?.lines.length) return local
      const res = await fetch(lesson.file)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const lines = toSentences(parseSubtitleFile(await res.text()))
      if (!lines.length) throw new Error('Empty subtitle file')
      const now = Date.now()
      const video: Video = {
        id: lesson.id,
        title: lesson.title,
        author: '',
        duration: 0,
        captions: 'auto',
        lines,
        done: [],
        lastIdx: 0,
        addedAt: now,
        openedAt: now,
        level: lesson.level,
      }
      await db.putVideo(video)
      return video
    },
    onSuccess: (v) => {
      qc.setQueryData(keys.video(v.id), v)
      qc.invalidateQueries({ queryKey: keys.library })
    },
  })
}
