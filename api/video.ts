import { parseYouTubeId } from '../src/libs/text.js'
import { fetchVideo } from './_youtube.js'

// GET /api/video?id=<youtube id> → title, duration and English captions merged into sentences.
export async function GET(request: Request): Promise<Response> {
  const id = parseYouTubeId(new URL(request.url).searchParams.get('id') ?? '')
  if (!id) return Response.json({ error: 'Invalid video id' }, { status: 400 })
  try {
    const data = await fetchVideo(id)
    return Response.json(data, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 502 })
  }
}
