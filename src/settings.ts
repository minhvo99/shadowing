import { useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from './queries'

export type Lang = 'vi' | 'en'
export type Mode = 'listen' | 'along' | 'blind' | 'karaoke'

export type Settings = {
  v: 1
  lang: Lang
  speed: number
  loop: boolean
  repeat: number
  gap: number
  mode: Mode
}

const STORAGE_KEY = 'shadowing:settings'
const DEFAULTS: Settings = {
  v: 1,
  lang: navigator.language.startsWith('vi') ? 'vi' : 'en',
  speed: 1,
  loop: true,
  repeat: 3,
  gap: 2,
  mode: 'listen',
}

// localStorage (sync) so the first paint already has the right language.
function read(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return s?.v === 1 ? { ...DEFAULTS, ...s } : DEFAULTS
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
