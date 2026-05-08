'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Camera, ExternalLink, FileVideo, Heart, Link as LinkIcon, MapPin, ShieldCheck, Trash2, Upload } from 'lucide-react'

const STORAGE_KEY = 'khannaway-social-video-queue-v2'

type Platform = 'Instagram' | 'Facebook' | 'TikTok' | 'Бусад'
type Priority = 'Бага' | 'Дунд' | 'Өндөр'
type ReviewStatus = 'Шалгах' | 'Шалгасан'

type SocialPost = {
  id: number
  user: string
  time: string
  content: string
  image?: string
  location: string
}

type SocialVideoForm = {
  platform: Platform
  url: string
  handle: string
  location: string
  priority: Priority
  quote: string
  notes: string
}

type SocialVideoItem = {
  id: number
  platform: Platform
  sourceUrl: string
  handle: string
  location: string
  priority: Priority
  quote: string
  notes: string
  videoUrl: string
  fileName: string
  status: ReviewStatus
}

const initialPosts: SocialPost[] = [
  {
    id: 1,
    user: '@NaadamFan',
    time: 'Дөнгөж сая',
    content: 'Бөхийн финал эхлэх гэж байна. Төв талбайн уур амьсгал маш өндөр байна.',
    image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: 'Төв талбай'
  },
  {
    id: 2,
    user: '@TravelNomad',
    time: '15 минутын өмнө',
    content: 'Зүүн хаалганы ойролцоо хүнсний цэг дээр ачаалал нэмэгдэж байна.',
    location: 'Хоолны хэсэг A'
  }
]

const emptyForm: SocialVideoForm = {
  platform: 'Instagram',
  url: '',
  handle: '',
  location: '',
  priority: 'Дунд',
  quote: '',
  notes: ''
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  borderRadius: 8,
  border: '1px solid var(--border-glass)',
  background: 'rgba(255, 255, 255, 0.06)',
  color: 'var(--text-main)',
  fontFamily: 'inherit'
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
  fontSize: '0.76rem',
  color: 'var(--text-muted)'
}

const getPlatformFromUrl = (url: string, fallback: Platform): Platform => {
  const normalized = url.toLowerCase()
  if (normalized.includes('instagram.com')) return 'Instagram'
  if (normalized.includes('facebook.com') || normalized.includes('fb.watch')) return 'Facebook'
  if (normalized.includes('tiktok.com')) return 'TikTok'
  return fallback
}

