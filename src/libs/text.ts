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

const INLINE_TIME = /<(\d{2}:\d{2}:\d{2}\.\d{3})>/

// YouTube auto-caption VTT rolls: each cue repeats the previous line and adds a new one whose words
// carry their own start time ("hey<00:00:00.480><c> everybody</c>…"). Returns one cue per word.
function parseRollingVtt(src: string): Cue[] {
  const words: { at: number; text: string }[] = []
  for (const block of src.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n')
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i === -1) continue
    const [a, b] = lines[i].split('-->')
    const start = toSeconds(a)
    if (toSeconds(b.trim().split(/\s/)[0]) - start < 0.05) continue // 10ms "freeze" cue: the finished line again
    const line = lines.slice(i + 1).filter((l) => l.trim()).at(-1) // earlier lines were carried over
    if (!line) continue
    const parts = line.split(INLINE_TIME) // [first words, time, words, time, words, …]
    for (let k = 0; k < parts.length; k += 2) {
      let at = k ? toSeconds(parts[k - 1]) : start
      const text = clean(parts[k])
      // The line's first word has no time of its own; the cue starts when the previous line ended, often well
      // before the word is said. Place it just before the next word (~60ms per letter) instead.
      if (!k && parts[1]) at = Math.max(start, toSeconds(parts[1]) - 0.06 * text.length - 0.05)
      for (const word of text.split(' ').filter(Boolean)) words.push({ at, text: word })
    }
  }
  return words.map((x, k) => ({ start: x.at, end: words[k + 1]?.at ?? x.at + 1, text: x.text, w: [x.at] }))
}

// Handles .srt, .vtt and YouTube's rolling auto-caption .vtt.
export function parseSubtitleFile(src: string): Cue[] {
  if (INLINE_TIME.test(src)) return parseRollingVtt(src)
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

const STAMP = /^((?:\d{1,2}:)?\d{1,2}:\d{2})(?:\s+(.*))?$/

// Text copied from YouTube's "Show transcript" panel: a timestamp line (or prefix) starts each segment.
// ponytail: text before the first timestamp is dropped; chapter headings between segments stick to the previous one.
export function parseTranscriptText(src: string): Cue[] {
  const cues: Cue[] = []
  for (const raw of src.split('\n')) {
    const line = raw.trim()
    const m = line.match(STAMP)
    if (m) cues.push({ start: toSeconds(m[1]), end: 0, text: m[2] ?? '' })
    else if (line && cues.length) cues[cues.length - 1].text += ` ${line}`
  }
  return cues
    .map((c, i) => ({ start: c.start, end: cues[i + 1]?.start ?? c.start + 5, text: clean(c.text) }))
    .filter((c) => c.text)
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
  const all = clampEnds(cues).map(withWordTimes)
  all.forEach((c, i) => {
    if (cur && c.start - cur.end > 1.5) {
      out.push(cur)
      cur = null
    }
    cur = cur ? { start: cur.start, end: c.end, text: `${cur.text} ${c.text}`, w: [...cur.w!, ...c.w!] } : { ...c }
    // No punctuation (auto captions)? Cut at a pause: silence ≈ next start − (last word start + ~60ms per letter).
    const last = cur.text.slice(cur.text.lastIndexOf(' ') + 1)
    const pause = all[i + 1] ? all[i + 1].start - (cur.w!.at(-1)! + 0.06 * last.length) : 0
    if (SENTENCE_END.test(cur.text) || cur.end - cur.start >= maxSeconds || (cur.end - cur.start >= 2.5 && pause >= 0.45)) {
      out.push(cur)
      cur = null
    }
  })
  if (cur) out.push(cur)
  return out
}

/** Sentence shown at time `t` during continuous playback: a gap between two sentences splits at its midpoint. */
export function sentenceAt(lines: Cue[], t: number): number {
  for (let i = 0; i + 1 < lines.length; i++) if (t < (lines[i].end + lines[i + 1].start) / 2) return i
  return Math.max(0, lines.length - 1)
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
