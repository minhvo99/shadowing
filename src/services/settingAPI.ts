import { useQuery, useQueryClient } from '@tanstack/react-query'
import { SETTINGS_STORAGE_KEY as STORAGE_KEY } from '@libs/constants'
import { keys } from './rootApi'

export type View = 'text' | 'karaoke' | 'blind'

export type Settings = {
  v: 2
  speed: number
  /** Replay the current sentence until turned off. */
  loop: boolean
  /** Stop at the end of every sentence; play moves on to the next one. */
  autoPause: boolean
  /** Seconds of silence after each sentence, to speak it back. 0 = off. */
  delay: number
  view: View
  /** Subtitles drawn over the video. */
  overlay: boolean
}

const DEFAULTS: Settings = {
  v: 2,
  speed: 1,
  loop: false,
  autoPause: false,
  delay: 0,
  view: 'karaoke',
  overlay: true,
}

// localStorage (sync) so the first paint already has the saved preferences. Language lives in i18next.
function read(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    // v1 (repeat ×3 + gap by default) is dropped.
    return s?.v === 2 ? { ...DEFAULTS, ...s } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function useSettings(): Settings {
  return useQuery({ queryKey: keys.settings, queryFn: read, initialData: read, staleTime: Infinity }).data
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return (patch: Partial<Settings>) => {
    const next = { ...qc.getQueryData<Settings>(keys.settings)!, ...patch }
    qc.setQueryData(keys.settings, next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
}