const SocialFeed = () => {
  const [posts] = useState(initialPosts)
  const [form, setForm] = useState<SocialVideoForm>(emptyForm)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [queue, setQueue] = useState<SocialVideoItem[]>([])
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY)
      const savedQueue = savedRaw ? JSON.parse(savedRaw) as SocialVideoItem[] : null
      if (Array.isArray(savedQueue)) {
        setQueue(savedQueue)
      }
    } catch {
      setQueue([])
    }

    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady) return

    const persistentQueue = queue.map(item => ({
      ...item,
      videoUrl: '',
      fileName: item.fileName || ''
    }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistentQueue))
  }, [queue, storageReady])

  const intakeStats = useMemo(() => {
    const highPriority = queue.filter(item => item.priority === 'Өндөр').length
    const uploaded = queue.filter(item => item.videoUrl).length
    return { highPriority, uploaded }
  }, [queue])

  const updateForm = <Field extends keyof SocialVideoForm>(field: Field, value: SocialVideoForm[Field]) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const addSocialVideo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const sourceUrl = form.url.trim()
    const quote = form.quote.trim()
    if (!sourceUrl && !videoFile && !quote) return

    const videoUrl = videoFile ? URL.createObjectURL(videoFile) : ''
    const item: SocialVideoItem = {
      id: Date.now(),
      platform: getPlatformFromUrl(sourceUrl, form.platform),
      sourceUrl,
      handle: form.handle.trim() || '@unknown',
      location: form.location.trim() || 'Байршил тодорхойгүй',
      priority: form.priority,
      quote: quote || 'Ишлэл оруулаагүй.',
      notes: form.notes.trim() || 'Шалгах дараалалд нэмэгдсэн.',
      videoUrl,
      fileName: videoFile?.name || '',
      status: 'Шалгах'
    }

    setQueue(current => [item, ...current])
    setForm(emptyForm)
    setVideoFile(null)
    event.currentTarget.reset()
  }

  const markReviewed = (id: number) => {
    setQueue(current => current.map(item => (
      item.id === id ? { ...item, status: item.status === 'Шалгасан' ? 'Шалгах' : 'Шалгасан' } : item
    )))
  }

  const removeVideo = (id: number) => {
    setQueue(current => current.filter(item => item.id !== id))
  }

  return (
    <div className="glass-panel overlay-panel animate-fade-in" style={{
      top: '5.25rem', right: '2rem', width: '430px', maxHeight: '84vh', overflowY: 'auto', padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '1rem'
    }}>
      <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
        <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Camera size={23} color="#f472b6" /> Сошиал видео хүсэлт
        </h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          {queue.length} видео queue • {intakeStats.uploaded} файл • {intakeStats.highPriority} өндөр чухал
        </p>
      </div>

      <form onSubmit={addSocialVideo} style={{
        display: 'grid', gap: '0.75rem', padding: '0.85rem',
        background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: 8
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <label style={labelStyle}>
            Платформ
            <select value={form.platform} onChange={(event) => updateForm('platform', event.target.value as Platform)} style={fieldStyle}>
              <option>Instagram</option>
              <option>Facebook</option>
              <option>TikTok</option>
              <option>Бусад</option>
            </select>
          </label>
          <label style={labelStyle}>
            Чухал
            <select value={form.priority} onChange={(event) => updateForm('priority', event.target.value as Priority)} style={fieldStyle}>
              <option>Бага</option>
              <option>Дунд</option>
              <option>Өндөр</option>
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Instagram/Facebook video link
          <input value={form.url} onChange={(event) => updateForm('url', event.target.value)} placeholder="https://instagram.com/reel/... эсвэл https://facebook.com/..." style={fieldStyle} />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <label style={labelStyle}>
            Хэрэглэгч
            <input value={form.handle} onChange={(event) => updateForm('handle', event.target.value)} placeholder="@account" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Байршил
            <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="Жишээ: Баруун хаалга" style={fieldStyle} />
          </label>
        </div>

        <label style={labelStyle}>
          Эх постын ишлэл / хүсэлт
          <textarea value={form.quote} onChange={(event) => updateForm('quote', event.target.value)} placeholder="Жишээ: Хүн их бөөгнөрсөн, хамгаалалт хэрэгтэй..." rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
        </label>

        <label style={labelStyle}>
          Видео файл upload
          <input onChange={(event) => setVideoFile(event.target.files?.[0] || null)} type="file" accept="video/*" style={fieldStyle} />
        </label>

        <label style={labelStyle}>
          Дотоод тэмдэглэл
          <input value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="AI tag, хариуцах баг, шалгах тэмдэглэл..." style={fieldStyle} />
        </label>

        <button className="glass-button active" type="submit" style={{ justifyContent: 'center' }}>
          <Upload size={16} /> Видео queue-д нэмэх
        </button>
      </form>

      {queue.length > 0 && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {queue.map(item => (
            <div key={item.id} style={{
              background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, border: '1px solid var(--border-glass)', overflow: 'hidden'
            }}>
              {item.videoUrl ? (
                <video src={item.videoUrl} controls style={{ width: '100%', display: 'block', maxHeight: 220, background: '#020617' }} />
              ) : (
                <div style={{ minHeight: 92, display: 'grid', placeItems: 'center', background: 'rgba(2, 6, 23, 0.45)', color: 'var(--text-muted)' }}>
                  <FileVideo size={24} />
                </div>
              )}
              <div style={{ padding: '0.85rem', display: 'grid', gap: '0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{item.platform} • {item.handle}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.15rem' }}>{item.priority} чухал • {item.status}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="glass-button" onClick={() => markReviewed(item.id)} style={{ padding: '0.45rem 0.55rem', fontSize: '0.76rem' }}>
                      <ShieldCheck size={14} /> {item.status === 'Шалгасан' ? 'Буцаах' : 'Шалгасан'}
                    </button>
                    <button aria-label="Видео устгах" onClick={() => removeVideo(item.id)} style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '0.85rem', lineHeight: 1.45 }}>{item.quote}</p>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.45 }}>{item.notes}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {item.location}</span>
                  {item.sourceUrl ? (
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                      <ExternalLink size={13} /> Эх пост
                    </a>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><LinkIcon size={13} /> Local upload</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {posts.map(post => (
          <div key={post.id} style={{
            background: 'rgba(255, 255, 255, 0.05)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-glass)'
          }}>
            {post.image && (
              <img src={post.image} alt="Post media" style={{ width: '100%', height: 170, objectFit: 'cover' }} />
            )}
            <div style={{ padding: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{post.user}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{post.time}</span>
              </div>
              <p style={{ fontSize: '0.86rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>{post.content}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <MapPin size={12} /> {post.location}
                </span>
                <Heart size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SocialFeed
