import * as db from '@libs/db'
import type { Video } from '@libs/db'
import { clampEnds, type Cue } from '@libs/text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from './rootApi'

type RemoteVideo = Pick<Video, 'id' | 'title' | 'author' | 'duration' | 'captions' | 'lines'>

async function fetchRemoteVideo(id: string): Promise<RemoteVideo> {
  const res = await fetch(`/api/video?id=${encodeURIComponent(id)}`).catch(() => null)
  if (res?.ok) return res.json()
  // YouTube bot-checks our server (datacenter IP). The browser can still get the title via oEmbed (CORS-enabled);
  // subtitles then come from the user (pasted transcript or .srt/.vtt).
  const o = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`)
  if (!o.ok) throw new Error(`YouTube oEmbed HTTP ${o.status}`)
  const meta: { title: string; author_name: string } = await o.json()
  return { id, title: meta.title, author: meta.author_name, duration: 0, captions: 'none', lines: [] }
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
