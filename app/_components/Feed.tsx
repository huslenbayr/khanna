'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { MapPin, RefreshCw, User } from 'lucide-react'

type Post = {
  id: string
  title: string | null
  caption: string | null
  media_url: string
  media_type: 'photo' | 'video'
  lat: number
  lng: number
  location_name: string | null
  post_type: string | null
  created_at: string
  author: { name: string; phone: string | null } | null
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  info:     { label: 'Мэдээлэл',       color: '#38bdf8' },
  issue:    { label: 'Асуудал',         color: '#f87171' },
  landmark: { label: 'Онцгой газар',   color: '#a78bfa' },
  event:    { label: 'Арга хэмжээ',    color: '#4ade80' },
  safety:   { label: 'Аюулгүй байдал', color: '#fb923c' },
}

const fmt = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'Дөнгөж сая'
  if (m < 60) return `${m}м өмнө`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}ц өмнө`
  return `${Math.floor(h / 24)}ө өмнө`
}

export type FeedHandle = {
  open: () => void
  close: () => void
  toggle: () => void
}

type Props = {
  onLocate?: (lat: number, lng: number) => void
  refreshSignal?: number
}

function PostList({
  posts,
  loading,
  onLocate,
}: {
  posts: Post[]
  loading: boolean
  onLocate?: (lat: number, lng: number) => void
}) {
  if (loading) {
    return <p className="text-[var(--text-muted)] text-sm text-center py-10">Уншиж байна...</p>
  }
  if (posts.length === 0) {
    return (
      <p className="text-[var(--text-muted)] text-sm text-center py-10 leading-relaxed">
        Одоогоор post байхгүй байна.<br />Эхний post-ийг та нийтлээрэй!
      </p>
    )
  }
  return (
    <>
      {posts.map(post => {
        const meta = TYPE_META[post.post_type ?? 'info'] ?? TYPE_META.info
        return (
          <article key={post.id} className="post-card">
            <div className="px-3 pt-2.5 pb-1 flex items-center justify-between gap-2">
              <span
                className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ color: meta.color, background: `${meta.color}1a` }}
              >
                {meta.label}
              </span>
              <span className="text-[0.72rem] text-[var(--text-muted)] shrink-0">{fmt(post.created_at)}</span>
            </div>
            {post.title && (
              <div className="px-3 pb-1.5 font-semibold text-[0.9rem] leading-tight">{post.title}</div>
            )}
            {post.media_type === 'video' ? (
              <video src={post.media_url} controls playsInline className="w-full max-h-[260px] block bg-[#020617]" />
            ) : (
              <img src={post.media_url} alt={post.title ?? ''} loading="lazy" className="w-full h-[200px] object-cover block" />
            )}
            <div className="px-3 py-2.5 flex flex-col gap-1.5">
              {post.caption && (
                <p className="m-0 text-[0.85rem] leading-[1.55] text-[var(--text-sub)]">{post.caption}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <button className="post-locate-btn" onClick={() => onLocate?.(post.lat, post.lng)}>
                  <MapPin size={11} />
                  {post.location_name ?? `${post.lat.toFixed(3)}, ${post.lng.toFixed(3)}`}
                </button>
                {post.author && (
                  <div className="flex items-center gap-1 shrink-0">
                    <User size={10} className="text-[var(--text-muted)]" />
                    <div className="text-right">
                      <div className="text-[0.7rem] font-medium text-[var(--text-sub)] leading-tight">{post.author.name}</div>
                      {post.author.phone && (
                        <div className="text-[0.65rem] text-[var(--text-muted)] leading-tight">{post.author.phone}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </>
  )
}

const Feed = forwardRef<FeedHandle, Props>(function Feed({ onLocate, refreshSignal }, ref) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetch('/api/posts').then(r => r.json()) as Post[]
      setPosts(Array.isArray(data) ? data : [])
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load, refreshSignal])

  // Keep FeedHandle for compatibility — no snap behavior anymore
  useImperativeHandle(ref, () => ({
    open:   () => {},
    close:  () => {},
    toggle: () => {},
  }))

  const panelStyle: React.CSSProperties = {
    background: 'rgba(8,10,18,0.97)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    borderTop: '1px solid var(--border-glass)',
    borderRadius: '20px 20px 0 0',
  }

  const headerStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--border-glass)',
  }

  return (
    <>
      {/* ── Mobile: fixed panel at bottom, always visible, scrollable ── */}
      <div
        className="feed-mobile-panel md:hidden fixed left-0 right-0 z-20 flex flex-col"
        style={{
          bottom: 'var(--nav-h)',
          ...panelStyle,
        }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={headerStyle}>
          <span className="font-semibold text-sm">Feed</span>
          <button
            className="glass-button"
            style={{ padding: '0.3rem 0.5rem', minHeight: 28, fontSize: '0.78rem' }}
            onClick={() => void load()}
            aria-label="Refresh"
          >
            <RefreshCw size={12} />
          </button>
        </div>
        <div
          className="flex-1 overflow-y-scroll flex flex-col gap-3 px-3 py-3"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          <PostList posts={posts} loading={loading} onLocate={onLocate} />
        </div>
      </div>

      {/* ── Desktop: always-visible right panel ── */}
      <div
        className="hidden md:flex fixed right-0 top-0 z-20 w-[360px] h-screen flex-col"
        style={{
          paddingTop: 'calc(var(--header-h) + 1rem)',
          background: 'linear-gradient(to left, rgba(8,10,18,0.97), rgba(8,10,18,0.82))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderLeft: '1px solid var(--border-glass)',
        }}
      >
        <div className="flex items-center justify-between px-4 pb-3 shrink-0" style={headerStyle}>
          <span className="font-bold text-base">Feed</span>
          <button
            className="glass-button"
            style={{ padding: '0.4rem 0.6rem', minHeight: 32 }}
            onClick={load}
            aria-label="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-scroll flex flex-col gap-3 px-3 pt-3 pb-4">
          <PostList posts={posts} loading={loading} onLocate={onLocate} />
        </div>
      </div>
    </>
  )
})

export default Feed
