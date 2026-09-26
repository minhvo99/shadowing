/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_DICTIONARY_API_URL: string
  readonly VITE_WIKTIONARY_API_URL: string
  readonly VITE_TRANSLATE_API_URL: string
  readonly VITE_YOUTUBE_OEMBED_URL: string
  readonly VITE_SUBTITLE_DOWNLOADER_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
