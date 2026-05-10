'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check, ChevronDown, ChevronUp, Flag,
  Heart, MapPin, MessageCircle, RefreshCw, Send, Share2, Trash2, User, Navigation, Ban
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// ── Types ────────────────────────────────────────────────────────────────────

export type PostAuthor = {
  name: string
  phone: string | null
  avatar_url: string | null
  verified: boolean
}

export type Post = {
  id: string
  user_id: string | null
  title: string | null
  caption: string | null
  media_url: string
  media_type: 'photo' | 'video'
  lat: number
  lng: number
  location_name: string | null
  post_type: string | null
  created_at: string
  starts_at?: string | null
  ends_at?: string | null
  author: PostAuthor | null
  comment_count: number
  like_count: number
  is_liked: boolean
}

export const TYPE_META: Record<string, { label: string; color: string }> = {
  info:     { label: 'Мэдээлэл',       color: '#38bdf8' },
  issue:    { label: 'Асуудал',         color: '#f87171' },
  landmark: { label: 'Онцгой газар',   color: '#a78bfa' },
  event:    { label: 'Арга хэмжээ',    color: '#4ade80' },
  show:     { label: 'Тоглолт/Шоу',    color: '#f472b6' },
  safety:   { label: 'Аюулгүй байдал', color: '#fb923c' },
}

export const fmtRelative = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1)  return 'Дөнгөж сая'
  if (m < 60) return `${m}м өмнө`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}ц өмнө`
  return `${Math.floor(h / 24)}ө өмнө`
}

const CAPTION_LIMIT = 120
const REPORT_REASONS = ['Хуурамч мэдээлэл', 'Зохисгүй агуулга', 'Спам', 'Бусад']

// ── Comment ──────────────────────────────────────────────────────────────────

type Comment = {
  id: string
  content: string
  created_at: string
  profiles: { id: string; name: string; avatar_url: string | null } | null
}

function CommentsSection({ postId }: { postId: string }) {
  const { user } = useAuth()
  const router   = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading]   = useState(true)
  const [text, setText]         = useState('')
  const [posting, setPosting]   = useState(false)

  useEffect(() => {
    fetch(`/api/comments/${postId}`)
      .then(r => r.json())
      .then((d: Comment[]) => setComments(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [postId])

  const submit = async () => {
    if (!user) { router.push('/auth'); return }
    if (!text.trim()) return
    setPosting(true)
    const res = await fetch(`/api/comments/${postId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text.trim() }),
    })
    if (res.ok) {
      const c = await res.json() as Comment
      setComments(prev => [...prev, c])
      setText('')
    }
    setPosting(false)
  }

  return (
    <div className="comments-section">
      {loading ? (
        <p className="text-[0.75rem] text-[var(--text-muted)] py-4 text-center">Уншиж байна...</p>
      ) : comments.length === 0 ? (
        <p className="text-[0.75rem] text-[var(--text-muted)] py-2 text-center">Сэтгэгдэл байхгүй</p>
      ) : (
        <div className="comments-list">
          {comments.map(c => (
            <div key={c.id} className="comment-row">
              <div className="flex items-center gap-1.5 min-w-0">
                {c.profiles ? (
                  <Link href={`/profile/${c.profiles.id}`} className="comment-author no-underline shrink-0">
                    {c.profiles.name}
                  </Link>
                ) : (
                  <span className="comment-author shrink-0">Нэргүй</span>
                )}
                <span className="comment-time shrink-0">· {fmtRelative(c.created_at)}</span>
              </div>
              <span className="comment-text">{c.content}</span>
            </div>
          ))}
        </div>
      )}
      <div className="comment-input-row">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={user ? 'Сэтгэгдэл бичих...' : 'Нэвтэрч сэтгэгдэл бичнэ үү'}
          className="comment-input"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() } }}
        />
        <button className="comment-send" onClick={() => void submit()} disabled={posting || !text.trim()}>
          {posting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </div>
    </div>
  )
}

// ── Caption ───────────────────────────────────────────────────────────────────

function Caption({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > CAPTION_LIMIT
  return (
    <p className="px-3 pt-2 pb-0 m-0 text-[0.85rem] leading-[1.55] text-[var(--text-sub)]">
      {long && !expanded ? text.slice(0, CAPTION_LIMIT) + '…' : text}
      {long && (
        <button
          className="ml-1 text-[var(--primary)] text-[0.8rem] font-medium inline-flex items-center gap-0.5 bg-transparent border-none p-0 cursor-pointer"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? <><ChevronUp size={12} />Хураах</> : <><ChevronDown size={12} />Дэлгэрэнгүй</>}
        </button>
      )}
    </p>
  )
}

// ── PostCard ──────────────────────────────────────────────────────────────────

