import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, refetchOnWindowFocus: false, retry: 1 } },
})

export const keys = {
  library: ['library'] as const,
  video: (id: string) => ['video', id] as const,
  notes: ['notes'] as const,
  words: ['words'] as const,
  dict: (word: string) => ['dict', word] as const,
  recording: (videoId: string, idx: number) => ['recording', videoId, idx] as const,
  settings: ['settings'] as const,
}
