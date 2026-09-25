import { parseSrv3, toSentences, type Cue } from '../src/lib/text'

export type VideoData = {
  id: string
  title: string
  author: string
  duration: number
  captions: 'manual' | 'auto' | 'none'
  lines: Cue[]
}

type Track = { baseUrl: string; languageCode: string; kind?: string }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'

// Same approach as youtube-transcript-api: the ANDROID innertube client returns
// caption URLs that don't need a proof-of-origin token.
// ponytail: unofficial endpoint, YouTube may block datacenter IPs; the UI falls back to .srt/.vtt upload.
export async function fetchVideo(id: string): Promise<VideoData> {
  const html = await (await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US' } })).text()
  const key = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1]
  if (!key) throw new Error('YouTube page could not be read')

  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } }, videoId: id }),
  })
  const player = await res.json()
  if (player.playabilityStatus?.status !== 'OK') {
    throw new Error(player.playabilityStatus?.reason ?? 'Video unavailable')
  }

  const d = player.videoDetails ?? {}
  const tracks: Track[] = player.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? []
  const english = tracks.filter((t) => t.languageCode === 'en' || t.languageCode.startsWith('en-'))
  const track = english.find((t) => t.kind !== 'asr') ?? english.find((t) => t.kind === 'asr')

  let lines: Cue[] = []
  if (track) {
    // srv3 carries per-word timings for auto captions (used by karaoke mode).
    const xml = await (await fetch(`${track.baseUrl.replace(/&fmt=[^&]+/, '')}&fmt=srv3`, { headers: { 'User-Agent': UA } })).text()
    lines = toSentences(parseSrv3(xml))
  }

  return {
    id,
    title: d.title ?? id,
    author: d.author ?? '',
    duration: Number(d.lengthSeconds ?? 0),
    captions: !track || !lines.length ? 'none' : track.kind === 'asr' ? 'auto' : 'manual',
    lines,
  }
}
