import { expect, test } from 'vitest'
import { clampEnds, decodeEntities, formatTime, parseSrv3, parseSubtitleFile, parseYouTubeId, toCsv, toSentences, withWordTimes, wordKey } from './text'

test('parseYouTubeId accepts every link shape and bare ids', () => {
  const id = 'aB3xY9kLm2Q'
  for (const u of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?feature=share&v=${id}&t=30`,
    `https://youtu.be/${id}?si=x`,
    `https://youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `  ${id}  `,
  ]) expect(parseYouTubeId(u)).toBe(id)
  expect(parseYouTubeId('https://vimeo.com/123')).toBeNull()
  expect(parseYouTubeId('')).toBeNull()
})

test('decodes YouTube double-encoded entities', () => {
  expect(decodeEntities('I&amp;#39;m &amp;quot;ok&amp;quot; &amp; fine')).toBe('I\'m "ok" & fine')
})

test('parses srv3: word timings from auto captions, cue timings from manual ones', () => {
  const asr = '<timedtext format="3"><body><p t="654" d="3906" w="1">[applause]</p><p t="2389" d="2171" w="1" a="1">\n</p><p t="2399" d="4081" w="1"><s ac="0">Hey</s><s t="321" ac="0"> everyone.</s><s t="961" ac="0"> you&#39;re</s></p></body></timedtext>'
  expect(parseSrv3(asr)).toEqual([
    { start: 0.654, end: 4.56, text: '[applause]' },
    { start: 2.399, end: 6.48, text: "Hey everyone. you're", w: [2.399, 2.72, 3.36] },
  ])
  const manual = '<timedtext format="3"><body><p t="12645" d="1370">So in college,</p><p t="16937" d="2462">which means I had to write\na lot of papers&amp;#39;</p></body></timedtext>'
  expect(parseSrv3(manual).map((c) => c.text)).toEqual(['So in college,', "which means I had to write a lot of papers'"])
})

test('merges fragments into sentences and keeps one start time per word', () => {
  const s = toSentences([
    { start: 12, end: 14, text: 'So in college,' },
    { start: 15, end: 17, text: 'I was a government major.', w: [15, 15.2, 15.4, 15.5, 16.2] },
    { start: 17, end: 19, text: 'Now, when' },
  ])
  expect(s.map((c) => c.text)).toEqual(['So in college, I was a government major.', 'Now, when'])
  expect(s[0].start).toBe(12)
  expect(s[0].w).toHaveLength(s[0].text.split(' ').length)
  expect(s[0].w!.slice(3)).toEqual([15, 15.2, 15.4, 15.5, 16.2])
})

test('estimates word times from length when captions have none', () => {
  const w = withWordTimes({ start: 10, end: 14, text: 'a bb ccc' }).w!
  expect(w[0]).toBe(10)
  expect(w).toEqual([...w].sort((a, b) => a - b))
  expect(w[2]).toBeLessThan(14)
  expect(w[2] - w[1]).toBeGreaterThan(w[1] - w[0]) // longer word before it, more time
})

test('splits unpunctuated captions into bounded chunks and on long gaps', () => {
  const cues = Array.from({ length: 6 }, (_, i) => ({ start: i * 2, end: i * 2 + 2, text: `w${i}` }))
  expect(toSentences(cues, 7).map((c) => c.text)).toEqual(['w0 w1 w2 w3', 'w4 w5'])
  expect(toSentences([{ start: 0, end: 1, text: 'a' }, { start: 5, end: 6, text: 'b' }])).toHaveLength(2)
})

test('auto-caption cues overlap; a sentence must end where the next one starts', () => {
  // Real ASR cues: each `dur` runs ~2s into the next cue.
  const cues = [
    { start: 27.599, end: 32.32, text: 'research product and go to market. So we' },
    { start: 30.48, end: 34.0, text: 'do a mixture of working on internal' },
    { start: 32.32, end: 36.32, text: 'projects as well as directly with' },
    { start: 34.0, end: 37.92, text: 'customers who are building agents at the' },
    { start: 36.32, end: 40.239, text: 'frontier.' },
  ]
  const s = toSentences(cues)
  for (let i = 0; i + 1 < s.length; i++) expect(s[i].end).toBeLessThanOrEqual(s[i + 1].start)
  expect(s.at(-1)!.text.endsWith('frontier.')).toBe(true)
  // Lines already saved with overlapping ends get fixed the same way.
  expect(clampEnds([{ start: 0, end: 5, text: 'a' }, { start: 3, end: 6, text: 'b' }])).toEqual([
    { start: 0, end: 3, text: 'a' },
    { start: 3, end: 6, text: 'b' },
  ])
})

test('parses srt and vtt', () => {
  const srt = '1\n00:00:01,000 --> 00:00:03,500\nHello <i>there</i>\n\n2\n00:01:02,000 --> 00:01:04,000\nBye.'
  expect(parseSubtitleFile(srt)).toEqual([
    { start: 1, end: 3.5, text: 'Hello there' },
    { start: 62, end: 64, text: 'Bye.' },
  ])
  const vtt = 'WEBVTT\n\n00:05.000 --> 00:07.000 align:start\nHi.'
  expect(parseSubtitleFile(vtt)).toEqual([{ start: 5, end: 7, text: 'Hi.' }])
})

test('small helpers', () => {
  expect(formatTime(65.9)).toBe('1:05')
  expect(formatTime(3725)).toBe('1:02:05')
  expect(wordKey('“That’ll,')).toBe("that'll")
  expect(wordKey('please?')).toBe('please')
  expect(toCsv([['a "b"', 'c']])).toBe('"a ""b""","c"')
})
