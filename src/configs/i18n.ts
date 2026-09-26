import { SETTINGS_STORAGE_KEY } from '@libs/constants'
import en from '@/locales/en.json'
import vi from '@/locales/vi.json'
import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

export const LANGUAGES = ['vi', 'en'] as const
export type Lang = (typeof LANGUAGES)[number]

// Typed keys: t('headline') is checked against vi.json.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof vi }
  }
}

// One-time: carry over the language chosen before i18next, when it lived in our settings.
try {
  const old = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? 'null')?.lang
  if (old && !localStorage.getItem('i18nextLng')) localStorage.setItem('i18nextLng', old)
} catch {
  /* storage blocked: fall back to the browser language */
}

i18n
  .use(LanguageDetector) // remembers the choice in localStorage ("i18nextLng"), else the browser language
  .use(initReactI18next)
  .init({
    resources: { vi: { translation: vi }, en: { translation: en } },
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true, // en-US → en
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] },
  })

const setHtmlLang = (lng: string) => (document.documentElement.lang = lng)
setHtmlLang(i18n.resolvedLanguage ?? 'en')
i18n.on('languageChanged', setHtmlLang)

export default i18n