export default function PostCard({
  post,
  onLocate,
  onDelete,
  onGetMeThere,
  isActiveRoute,
}: {
  post: Post
  onLocate?: (lat: number, lng: number) => void
  onDelete?: (id: string) => void
  onGetMeThere?: (postId: string, lat: number, lng: number) => void
  isActiveRoute?: boolean
}) {
  const { user } = useAuth()
  const router   = useRouter()
  const meta     = TYPE_META[post.post_type ?? 'info'] ?? TYPE_META.info

  const [liked, setLiked]           = useState(post.is_liked)
  const [likeCount, setLikeCount]   = useState(post.like_count)
  const [commentCount]              = useState(post.comment_count)
  const [showComments, setSC]       = useState(false)
  const [reported, setReported]     = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [copied, setCopied]         = useState(false)

  const guard = () => { if (!user) { router.push('/auth'); return false }; return true }

  const handleDelete = async () => {
    if (!confirm('Энэ постыг устгах уу?')) return
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
      if (res.ok) {
        if (onDelete) onDelete(post.id)
        else router.push('/map')
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(`Устгахад алдаа гарлаа: ${errData.error || res.statusText}`)
      }
    } catch (err) {
      alert('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.')
    }
  }

  const toggleLike = async () => {
    if (!guard()) return
    const next = !liked
    setLiked(next)
    setLikeCount(n => next ? n + 1 : n - 1)
    const res = await fetch(`/api/like/${post.id}`, { method: next ? 'POST' : 'DELETE' })
    if (!res.ok) { setLiked(!next); setLikeCount(n => next ? n - 1 : n + 1) }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleReport = async (reason: string) => {
    if (!guard()) return
    setShowReport(false)
    setReported(true)
    await fetch(`/api/report/${post.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
  }

  return (
    <article className="post-card">
      {/* Type + time */}
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-2 flex-wrap">
        <span
          className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ color: meta.color, background: `${meta.color}1a` }}
        >
          {meta.label}
        </span>
        {post.ends_at && (
          <span suppressHydrationWarning className="text-[0.65rem] px-1.5 py-0.5 rounded-full shrink-0" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.12)' }}>
            ⏱ {new Date(post.ends_at).toLocaleString('mn-MN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <span suppressHydrationWarning className="text-[0.72rem] text-[var(--text-muted)] ml-auto shrink-0">
          {fmtRelative(post.created_at)}
        </span>
      </div>

      {/* Author */}
      {post.author && post.user_id && (
        <Link href={`/profile/${post.user_id}`} className="px-3 pb-1.5 flex items-center gap-1.5 no-underline">
          {post.author.avatar_url ? (
            <img src={post.author.avatar_url} alt={post.author.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(74,222,128,0.15)' }}>
              <User size={12} className="text-[var(--primary)]" />
            </div>
          )}
          <span className="text-[0.78rem] font-medium text-[var(--text-sub)] hover:text-[var(--primary)] transition-colors">
            {post.author.name}
          </span>
          {post.author.verified && (
            <span className="verified-badge" title="Баталгаажсан"><Check size={9} /></span>
          )}
        </Link>
      )}

      {/* Title */}
      {post.title && (
        <div className="px-3 pb-1.5 font-semibold text-[0.9rem] leading-tight">{post.title}</div>
      )}

      {/* Media */}
      {post.media_url ? (
        post.media_type === 'video' ? (
          <video src={post.media_url} controls playsInline preload="metadata" className="w-full max-h-[280px] block bg-[#020617]" />
        ) : (
          <img src={post.media_url} alt={post.title ?? ''} loading="lazy" className="w-full max-h-[280px] object-cover block" />
        )
      ) : null}

      {/* Caption */}
      {post.caption && <Caption text={post.caption} />}

      {/* Location */}
      <div className="px-3 pt-2 pb-0 flex items-center justify-between">
        <button className="post-locate-btn" onClick={() => onLocate?.(post.lat, post.lng)}>
          <MapPin size={11} />
          {post.location_name ?? `${post.lat.toFixed(3)}, ${post.lng.toFixed(3)}`}
        </button>
        <button 
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-medium transition-all border ${isActiveRoute ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20'}`}
          onClick={() => onGetMeThere?.(post.id, post.lat, post.lng)}
          title={isActiveRoute ? "Цуцлах" : "Энд очих"}
        >
          {isActiveRoute ? <Ban size={12} /> : <Navigation size={12} />}
          {isActiveRoute ? "Цуцлах" : "Очих"}
        </button>
      </div>

      {/* Actions */}
      <div className="px-3 py-2.5 flex items-center gap-3">
        {/* Like */}
        <button
          className="flex items-center gap-1 text-[0.75rem] transition-colors"
          style={{ color: liked ? '#f87171' : 'var(--text-muted)' }}
          onClick={() => void toggleLike()}
        >
          <Heart size={15} fill={liked ? '#f87171' : 'none'} stroke={liked ? '#f87171' : 'currentColor'} />
          {likeCount > 0 && likeCount}
        </button>

        {/* Comment */}
        <button
          className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          onClick={() => setSC(v => !v)}
        >
          <MessageCircle size={15} />
          {commentCount > 0 && commentCount}
        </button>

        {/* Share */}
        <button
          className="flex items-center gap-1 text-[0.75rem] transition-colors"
          style={{ color: copied ? 'var(--primary)' : 'var(--text-muted)' }}
          onClick={() => void handleShare()}
          title="Холбоос хуулах"
        >
          <Share2 size={14} />
          {copied && <span className="text-[0.7rem]">Хуулсан!</span>}
        </button>

        {/* Delete (own posts only) */}
        {user?.id === post.user_id && (
          <button
            className="flex items-center transition-colors ml-auto"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => void handleDelete()}
            title="Устгах"
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <Trash2 size={14} />
          </button>
        )}

        {/* Report */}
        <div className={`relative ${user?.id === post.user_id ? '' : 'ml-auto'}`}>
          <button
            className="flex items-center transition-colors"
            style={{ color: reported ? '#f87171' : 'var(--text-muted)' }}
            onClick={() => { if (!reported) setShowReport(v => !v) }}
            title={reported ? 'Мэдэгдсэн' : 'Мэдэгдэх'}
          >
            <Flag size={14} />
          </button>
          {showReport && (
            <div
              className="absolute right-0 bottom-7 z-10 glass-panel py-1 min-w-[160px]"
              style={{ borderRadius: 10 }}
            >
              {REPORT_REASONS.map(r => (
                <button
                  key={r}
                  className="w-full text-left px-3 py-1.5 text-[0.78rem] text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-white/5 transition-colors"
                  onClick={() => void handleReport(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showComments && <CommentsSection postId={post.id} />}
    </article>
  )
}
