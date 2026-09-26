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
