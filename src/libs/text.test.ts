import { expect, test } from 'vitest'
import { clampEnds, decodeEntities, formatTime, parseSrv3, parseSubtitleFile, parseTranscriptText, parseYouTubeId, sentenceAt, toCsv, toSentences, withWordTimes, wordKey } from './text'

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
  // continuous speech (words fill each 2s cue, no pauses) → capped at 7s
  const cues = Array.from({ length: 6 }, (_, i) => ({ start: i * 2, end: i * 2 + 2, text: `w${i} and so on and so on and so on` }))
  expect(toSentences(cues, 7).map((c) => c.text.split(' ')[0])).toEqual(['w0', 'w4'])
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

test('parses a transcript copied from YouTube "Show transcript"', () => {
  // Desktop copy: timestamp and text on separate lines, plus chapter headings and blank lines.
  const copied = 'Intro\n0:00\nhi everyone\n\n0:03\ntoday we talk\n1:02:05\nlast line'
  expect(parseTranscriptText(copied)).toEqual([
    { start: 0, end: 3, text: 'hi everyone' },
    { start: 3, end: 3725, text: 'today we talk' },
    { start: 3725, end: 3730, text: 'last line' },
  ])
  // Some browsers copy each row onto one line; multi-line text joins up.
  expect(parseTranscriptText('0:01 hello there\n0:04 how are\nyou')).toEqual([
    { start: 1, end: 4, text: 'hello there' },
    { start: 4, end: 9, text: 'how are you' },
  ])
  expect(parseTranscriptText('no timestamps here')).toEqual([])
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

test('sentenceAt follows the video; a silent gap belongs half to each side', () => {
  const lines = [
    { start: 2, end: 4, text: 'a' },
    { start: 4, end: 6, text: 'b' },
    { start: 8, end: 10, text: 'c' },
  ]
  expect([0, 3, 4.1, 6.9, 7.1, 20].map((t) => sentenceAt(lines, t))).toEqual([0, 0, 1, 1, 2, 2])
})

test('reads YouTube rolling auto-caption VTT once per word, with word timings', () => {
  // Verbatim from public/A1-english-listening-practice/01-…Language_Learning.vtt
  const vtt = `WEBVTT
Kind: captions
Language: en

00:00:00.030 --> 00:00:02.480 align:start position:0%
 
hey<00:00:00.480><c> everybody</c><00:00:01.079><c> welcome</c><00:00:01.589><c> to</c><00:00:01.709><c> this</c><00:00:01.829><c> a</c><00:00:02.010><c> one</c>

00:00:02.480 --> 00:00:02.490 align:start position:0%
hey everybody welcome to this a one
 

00:00:02.490 --> 00:00:05.480 align:start position:0%
hey everybody welcome to this a one
english<00:00:03.120><c> listening</c><00:00:03.449><c> practice</c><00:00:03.959><c> video</c><00:00:04.560><c> you</c><00:00:05.310><c> can</c>

00:00:05.480 --> 00:00:05.490 align:start position:0%
english listening practice video you can
 `
  const cues = parseSubtitleFile(vtt)
  const words = cues.flatMap((c) => c.text.split(' '))
  expect(words.join(' ')).toBe('hey everybody welcome to this a one english listening practice video you can')
  const w = cues.flatMap((c) => c.w!)
  expect(w).toHaveLength(words.length)
  expect(w.slice(0, 3)).toEqual([0.25, 0.48, 1.079]) // "hey" placed just before "everybody"
  expect(w[7]).toBeCloseTo(3.12 - 0.06 * 7 - 0.05) // "english" (no own time) placed just before "listening"
  expect(toSentences(cues).every((s) => s.w!.length === s.text.split(' ').length)).toBe(true)
})

test('unpunctuated speech splits at real pauses (≥2.5s in), and never runs past 7s', () => {
  // one word per cue, like rolling auto-captions: "so today" … 1.2s of silence … "we talk about food"
  const at = (text: string, start: number) => ({ start, end: start + 0.3, text, w: [start] })
  const cues = [at('so', 0), at('today', 0.4), at('i', 1), at('want', 1.3), at('to', 1.7), at('practice', 2), at('with', 2.6), at('you', 2.9), at('we', 4.4), at('talk', 4.7), at('about', 5), at('food', 5.4)]
  expect(toSentences(cues).map((s) => s.text)).toEqual(['so today i want to practice with you', 'we talk about food'])
})
