import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Settings } from '../settings'
import { withWordTimes, type Cue } from './text'
import { PLAYING, type YTPlayer } from './youtube-player'

type Options = {
  player: YTPlayer | null
  lines: Cue[]
  idx: number
  setIdx: (i: number) => void
  settings: Settings
  onSentenceDone: (i: number) => void
}

/**
 * Drives sentence-by-sentence playback on top of the YouTube player:
 * play a sentence → (listen mode) pause `gap` seconds to speak → repeat `repeat` times if looping → next.
 */
export function useShadowing({ player, lines, idx, setIdx, settings, onSentenceDone }: Options) {
  const [waiting, setWaiting] = useState(false)
  const count = useRef(0)
  const timer = useRef<number | undefined>(undefined)
  // Latest values for the polling loop, without restarting it every render.
  const latest = useRef({ lines, idx, settings, setIdx, onSentenceDone })
  latest.current = { lines, idx, settings, setIdx, onSentenceDone }

  const playLine = useCallback(
    (i: number) => {
      const { lines, setIdx } = latest.current
      if (!player || i < 0 || i >= lines.length) return
      clearTimeout(timer.current)
      setWaiting(false)
      count.current = 0
      latest.current.idx = i // the polling loop must see it before React re-renders
      setIdx(i)
      player.seekTo(lines[i].start, true)
      player.playVideo()
    },
    [player],
  )

  const advance = useCallback(
    (again: boolean) => {
      const { lines, idx, setIdx } = latest.current
      if (!player) return
      setWaiting(false)
      const next = again ? idx : idx + 1
      if (next >= lines.length) return player.pauseVideo()
      if (!again) {
        count.current = 0
        latest.current.idx = next
        setIdx(next)
        // Contiguous sentences: keep playing instead of seeking (avoids a buffering hiccup).
        if (Math.abs(lines[next].start - player.getCurrentTime()) < 0.4) return player.playVideo()
      }
      player.seekTo(lines[next].start, true)
      player.playVideo()
    },
    [player],
  )

  useEffect(() => {
    if (!player) return
    const id = window.setInterval(() => {
      const { lines, idx, settings, setIdx, onSentenceDone } = latest.current
      if (!lines.length || player.getPlayerState() !== PLAYING) return
      const t = player.getCurrentTime()
      const line = lines[idx]

      // The user scrubbed in YouTube's own controls: follow along.
      if (t < line.start - 0.75 || t > line.end + 0.75) {
        const found = lines.findLastIndex((l) => l.start <= t + 0.05)
        if (found !== -1 && found !== idx) {
          count.current = 0
          latest.current.idx = found
          setIdx(found)
        }
        return
      }
      if (t < line.end - 0.05) return

      count.current += 1
      const again = settings.loop && count.current < settings.repeat
      if (!again) onSentenceDone(idx)

      // Speak-along and karaoke play straight through; only listen/blind stop for you to speak.
      if (settings.mode === 'along' || settings.mode === 'karaoke' || settings.gap === 0) return advance(again)
      player.pauseVideo()
      setWaiting(true)
      timer.current = window.setTimeout(() => advance(again), settings.gap * 1000)
    }, 80)
    return () => {
      clearInterval(id)
      clearTimeout(timer.current)
    }
  }, [player, advance])

  useEffect(() => {
    player?.setPlaybackRate(settings.speed)
  }, [player, settings.speed])

  const toggle = useCallback(
    (playing: boolean) => {
      const { lines, idx, settings } = latest.current
      if (!player) return
      if (waiting) {
        clearTimeout(timer.current)
        return advance(settings.loop && count.current < settings.repeat)
      }
      if (playing) return player.pauseVideo()
      const t = player.getCurrentTime()
      // Outside the current sentence (fresh load, or it just finished): start it from the top.
      if (lines[idx] && (t < lines[idx].start - 0.3 || t >= lines[idx].end - 0.1)) return playLine(idx)
      player.playVideo()
    },
    [player, waiting, advance, playLine],
  )

  return { playLine, toggle, waiting }
}

export type Karaoke = { word: number; dur: number; running: boolean }

/** Karaoke mode: which word of `line` is being spoken right now, and how long it lasts at this speed. */
export function useKaraoke(player: YTPlayer | null, line: Cue | undefined, enabled: boolean, playing: boolean, speed: number): Karaoke | undefined {
  const [word, setWord] = useState(-1)
  const times = useMemo(() => (line ? withWordTimes(line).w! : null), [line])

  useEffect(() => {
    if (!enabled || !player || !times) return
    const tick = () => setWord(times.findLastIndex((at) => at <= player.getCurrentTime() + 0.05))
    tick()
    const id = window.setInterval(tick, 50)
    return () => clearInterval(id)
  }, [enabled, player, times])

  if (!enabled || !times || !line) return undefined
  const next = times[word + 1] ?? line.end
  return { word, dur: Math.max(0.05, (next - (times[word] ?? line.start)) / speed), running: playing }
}
