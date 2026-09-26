export const MONO = '"JetBrains Mono", ui-monospace, monospace'

export const SPEEDS = [0.5, 0.75, 1, 1.25]

/** Seconds of silence after each sentence; 0 = off. */
export const DELAYS = [0, 1, 1.5, 2, 3]

export const SETTINGS_STORAGE_KEY = 'shadowing:settings'

/** Lesson catalog: one public/ folder per level, each with the playlist's download-report.json and .vtt files.
 *  Add a level (B1, B2…) by dropping its folder into public/ and adding a line here. */
export const LEVELS = [
  { level: 'A1', dir: 'A1-english-listening-practice' },
  { level: 'A2', dir: 'A2-english-listening-practice' },
] as const

export type Level = (typeof LEVELS)[number]['level']
