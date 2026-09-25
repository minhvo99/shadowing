import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

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

export default defineConfig({ plugins: [react(), devApi()] })
