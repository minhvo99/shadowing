import { useRef, useState } from 'react'

export function useRecorder(onDone: (blob: Blob) => void, onError: () => void) {
  const [recording, setRecording] = useState(false)
  const rec = useRef<MediaRecorder | null>(null)

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const r = new MediaRecorder(stream)
      const chunks: Blob[] = []
      r.ondataavailable = (e) => chunks.push(e.data)
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        onDone(new Blob(chunks, { type: r.mimeType }))
      }
      r.start()
      rec.current = r
      setRecording(true)
    } catch {
      onError()
    }
  }

  const stop = () => {
    rec.current?.stop()
    rec.current = null
    setRecording(false)
  }

  return { recording, toggle: () => (recording ? stop() : start()), stop }
}

/** Peak amplitude per bucket, 0..1, for drawing a waveform. */
export async function waveform(blob: Blob, buckets = 72): Promise<number[]> {
  const ctx = new AudioContext()
  try {
    const audio = await ctx.decodeAudioData(await blob.arrayBuffer())
    const data = audio.getChannelData(0)
    const size = Math.max(1, Math.floor(data.length / buckets))
    const peaks = Array.from({ length: buckets }, (_, b) => {
      let max = 0
      for (let i = b * size; i < (b + 1) * size && i < data.length; i++) max = Math.max(max, Math.abs(data[i]))
      return max
    })
    const top = Math.max(...peaks, 0.01)
    return peaks.map((p) => p / top)
  } finally {
    ctx.close()
  }
}
