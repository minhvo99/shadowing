import { useQuery } from '@tanstack/react-query'
import { keys } from './rootApi'

export type DictEntry = {
  word: string
  ipa: string
  pos: string
  en: string
  example?: string
  audioUS?: string
  audioUK?: string
  vi: string
  found: boolean
}

type FreeDictResult = {
  phonetic?: string
  phonetics?: { text?: string; audio?: string }[]
  meanings?: { partOfSpeech: string; definitions: { definition: string; example?: string }[] }[]
}[]

type WiktionaryResult = Record<string, { partOfSpeech: string; definitions: { definition: string; examples?: string[] }[] }[]>

const stripHtml = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? ''

const getJson = <T,>(url: string): Promise<T | null> =>
  fetch(url, { signal: AbortSignal.timeout(6000) })
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null)

// English: dictionaryapi.dev (IPA + audio), falling back to Wiktionary when it's down or lacks the word.
// Vietnamese: MyMemory machine translation (free, no key, CORS-enabled). All three called in parallel.
async function lookup(word: string): Promise<DictEntry> {
  const w = encodeURIComponent(word)
  const [en, wiki, mm] = await Promise.all([
    getJson<FreeDictResult>(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`),
    getJson<WiktionaryResult>(`https://en.wiktionary.org/api/rest_v1/page/definition/${w}`),
    getJson<{ responseData?: { translatedText?: string } }>(`https://api.mymemory.translated.net/get?q=${w}&langpair=en|vi`),
  ])
  const first = en?.[0]
  const phonetics = en?.flatMap((e) => e.phonetics ?? []) ?? []
  const meaning = first?.meanings?.[0]
  const def = meaning?.definitions?.[0]
  const wikiMeaning = wiki?.en?.[0]
  const wikiDef = wikiMeaning?.definitions?.find((d) => stripHtml(d.definition))
  const vi = String(mm?.responseData?.translatedText ?? '')
  return {
    word,
    ipa: first?.phonetic ?? phonetics.find((p) => p.text)?.text ?? '',
    pos: (meaning?.partOfSpeech ?? wikiMeaning?.partOfSpeech ?? '').toLowerCase(),
    en: def?.definition ?? (wikiDef ? stripHtml(wikiDef.definition) : ''),
    example: def?.example ?? (wikiDef?.examples?.[0] ? stripHtml(wikiDef.examples[0]) : undefined),
    audioUS: phonetics.find((p) => p.audio?.includes('-us'))?.audio || phonetics.find((p) => p.audio)?.audio,
    audioUK: phonetics.find((p) => p.audio?.includes('-uk'))?.audio,
    vi: vi.toLowerCase() === word.toLowerCase() ? '' : vi,
    found: !!(def || wikiDef),
  }
}

export const useDictionary = (word: string | null) =>
  useQuery({ queryKey: keys.dict(word ?? ''), enabled: !!word, queryFn: () => lookup(word!), gcTime: 1000 * 60 * 60 })
