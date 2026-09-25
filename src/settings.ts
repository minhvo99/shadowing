import { useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from './queries'

export type Lang = 'vi' | 'en'
export type View = 'text' | 'karaoke' | 'blind'

export type Settings = {
  v: 2
  lang: Lang
  speed: number
  /** Replay the current sentence until turned off. */
  loop: boolean
  /** Stop at the end of every sentence; play moves on to the next one. */
  autoPause: boolean
  /** Seconds of silence after each sentence, to speak it back. 0 = off. */
  delay: number
  view: View
}

const STORAGE_KEY = 'shadowing:settings'
const DEFAULTS: Settings = {
  v: 2,
  lang: navigator.language.startsWith('vi') ? 'vi' : 'en',
  speed: 1,
  loop: false,
  autoPause: false,
  delay: 0,
  view: 'karaoke',
}

// localStorage (sync) so the first paint already has the right language.
function read(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (s?.v === 2) return { ...DEFAULTS, ...s }
    // v1 (repeat ×3 + gap by default) is gone; keep only the language.
    return { ...DEFAULTS, ...(s?.lang && { lang: s.lang }) }
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
