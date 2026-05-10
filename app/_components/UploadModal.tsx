'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, Clock, MapPin, Navigation, Upload, X } from 'lucide-react'
import { compressVideo } from '@/lib/ffmpeg'

type Props = {
  open: boolean
  onClose: () => void
  onPosted: (lat?: number, lng?: number) => void
  defaultLat?: number
  defaultLng?: number
}

type Stage = 'idle' | 'compressing' | 'uploading' | 'done' | 'error'

const DEFAULT_LAT = 47.9014
const DEFAULT_LNG = 106.9155

const POST_TYPES = [
  { value: 'info',     label: 'Мэдээлэл',       icon: '📍' },
  { value: 'issue',    label: 'Асуудал',          icon: '⚠️' },
  { value: 'landmark', label: 'Онцгой газар',    icon: '🏛️' },
  { value: 'event',    label: 'Арга хэмжээ',     icon: '🎉' },
  { value: 'show',     label: 'Тоглолт/Шоу',     icon: '🎭' },
  { value: 'safety',   label: 'Аюулгүй байдал',  icon: '🚨' },
] as const

type PostTypeValue = typeof POST_TYPES[number]['value']

const MB = 1024 * 1024
const VIDEO_COMPRESS_THRESHOLD = 20 * MB

export default function UploadModal({
  open, onClose, onPosted,
  defaultLat,
  defaultLng,
}: Props) {
  const [file, setFile]             = useState<File | null>(null)
  const [preview, setPreview]       = useState('')
  const [title, setTitle]           = useState('')
  const [caption, setCaption]       = useState('')
  const [postType, setPostType]     = useState<PostTypeValue>('info')
  const [locationName, setLN]       = useState('')
  const [lat, setLat]               = useState(defaultLat ?? DEFAULT_LAT)
  const [lng, setLng]               = useState(defaultLng ?? DEFAULT_LNG)
  const [stage, setStage]           = useState<Stage>('idle')
  const [progress, setProgress]     = useState(0)
  const [statusMsg, setStatusMsg]   = useState('')
  const [error, setError]           = useState('')
  const [dragging, setDragging]     = useState(false)
  const [startsAt, setStartsAt]     = useState('')
  const [endsAt, setEndsAt]         = useState('')
  const [showTime, setShowTime]     = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)

  const inputRef  = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }, [])

  const requestLocation = useCallback(() => {
    // Утсаар IP хаягаар хандах үед Geolocation ажиллахгүй байх магадлалтай
    if (typeof window !== 'undefined' && !window.isSecureContext && !window.location.hostname.includes('localhost')) {
      setError('Байршил тогтоохын тулд HTTPS эсвэл localhost холболт шаардлагатай.');
      return;
    }

    if (!navigator.geolocation) {
      setError('Таны хөтөч байршил тогтоогчийг дэмжихгүй байна.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
      },
      (err) => {
        console.error('Geolocation Error:', err);
        setError(err.code === 1 ? 'Байршил тогтоох эрхийг зөвшөөрнө үү. (HTTPS шаардлагатай)' : 'Байршил тогтооход алдаа гарлаа.');
      }
    )
  }, [])

  useEffect(() => {
    if (!open) {
      stopCamera()
    } else {
      // Хэрэв DashboardShell-ээс тодорхой байршил ирээгүй бол (longPressLocation === null) одоогийн GPS байршил авна
      if (defaultLat === undefined || defaultLat === null) {
        requestLocation()
      } else {
        setLat(Number(defaultLat))
        setLng(Number(defaultLng ?? DEFAULT_LNG))
      }
    }
  }, [open, stopCamera, defaultLat, defaultLng, requestLocation])

  // Attach stream once the video element is in the DOM
  useEffect(() => {
    if (cameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraOpen])

  if (!open) return null

  const pickFile = (picked: File) => {
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
  }

  const reset = () => {
    stopCamera()
    setFile(null); setPreview(''); setTitle(''); setCaption(''); setPostType('info')
    setLN(''); setLat(defaultLat ?? DEFAULT_LAT); setLng(defaultLng ?? DEFAULT_LNG)
    setStartsAt(''); setEndsAt(''); setShowTime(false)
    setStage('idle'); setProgress(0); setStatusMsg(''); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.type.startsWith('image/') || f.type.startsWith('video/'))) pickFile(f)
  }

  const startCamera = async () => {
    if (!window.isSecureContext) {
      setError('Камер ашиглахын тулд HTTPS холболт шаардлагатай. (Локал IP хаягаар хандаж байгаа бол ажиллахгүй)')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
    } catch {
      setError('Камер нээх боломжгүй. Зөвшөөрөл шаардлагатай.')
    }
  }

  const capturePhoto = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      pickFile(new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' }))
      stopCamera()
    }, 'image/jpeg', 0.92)
  }

  const handlePost = async () => {
    if (!file || !title.trim()) return
    setError('')

    let uploadFile = file

    if (file.type.startsWith('video/') && file.size > VIDEO_COMPRESS_THRESHOLD) {
      try {
        setStage('compressing'); setProgress(0); setStatusMsg('Видео ачааллаж байна...')
        uploadFile = await compressVideo(file, (substage, pct) => {
          if (substage === 'loading') { setStatusMsg('FFmpeg ачааллаж байна...'); setProgress(Math.round(pct * 0.3)) }
          else { setStatusMsg('Видео боловсруулж байна...'); setProgress(30 + Math.round(pct * 0.5)) }
        })
        setProgress(80); setStatusMsg('Бичлэг бэлэн боллоо')
      } catch {
        setStage('error'); setError('Видео боловсруулахад алдаа гарлаа'); return
      }
    }

    try {
      setStage('uploading')
      setProgress(stage === 'compressing' ? 82 : 10)
      setStatusMsg('Presign авч байна...')

      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: uploadFile.name, contentType: uploadFile.type }),
      })
      if (!presignRes.ok) throw new Error('Presign failed')
      const { signedUrl, publicUrl } = await presignRes.json() as { signedUrl: string; publicUrl: string }

      setProgress(prev => Math.max(prev, 30)); setStatusMsg('Cloudflare руу илгээж байна...')

      const uploadRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': uploadFile.type }, body: uploadFile })
      if (!uploadRes.ok) throw new Error('R2 upload failed')

      setProgress(80); setStatusMsg('Хадгалж байна...')

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:         title.trim(),
          caption:       caption.trim() || null,
          post_type:     postType,
          media_url:     publicUrl,
          media_type:    uploadFile.type.startsWith('video/') ? 'video' : 'photo',
          lat, lng,
          location_name: locationName.trim() || null,
          starts_at:     startsAt ? new Date(startsAt).toISOString() : null,
          ends_at:       endsAt   ? new Date(endsAt).toISOString()   : null,
        }),
      })
      if (!postRes.ok) {
        const body = await postRes.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Post save failed')
      }

      setProgress(100); setStage('done')
      setTimeout(() => { onPosted(lat, lng); handleClose() }, 700)
    } catch (err) {
      setStage('error')
      setError(err instanceof Error ? err.message : 'Upload амжилтгүй боллоо.')
    }
  }

  const isVideo  = file?.type.startsWith('video/')
  const busy     = stage === 'compressing' || stage === 'uploading' || stage === 'done'
  const fieldCls = 'w-full px-3 py-2.5 rounded-lg border border-[var(--border-glass)] bg-[rgba(255,255,255,0.05)] text-[var(--text-main)] font-[inherit] text-[0.88rem] outline-none focus:border-[var(--primary)] transition-colors'

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="glass-panel w-full max-w-[480px] mx-4 p-6 max-h-[92vh] overflow-y-auto flex flex-col gap-4">

        <div className="flex justify-between items-center">
          <h2 className="m-0 text-[1.05rem] font-bold">Нийтлэх</h2>
          <button onClick={handleClose} className="flex items-center p-1 bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Post type */}
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map(pt => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setPostType(pt.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.8rem] font-medium border transition-all cursor-pointer"
              style={{
                borderColor: postType === pt.value ? 'var(--primary)' : 'var(--border-glass)',
                background:  postType === pt.value ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                color:       postType === pt.value ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              <span>{pt.icon}</span>{pt.label}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Гарчиг *"
          required
          className={fieldCls}
        />

        {/* Drop zone */}
        {!file && !cameraOpen && (
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-[14px] min-h-[150px] flex flex-col items-center justify-center gap-3 transition-all ${
              dragging ? 'border-[var(--primary)] bg-[rgba(74,222,128,0.06)]' : 'border-[var(--border-glass)] bg-[rgba(255,255,255,0.02)]'
            }`}
          >
            <p className="m-0 text-[var(--text-muted)] text-[0.82rem] text-center">
              Зураг эсвэл видео оруулах
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="glass-button"
                style={{ fontSize: '0.8rem' }}
              >
                <Upload size={14} /> Файл сонгох
              </button>
              <button
                type="button"
                onClick={startCamera}
                className="glass-button"
                style={{ fontSize: '0.8rem' }}
              >
                <Camera size={14} /> Камер
              </button>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }}
            />
          </div>
        )}

        {/* Live camera */}
        {!file && cameraOpen && (
          <div className="relative rounded-xl overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full block"
              style={{ maxHeight: 280, objectFit: 'cover' }}
            />
            <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-5">
              <button
                type="button"
                onClick={stopCamera}
                className="w-9 h-9 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                <X size={16} />
              </button>
              {/* Shutter */}
              <button
                type="button"
                onClick={capturePhoto}
                aria-label="Зураг авах"
                className="w-14 h-14 rounded-full border-4 border-white/40 cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.9)' }}
              />
            </div>
          </div>
        )}

        {/* File preview */}
        {file && (
          <div className="relative rounded-xl overflow-hidden">
            {isVideo
              ? <video src={preview} controls playsInline preload="metadata" className="w-full max-h-[240px] block bg-[#020617]" />
              : <img src={preview} alt="" className="w-full max-h-[240px] object-cover block" />
            }
            {isVideo && file.size > VIDEO_COMPRESS_THRESHOLD && (
              <div className="absolute top-2 left-2 bg-black/60 text-[var(--primary)] text-[0.7rem] px-2 py-0.5 rounded-full">
                Видео шахагдана ({(file.size / MB).toFixed(0)} MB)
              </div>
            )}
            <button onClick={reset} className="absolute top-2 right-2 bg-black/65 border-none rounded-full w-7 h-7 cursor-pointer text-white flex items-center justify-center hover:bg-black/80">
              <X size={14} />
            </button>
          </div>
        )}

        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Тайлбар нэмэх... (заавал биш)"
          rows={4}
          className={`${fieldCls} resize-none`}
          style={{ fontSize: '1rem', lineHeight: 1.55 }}
        />

        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-glass)] bg-[rgba(255,255,255,0.04)] group">
          <MapPin size={14} color="var(--text-muted)" className="shrink-0" />
          <input
            value={locationName}
            onChange={e => setLN(e.target.value)}
            placeholder={`${lat.toFixed(4)}, ${lng.toFixed(4)}`}
            className="border-none bg-transparent text-[var(--text-muted)] font-[inherit] text-[0.82rem] flex-1 outline-none"
          />
          <button 
            type="button" 
            onClick={requestLocation}
            className="p-1 hover:text-[var(--primary)] text-[var(--text-muted)] transition-colors bg-transparent border-none cursor-pointer"
            title="Одоогийн байршил авах"
          >
            <Navigation size={14} />
          </button>
        </div>

        {/* Time fields */}
        <button
          type="button"
          onClick={() => setShowTime(v => !v)}
          className="flex items-center gap-2 text-[0.8rem] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors bg-transparent border-none cursor-pointer p-0 self-start"
        >
          <Clock size={14} />
          {showTime ? 'Хугацаа арилгах' : 'Хугацаа тохируулах (заавал биш)'}
        </button>

        {showTime && (
          <div className="flex flex-col gap-2">
            <label className="grid gap-1 text-[0.75rem] text-[var(--text-muted)]">
              Эхлэх цаг
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className={fieldCls} />
            </label>
            <label className="grid gap-1 text-[0.75rem] text-[var(--text-muted)]">
              Дуусах цаг — дуусмагц автоматаар нуугдана
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className={fieldCls} />
            </label>
          </div>
        )}

        {/* Progress */}
        {(stage === 'compressing' || stage === 'uploading') && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-[0.75rem] text-[var(--text-muted)]">
              <span>{statusMsg}</span><span>{progress}%</span>
            </div>
            <div className="h-[3px] bg-[var(--border-glass)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{ width: `${progress}%`, background: stage === 'compressing' ? '#a78bfa' : 'var(--primary)' }}
              />
            </div>
          </div>
        )}

        {error && <p className="m-0 text-[#f87171] text-[0.82rem]">{error}</p>}

        <button
          className="glass-button active justify-center gap-2"
          onClick={handlePost}
          disabled={!file || !title.trim() || busy}
          style={{ opacity: (!file || !title.trim()) ? 0.45 : 1 }}
        >
          <Upload size={15} />
          {stage === 'compressing' ? 'Боловсруулж байна...'
           : stage === 'uploading' ? 'Илгээж байна...'
           : stage === 'done'      ? 'Нийтлэгдлээ ✓'
           : 'Нийтлэх'}
        </button>
      </div>
    </div>
  )
}
