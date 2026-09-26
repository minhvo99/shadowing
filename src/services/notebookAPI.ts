import * as db from '@libs/db'
import type { Note, Word } from '@libs/db'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from './rootApi'

export const useNotes = () => useQuery({ queryKey: keys.notes, queryFn: db.listNotes })
export const useWords = () => useQuery({ queryKey: keys.words, queryFn: db.listWords })

function useListMutation<T>(key: readonly string[], save: (items: T[]) => Promise<void>, load: () => Promise<T[]>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (update: (items: T[]) => T[]) => {
      const next = update(qc.getQueryData<T[]>(key) ?? (await load()))
      qc.setQueryData(key, next)
      await save(next)
    },
    onError: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useNoteActions() {
  const m = useListMutation<Note>(keys.notes, db.saveNotes, db.listNotes)
  return {
    add: (n: Omit<Note, 'id' | 'createdAt'>) => m.mutate((all) => [...all, { ...n, id: crypto.randomUUID(), createdAt: Date.now() }]),
    remove: (id: string) => m.mutate((all) => all.filter((n) => n.id !== id)),
  }
}

export function useWordActions() {
  const m = useListMutation<Word>(keys.words, db.saveWords, db.listWords)
  return {
    save: (w: Omit<Word, 'savedAt'>) => m.mutate((all) => [...all.filter((x) => x.word !== w.word), { ...w, savedAt: Date.now() }]),
    remove: (word: string) => m.mutate((all) => all.filter((x) => x.word !== word)),
  }
}
