import { useEffect, useRef, useState } from 'react'

// Minimal typings for the YouTube IFrame Player API we use.
export interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getPlayerState(): number
  setPlaybackRate(rate: number): void
  destroy(): void
}

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string
      playerVars?: Record<string, number | string>
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void }
    },
  ) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

export const PLAYING = 1

let api: Promise<YTNamespace> | null = null

function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  api ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve(window.YT!)
    }
    document.head.append(Object.assign(document.createElement('script'), { src: 'https://www.youtube.com/iframe_api', async: true }))
  })
  return api
}

export function useYouTubePlayer(videoId: string) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [player, setPlayer] = useState<YTPlayer | null>(null)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let p: YTPlayer | undefined
    let cancelled = false
    // The API replaces its target with an iframe, so give it a node React doesn't own.
    const el = document.createElement('div')
    containerRef.current?.append(el)
    loadApi().then((YT) => {
      if (cancelled) return
      p = new YT.Player(el, {
        videoId,
        playerVars: { playsinline: 1, rel: 0, cc_load_policy: 0, iv_load_policy: 3, modestbranding: 1 },
        events: {
          onReady: () => !cancelled && setPlayer(p!),
          onStateChange: (e) => setPlaying(e.data === PLAYING),
        },
      })
    })
    return () => {
      cancelled = true
      p?.destroy()
      el.remove()
      setPlayer(null)
    }
  }, [videoId])

  return { containerRef, player, playing }
}
