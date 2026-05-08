'use client'

import { useRef, useState } from 'react'
import { Camera, MapPin, Upload, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  onPosted: () => void
  defaultLat?: number
  defaultLng?: number
}

type Stage = 'idle' | 'uploading' | 'done' | 'error'

const DEFAULT_LAT = 47.9014
const DEFAULT_LNG = 106.9155

const POST_TYPES = [
  { value: 'info',     label: 'Мэдээлэл',       icon: '📍' },
  { value: 'issue',    label: 'Асуудал',          icon: '⚠️' },
  { value: 'landmark', label: 'Онцгой газар',    icon: '🏛️' },
  { value: 'event',    label: 'Арга хэмжээ',     icon: '🎉' },
  { value: 'safety',   label: 'Аюулгүй байдал',  icon: '🚨' },
] as const

type PostTypeValue = typeof POST_TYPES[number]['value']

export default function UploadModal({
  open,
  onClose,
  onPosted,
  defaultLat = DEFAULT_LAT,
  defaultLng = DEFAULT_LNG,
}: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [postType, setPostType] = useState<PostTypeValue>('info')
  const [locationName, setLocationName] = useState('')
  const [lat, setLat] = useState(defaultLat)
  const [lng, setLng] = useState(defaultLng)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const pickFile = (picked: File) => {
    setFile(picked)
    setPreview(URL.createObjectURL(picked))
    navigator.geolocation?.getCurrentPosition(
      pos => { setLat(pos.coords.latitude); setLng(pos.coords.longitude) },
      () => {}
    )
  }

  const reset = () => {
    setFile(null); setPreview(''); setTitle(''); setCaption(''); setPostType('info')
    setLocationName(''); setLat(defaultLat); setLng(defaultLng)
    setStage('idle'); setProgress(0); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.type.startsWith('image/') || f.type.startsWith('video/'))) pickFile(f)
  }

  const handlePost = async () => {
    if (!file || !title.trim()) return
    setStage('uploading'); setProgress(10); setError('')
    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      })
      if (!presignRes.ok) throw new Error('Presign failed')
      const { signedUrl, publicUrl } = await presignRes.json() as { signedUrl: string; publicUrl: string }
      setProgress(30)

      const uploadRes = await fetch(signedUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!uploadRes.ok) throw new Error('R2 upload failed')
      setProgress(70)

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          caption: caption.trim() || null,
          post_type: postType,
          media_url: publicUrl,
          media_type: file.type.startsWith('video/') ? 'video' : 'photo',
          lat, lng,
          location_name: locationName.trim() || null,
        }),
      })
      if (!postRes.ok) {
        const body = await postRes.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Post save failed')
      }
      setProgress(100); setStage('done')
      setTimeout(() => { onPosted(); handleClose() }, 700)
    } catch (err) {
      setStage('error')
      setError(err instanceof Error ? err.message : 'Upload амжилтгүй боллоо.')
    }
  }

  const isVideo = file?.type.startsWith('video/')
  const busy = stage === 'uploading' || stage === 'done'
  const fieldCls = 'w-full px-3 py-2.5 rounded-lg border border-[var(--border-glass)] bg-[rgba(255,255,255,0.05)] text-[var(--text-main)] font-[inherit] text-[0.88rem] outline-none focus:border-[var(--primary)] transition-colors'

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="glass-panel w-full max-w-[480px] mx-4 p-6 max-h-[92vh] overflow-y-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="m-0 text-[1.05rem] font-bold">Нийтлэх</h2>
          <button onClick={handleClose} className="flex items-center p-1 bg-transparent border-none cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Post type selector */}
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map(pt => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setPostType(pt.value)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.8rem] font-medium border transition-all cursor-pointer"
              style={{
                borderColor: postType === pt.value ? 'var(--primary)' : 'var(--border-glass)',
                background: postType === pt.value ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                color: postType === pt.value ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              <span>{pt.icon}</span>
              {pt.label}
            </button>
          ))}
        </div>

        {/* Title (required) */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Гарчиг *"
          required
          className={fieldCls}
        />

        {/* Drop zone or preview */}
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-[14px] min-h-[160px] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
              dragging
                ? 'border-[var(--primary)] bg-[rgba(74,222,128,0.06)]'
                : 'border-[var(--border-glass)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--primary)] hover:bg-[rgba(74,222,128,0.03)]'
            }`}
          >
            <Camera size={36} color="var(--text-muted)" strokeWidth={1.5} />
            <p className="m-0 text-[var(--text-muted)] text-[0.85rem] text-center leading-relaxed">
              Зураг эсвэл видео чирч оруулах<br />
              <span className="text-[0.75rem] opacity-70">эсвэл дарж сонгох</span>
            </p>
            <input ref={inputRef} type="file" accept="image/*,video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f) }} />
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden">
            {isVideo
              ? <video src={preview} controls className="w-full max-h-[240px] block bg-[#020617]" />
              : <img src={preview} alt="" className="w-full max-h-[240px] object-cover block" />
            }
            <button onClick={reset} className="absolute top-2 right-2 bg-black/65 border-none rounded-full w-7 h-7 cursor-pointer text-white flex items-center justify-center hover:bg-black/80">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Caption */}
        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Тайлбар нэмэх... (заавал биш)"
          rows={2}
          className={`${fieldCls} resize-none`}
        />

        {/* Location */}
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[var(--border-glass)] bg-[rgba(255,255,255,0.04)]">
          <MapPin size={14} color="var(--text-muted)" className="shrink-0" />
          <input
            value={locationName}
            onChange={e => setLocationName(e.target.value)}
            placeholder={`${lat.toFixed(4)}, ${lng.toFixed(4)}`}
            className="border-none bg-transparent text-[var(--text-muted)] font-[inherit] text-[0.82rem] flex-1 outline-none"
          />
        </div>

        {/* Progress */}
        {stage === 'uploading' && (
          <div className="h-[3px] bg-[var(--border-glass)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--primary)] rounded-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}

        {error && <p className="m-0 text-[#f87171] text-[0.82rem]">{error}</p>}

        {/* Submit */}
        <button
          className="glass-button active justify-center gap-2"
          onClick={handlePost}
          disabled={!file || !title.trim() || busy}
          style={{ opacity: (!file || !title.trim()) ? 0.45 : 1 }}
        >
          <Upload size={15} />
          {stage === 'uploading' ? 'Илгээж байна...' : stage === 'done' ? 'Нийтлэгдлээ ✓' : 'Нийтлэх'}
        </button>
      </div>
    </div>
  )
}
