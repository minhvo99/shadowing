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
