import { del, entries, get, set, setMany } from 'idb-keyval'
import type { Cue } from './text'

// Everything lives in this browser's IndexedDB. Keys:
//   video:<id>  → Video        notes → Note[]        words → Word[]
//   rec:<videoId>:<sentenceIdx> → Blob (the user's recording)

export type Video = {
  id: string
  title: string
  author: string
  duration: number
  captions: 'manual' | 'auto' | 'none' | 'file'
  lines: Cue[]
  done: number[]
  lastIdx: number
  addedAt: number
  openedAt: number
  /** Set for lessons opened from the catalog. */
  level?: string
}

export type Note = { id: string; videoId: string; idx: number; start: number; sentence: string; text: string; createdAt: number }

export type Word = {
  word: string
  ipa: string
  vi: string
  en: string
  sentence: string
  start: number
  idx: number
  videoId: string
  videoTitle: string
  savedAt: number
}

export async function listVideos(): Promise<Video[]> {
  const all = await entries<string, Video>()
  return all.filter(([k]) => String(k).startsWith('video:')).map(([, v]) => v).sort((a, b) => b.openedAt - a.openedAt)
}

export const getVideo = (id: string) => get<Video>(`video:${id}`)

export async function putVideo(v: Video) {
  await set(`video:${v.id}`, v)
  // Ask the browser not to evict our data under storage pressure.
  navigator.storage?.persist?.()
}

export async function deleteVideo(id: string) {
  const [notes, words, all] = await Promise.all([listNotes(), listWords(), entries()])
  const recs = all.filter(([k]) => String(k).startsWith(`rec:${id}:`))
  await Promise.all([
    del(`video:${id}`),
    set('notes', notes.filter((n) => n.videoId !== id)),
    set('words', words.filter((w) => w.videoId !== id)),
    ...recs.map(([k]) => del(k)),
  ])
}

export const listNotes = async () => (await get<Note[]>('notes')) ?? []
export const saveNotes = (notes: Note[]) => set('notes', notes)
export const listWords = async () => (await get<Word[]>('words')) ?? []
export const saveWords = (words: Word[]) => set('words', words)

export const getRecording = async (videoId: string, idx: number) => (await get<Blob>(`rec:${videoId}:${idx}`)) ?? null
export const putRecording = (videoId: string, idx: number, blob: Blob) => set(`rec:${videoId}:${idx}`, blob)

// ponytail: recordings are left out of the backup to keep it small; add them as base64 if people ask.
export async function exportBackup(): Promise<Blob> {
  const data = (await entries()).filter(([k]) => !String(k).startsWith('rec:'))
  return new Blob([JSON.stringify({ app: 'shadowing-studio', data })], { type: 'application/json' })
}

export async function importBackup(file: File) {
  const json = JSON.parse(await file.text())
  if (json?.app !== 'shadowing-studio' || !Array.isArray(json.data)) throw new Error('Not a Shadowing Studio backup')
  const allowed = (k: unknown) => typeof k === 'string' && (k.startsWith('video:') || k === 'notes' || k === 'words')
  await setMany(json.data.filter(([k]: [unknown]) => allowed(k)))
}
