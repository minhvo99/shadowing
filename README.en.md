# Shadowing Studio

**English** · [Tiếng Việt](README.md)

Practice English shadowing with YouTube videos: paste a link → practice sentence by sentence (loop, pause to speak, change speed, record and compare, karaoke-style subtitles) → look up words, take notes, keep a notebook. Vietnamese / English interface, light / dark theme.

React 19 · React Router · TanStack Query · MUI · Vite. Deploys to Vercel; no server or database to run.

## Run locally

```bash
pnpm install
pnpm dev      # http://localhost:5173 (serves /api/video through a Vite middleware)
pnpm test
pnpm build
```

## Deploy

Import the repo into Vercel (framework: Vite). `api/video.ts` becomes a serverless function; `vercel.json` rewrites every other route to the SPA.

## YouTube proxy (optional)

On Vercel, YouTube blocks the server's IP ("Sign in to confirm you're not a bot"). Without a proxy, users paste the transcript or upload a subtitle file instead. To fetch subtitles automatically:

1. Set up an HTTP proxy with a **residential IP** (datacenter/VPS proxies get blocked just like Vercel). Self-hosted at home or a residential proxy service both work.
2. Vercel → Project → Settings → Environment Variables: `YT_PROXY_URL` = `http://user:pass@host:port`.
3. Redeploy. Every YouTube request made by `api/video.ts` then goes through the proxy; each video costs ~175 KB and the result is cached by the CDN for a day.

## Data

- Stored in the browser's IndexedDB (`src/lib/db.ts`): videos with subtitles and progress, notes, saved words, recordings.
- Export / import a JSON file on the Library page to back up or move to another device (recordings not included).
- Settings (language, speed, repeat…) live in localStorage; the theme is stored by MUI (`mui-mode`).

## External services

| What | Source | Notes |
|---|---|---|
| Title + subtitles | `api/video.ts` calls YouTube (innertube, unofficial) | Blocked on Vercel without a proxy; the title then comes from oEmbed and subtitles from a pasted transcript or a `.srt/.vtt` upload |
| Video playback | YouTube IFrame Player API | |
| Definitions, IPA, audio | dictionaryapi.dev, falling back to Wiktionary | Uses the browser's speech synthesis when there is no audio |
| Vietnamese meaning | MyMemory (machine translation) | Free tier ~5000 chars/day per IP; users can edit it before saving |
