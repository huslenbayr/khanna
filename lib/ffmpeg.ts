import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<FFmpeg> | null = null

export async function getFFmpeg(onProgress?: (p: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance

  if (!loadPromise) {
    loadPromise = (async () => {
      const ff = new FFmpeg()
      if (onProgress) ff.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)))
      const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
      await ff.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`,   'text/javascript'),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
      })
      ffmpegInstance = ff
      return ff
    })()
  }

  return loadPromise
}

export async function compressVideo(
  file: File,
  onProgress?: (stage: 'loading' | 'compressing', pct: number) => void,
): Promise<File> {
  const ff = await getFFmpeg(p => onProgress?.('compressing', p))

  ff.on('progress', ({ progress }) => onProgress?.('compressing', Math.round(progress * 100)))

  const ext    = file.name.split('.').pop() ?? 'mp4'
  const inName = `input.${ext}`
  const outName = 'output.mp4'

  await ff.writeFile(inName, await fetchFile(file))
  await ff.exec([
    '-i', inName,
    '-c:v', 'libx264', '-crf', '28', '-preset', 'fast',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    outName,
  ])

  const data = await ff.readFile(outName)
  await ff.deleteFile(inName)
  await ff.deleteFile(outName)

  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string)
  // Copy into a plain ArrayBuffer to avoid SharedArrayBuffer type issues
  const plain = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(plain).set(bytes)
  return new File([plain], `${file.name.replace(/\.[^.]+$/, '')}.mp4`, { type: 'video/mp4' })
}
