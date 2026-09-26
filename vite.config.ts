import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Serves the Vercel function in `vite dev`, so no `vercel dev` login is needed locally.
const devApi = (): Plugin => ({
  name: 'dev-api',
  configureServer(server) {
    server.middlewares.use('/api/video', async (req, res) => {
      const { GET } = await server.ssrLoadModule('/api/video.ts')
      const r: Response = await GET(new Request(`http://localhost${req.originalUrl}`))
      res.statusCode = r.status
      res.setHeader('Content-Type', 'application/json')
      res.end(await r.text())
    })
  },
})

const src = (dir: string) => fileURLToPath(new URL(`./src/${dir}`, import.meta.url))

export default defineConfig(({ mode }) => {
  // Server-only vars (YT_PROXY_URL in .env.local) for the dev API middleware; Vercel injects them in production.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), tailwindcss(), devApi()],
    resolve: {
      alias: {
        '@/': src(''), // ends with '/'
        '@components': src('components'),
        '@configs': src('configs'),
        '@hooks': src('hooks'),
        '@libs': src('libs'),
        '@pages': src('pages'),
        '@services': src('services'),
        '@utils': src('utils'),
      },
    },
  }
})
