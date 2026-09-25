import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as db from './lib/db'
import type { Note, Video, Word } from './lib/db'
import { clampEnds, type Cue } from './lib/text'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 } },
})

export const keys = {
  library: ['library'] as const,
  video: (id: string) => ['video', id] as const,
  notes: ['notes'] as const,
  words: ['words'] as const,
  dict: (word: string) => ['dict', word] as const,
  recording: (videoId: string, idx: number) => ['recording', videoId, idx] as const,
  settings: ['settings'] as const,
}

// ---------- remote ----------

type RemoteVideo = Pick<Video, 'id' | 'title' | 'author' | 'duration' | 'captions' | 'lines'>

async function fetchRemoteVideo(id: string): Promise<RemoteVideo> {
  const res = await fetch(`/api/video?id=${encodeURIComponent(id)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
  return body
}

const fromRemote = (r: RemoteVideo): Video => {
  const now = Date.now()
  return { ...r, done: [], lastIdx: 0, addedAt: now, openedAt: now }
}

/** Local copy if saved, else YouTube. Never writes; the player persists it via usePatchVideo. */
export function useVideo(id: string | null) {
  return useQuery({
    queryKey: keys.video(id ?? ''),
    enabled: !!id,
    queryFn: async () => {
      const local = await db.getVideo(id!)
      if (!local) return fromRemote(await fetchRemoteVideo(id!))
      if (local.captions === 'file' || local.lines[0]?.w) return local
      // Saved before word timings existed: refetch and carry progress over by time. The next patch persists it.
      const lines = await fetchRemoteVideo(id!).then((r) => r.lines).catch(() => null)
      if (!lines?.length) return { ...local, lines: clampEnds(local.lines) }
      const at = (i: number) => Math.max(0, lines.findLastIndex((l) => l.start <= local.lines[i].start + 0.01))
      return { ...local, lines, lastIdx: at(local.lastIdx), done: [...new Set(local.done.map(at))] }
    },
  })
}

// ---------- library ----------

export const useLibrary = () => useQuery({ queryKey: keys.library, queryFn: db.listVideos })

export function useSaveVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (v: Video) => {
      await db.putVideo(v)
      return v
    },
    onSuccess: (v) => {
      qc.setQueryData(keys.video(v.id), v)
      qc.invalidateQueries({ queryKey: keys.library })
    },
  })
}

/** Small, frequent video updates (progress, last sentence). Optimistic so the UI never waits on IndexedDB. */
export function usePatchVideo(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: (v: Video) => Partial<Video>) => {
      const cur = qc.getQueryData<Video>(keys.video(id))!
      const next = { ...cur, ...patch(cur) }
      qc.setQueryData(keys.video(id), next)
      await db.putVideo(next)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.library }),
  })
}

export const withSubtitles = (v: Video, lines: Cue[]): Video => ({ ...v, lines, captions: 'file', done: [], lastIdx: 0 })

export function useDeleteVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: db.deleteVideo,
    onSuccess: (_, id) => {
      qc.removeQueries({ queryKey: keys.video(id) })
      qc.invalidateQueries({ queryKey: keys.library })
      qc.invalidateQueries({ queryKey: keys.notes })
      qc.invalidateQueries({ queryKey: keys.words })
    },
  })
}

export function useImportBackup() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: db.importBackup, onSuccess: () => qc.invalidateQueries() })
}

// ---------- notes & words ----------

export const useNotes = () => useQuery({ queryKey: keys.notes, queryFn: db.listNotes })
export const useWords = () => useQuery({ queryKey: keys.words, queryFn: db.listWords })

function useListMutation<T>(key: readonly string[], save: (items: T[]) => Promise<void>, load: () => Promise<T[]>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (update: (items: T[]) => T[]) => {
      const next = update(qc.getQueryData<T[]>(key) ?? (await load()))
      qc.setQueryData(key, next)
      await save(next)
    },
    onError: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useNoteActions() {
  const m = useListMutation<Note>(keys.notes, db.saveNotes, db.listNotes)
  return {
    add: (n: Omit<Note, 'id' | 'createdAt'>) => m.mutate((all) => [...all, { ...n, id: crypto.randomUUID(), createdAt: Date.now() }]),
    remove: (id: string) => m.mutate((all) => all.filter((n) => n.id !== id)),
  }
}

export function useWordActions() {
  const m = useListMutation<Word>(keys.words, db.saveWords, db.listWords)
  return {
    save: (w: Omit<Word, 'savedAt'>) => m.mutate((all) => [...all.filter((x) => x.word !== w.word), { ...w, savedAt: Date.now() }]),
    remove: (word: string) => m.mutate((all) => all.filter((x) => x.word !== word)),
  }
}

// ---------- recordings ----------

export const useRecording = (videoId: string, idx: number) =>
  useQuery({ queryKey: keys.recording(videoId, idx), queryFn: () => db.getRecording(videoId, idx) })

export function useSaveRecording(videoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ idx, blob }: { idx: number; blob: Blob }) => {
      await db.putRecording(videoId, idx, blob)
      return { idx, blob }
    },
    onSuccess: ({ idx, blob }) => qc.setQueryData(keys.recording(videoId, idx), blob),
  })
}

// ---------- dictionary ----------

export type DictEntry = {
  word: string
  ipa: string
  pos: string
  en: string
  example?: string
  audioUS?: string
  audioUK?: string
  vi: string
  found: boolean
}

type FreeDictResult = {
  phonetic?: string
  phonetics?: { text?: string; audio?: string }[]
  meanings?: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[]
}[]

type WiktionaryResult = Record<string, { partOfSpeech: string; definitions: { definition: string; examples?: string[] }[] }[]>

const stripHtml = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? ''

const getJson = <T,>(url: string): Promise<T | null> =>
  fetch(url, { signal: AbortSignal.timeout(6000) })
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null)

// English: dictionaryapi.dev (IPA + audio), falling back to Wiktionary when it's down or lacks the word.
// Vietnamese: MyMemory machine translation (free, no key, CORS-enabled). All three called in parallel.
async function lookup(word: string): Promise<DictEntry> {
  const w = encodeURIComponent(word)
  const [en, wiki, mm] = await Promise.all([
    getJson<FreeDictResult>(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`),
    getJson<WiktionaryResult>(`https://en.wiktionary.org/api/rest_v1/page/definition/${w}`),
    getJson<{ responseData?: { translatedText?: string } }>(`https://api.mymemory.translated.net/get?q=${w}&langpair=en|vi`),
  ])
  const first = en?.[0]
  const phonetics = en?.flatMap((e) => e.phonetics ?? []) ?? []
  const meaning = first?.meanings?.[0]
  const def = meaning?.definitions?.[0]
  const wikiMeaning = wiki?.en?.[0]
  const wikiDef = wikiMeaning?.definitions?.find((d) => stripHtml(d.definition))
  const vi = String(mm?.responseData?.translatedText ?? '')
  return {
    word,
    ipa: first?.phonetic ?? phonetics.find((p) => p.text)?.text ?? '',
    pos: (meaning?.partOfSpeech ?? wikiMeaning?.partOfSpeech ?? '').toLowerCase(),
    en: def?.definition ?? (wikiDef ? stripHtml(wikiDef.definition) : ''),
    example: def?.example ?? (wikiDef?.examples?.[0] ? stripHtml(wikiDef.examples[0]) : undefined),
    audioUS: phonetics.find((p) => p.audio?.includes('-us'))?.audio || phonetics.find((p) => p.audio)?.audio,
    audioUK: phonetics.find((p) => p.audio?.includes('-uk'))?.audio,
    vi: vi.toLowerCase() === word.toLowerCase() ? '' : vi,
    found: !!(def || wikiDef),
  }
}

export const useDictionary = (word: string | null) =>
  useQuery({ queryKey: keys.dict(word ?? ''), enabled: !!word, queryFn: () => lookup(word!), gcTime: 1000 * 60 * 60 })
