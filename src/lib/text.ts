/** `w`: start time of each word in `text.split(' ')`, for karaoke highlighting. */
export type Cue = { start: number; end: number; text: string; w?: number[] }

const ID_RE = /^[A-Za-z0-9_-]{11}$/
const URL_RE = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/

export function parseYouTubeId(input: string): string | null {
  const s = input.trim()
  if (ID_RE.test(s)) return s
  return s.match(URL_RE)?.[1] ?? null
}

export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

export function decodeEntities(s: string): string {
  // YouTube double-encodes (&amp;#39;), so decode until stable.
  let prev
  do {
    prev = s
    s = s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e: string) => {
      if (e[0] !== '#') return ENTITIES[e.toLowerCase()] ?? m
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    })
  } while (s !== prev)
  return s
}

const clean = (s: string) => decodeEntities(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

// YouTube srv3: <p t="ms" d="ms">…</p>. Auto captions wrap each word as <s t="offset ms">word</s>.
export function parseSrv3(xml: string): Cue[] {
  const cues: Cue[] = []
  for (const [, t, d, inner] of xml.matchAll(/<p t="(\d+)" d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g)) {
    const ms = Number(t)
    const words = [...inner.matchAll(/<s(?: t="(\d+)")?[^>]*>([^<]*)<\/s>/g)].flatMap(([, off, word]) =>
      clean(word).split(' ').filter(Boolean).map((text) => ({ text, at: (ms + Number(off ?? 0)) / 1000 })),
    )
    const cue: Cue = { start: ms / 1000, end: (ms + Number(d)) / 1000, text: words.length ? words.map((x) => x.text).join(' ') : clean(inner) }
    if (words.length) cue.w = words.map((x) => x.at)
    if (cue.text) cues.push(cue)
  }
  return cues
}

function toSeconds(ts: string): number {
  const parts = ts.trim().replace(',', '.').split(':').map(Number)
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

// Handles both .srt and .vtt.
export function parseSubtitleFile(src: string): Cue[] {
  const cues: Cue[] = []
  for (const block of src.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n')
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i === -1) continue
    const [a, b] = lines[i].split('-->')
    const text = clean(lines.slice(i + 1).join(' '))
    if (text) cues.push({ start: toSeconds(a), end: toSeconds(b.trim().split(/\s/)[0]), text })
  }
  return cues
}

const SENTENCE_END = /[.?!…]["'”’)\]]?$/

// Auto-captions roll: each cue's `dur` runs into the next cue. End every cue where the next begins.
export const clampEnds = (cues: Cue[]): Cue[] =>
  cues.map((c, i) => (i + 1 < cues.length && c.end > cues[i + 1].start ? { ...c, end: cues[i + 1].start } : c))

// No per-word timing (manual captions, .srt/.vtt): share the cue's time out by word length.
// ponytail: length ≈ speaking time; real word timings only come from YouTube auto captions.
export function withWordTimes(c: Cue): Cue {
  if (c.w) return c
  const words = c.text.split(' ')
  const total = words.reduce((n, w) => n + w.length + 1, 0)
  let acc = 0
  const w = words.map((word) => {
    const at = c.start + ((c.end - c.start) * acc) / total
    acc += word.length + 1
    return at
  })
  return { ...c, w }
}

// Caption cues are fragments; merge them into sentences you can shadow.
// ponytail: punctuation heuristic; auto captions without punctuation fall back to ~7s chunks.
export function toSentences(cues: Cue[], maxSeconds = 7): Cue[] {
  const out: Cue[] = []
  let cur: Cue | null = null
  for (const c of clampEnds(cues).map(withWordTimes)) {
    if (cur && c.start - cur.end > 1.5) {
      out.push(cur)
      cur = null
    }
    cur = cur ? { start: cur.start, end: c.end, text: `${cur.text} ${c.text}`, w: [...cur.w!, ...c.w!] } : { ...c }
    if (SENTENCE_END.test(cur.text) || cur.end - cur.start >= maxSeconds) {
      out.push(cur)
      cur = null
    }
  }
  if (cur) out.push(cur)
  return out
}

export function wordKey(token: string): string {
  return token.toLowerCase().replace(/’/g, "'").replace(/^[^a-z']+|[^a-z']+$/g, '')
}

export function maskText(text: string): string {
  return text.replace(/[A-Za-z’']/g, '•')
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
}
