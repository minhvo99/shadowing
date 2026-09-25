import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Settings } from '../settings'
import { sentenceAt, withWordTimes, type Cue } from './text'
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
 * Sentence-aware playback on top of the YouTube player. By default it just plays and the current
 * sentence follows the video. At each sentence end, in priority order:
 *   loop → replay it (after `delay`) · autoPause → stop, play goes to the next · delay → pause, then continue.
 */
export function useShadowing({ player, lines, idx, setIdx, settings, onSentenceDone }: Options) {
  const [waiting, setWaiting] = useState(false) // delay countdown
  const [atEnd, setAtEnd] = useState(false) // stopped by auto-pause
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<(() => void) | null>(null)
  const handled = useRef(-1) // sentence whose end we already acted on
  const grace = useRef({ until: 0, target: 0 }) // ignore ticks until a seek lands
  // Latest values for the polling loop, without restarting it every render.
  const latest = useRef({ lines, idx, settings, setIdx, onSentenceDone })
  latest.current = { lines, idx, settings, setIdx, onSentenceDone }

  const select = (i: number) => {
    latest.current.idx = i // the polling loop must see it before React re-renders
    latest.current.setIdx(i)
  }

  const seek = useCallback(
    (i: number) => {
      const { lines } = latest.current
      if (!player || i < 0 || i >= lines.length) return
      clearTimeout(timer.current)
      pending.current = null
      setWaiting(false)
      setAtEnd(false)
      handled.current = -1
      grace.current = { until: Date.now() + 600, target: lines[i].start }
      select(i)
      player.seekTo(lines[i].start, true)
      player.playVideo()
    },
    [player],
  )

  useEffect(() => {
    if (!player) return
    const wait = (then: () => void) => {
      player.pauseVideo()
      setWaiting(true)
      pending.current = then
      timer.current = window.setTimeout(() => {
        pending.current = null
        setWaiting(false)
        then()
      }, latest.current.settings.delay * 1000)
    }

    const id = window.setInterval(() => {
      const { lines, idx, settings, onSentenceDone } = latest.current
      if (!lines.length || player.getPlayerState() !== PLAYING) return
      const t = player.getCurrentTime()
      if (Date.now() < grace.current.until && Math.abs(t - grace.current.target) > 0.2) return

      const line = lines[idx]
      if (handled.current !== idx && t >= line.start - 0.05 && t >= line.end - 0.04) {
        handled.current = idx
        onSentenceDone(idx)
        if (settings.loop) return settings.delay ? wait(() => seek(idx)) : seek(idx)
        if (settings.autoPause) {
          player.pauseVideo()
          setAtEnd(true)
          return
        }
        if (settings.delay) return wait(() => seek(idx + 1))
      }
      if (settings.loop) return
      const i = sentenceAt(lines, t)
      if (i !== idx) select(i)
    }, 50)
    return () => {
      clearInterval(id)
      clearTimeout(timer.current)
    }
  }, [player, seek])

  useEffect(() => {
    player?.setPlaybackRate(settings.speed)
  }, [player, settings.speed])

  /** Space / play button. */
  const toggle = useCallback(
    (playing: boolean) => {
      const { lines, idx } = latest.current
      if (!player) return
      if (pending.current) {
        // Skip the rest of the delay.
        clearTimeout(timer.current)
        const then = pending.current
        pending.current = null
        setWaiting(false)
        return then()
      }
      if (playing) return player.pauseVideo()
      if (atEnd) return seek(idx + 1)
      const t = player.getCurrentTime()
      // Outside the current sentence (fresh load, or it just finished): start it from the top.
      if (lines[idx] && (t < lines[idx].start - 0.3 || t >= lines[idx].end - 0.1)) return seek(idx)
      player.playVideo()
    },
    [player, atEnd, seek],
  )

  return { playLine: seek, toggle, waiting, atEnd }
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
