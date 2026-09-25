import { fetch, ProxyAgent } from 'undici'
import { parseSrv3, toSentences, type Cue } from '../src/lib/text.js'

// YouTube bot-checks datacenter IPs (Vercel). Set YT_PROXY_URL=http://user:pass@host:port to a
// *residential* proxy and every YouTube request goes through it. Unset: direct (fine locally).
const proxy = process.env.YT_PROXY_URL ? new ProxyAgent(process.env.YT_PROXY_URL) : undefined

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
  // No API key or watch-page fetch needed: saves ~1.3 MB of (paid) proxy traffic per video.
  const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38' } }, videoId: id }),
    dispatcher: proxy,
  })
  const player = (await res.json()) as any
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
    const xml = await (await fetch(`${track.baseUrl.replace(/&fmt=[^&]+/, '')}&fmt=srv3`, { headers: { 'User-Agent': UA }, dispatcher: proxy })).text()
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
