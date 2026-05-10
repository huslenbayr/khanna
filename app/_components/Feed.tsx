'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { LayoutGrid, RefreshCw, X } from 'lucide-react'
import PostCard, { type Post } from './PostCard'

export type FeedHandle = { open: () => void; close: () => void; toggle: () => void }
type Props = { 
  onLocate?: (lat: number, lng: number) => void; 
  refreshSignal?: number; 
  onDesktopOpenChange?: (open: boolean) => void;
  selectedPostId?: string | null;
  onClearSelection?: () => void;
  onDeletePost?: () => void;
}

const Feed = forwardRef<FeedHandle, Props>(function Feed({ onLocate, refreshSignal, onDesktopOpenChange, selectedPostId, onClearSelection, onDeletePost }, ref) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isDesktopOpen, setIsDesktopOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Mobile: always visible, height controlled by yOffset
  const COLLAPSED_H = 120
  const [yOffset, setYOffset] = useState(COLLAPSED_H)
  const [isDragging, setIsDragging] = useState(false)
  const startPointerY = useRef(0)
  const startOffset = useRef(0)

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

  useEffect(() => {
    setMounted(true)
    void load()
  }, [load, refreshSignal])

  useEffect(() => { onDesktopOpenChange?.(isDesktopOpen) }, [isDesktopOpen, onDesktopOpenChange])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.style.setProperty('--mobile-feed-y', `${yOffset}px`)
  }, [yOffset, mounted])

  const isMobile = () => mounted && window.innerWidth < 768
  const getMaxH = () => mounted ? window.innerHeight : 0

  useImperativeHandle(ref, () => ({
    open: () => {
      if (isMobile()) setYOffset(getMaxH() * 0.5)
      else setIsDesktopOpen(true)
    },
    close: () => {
      if (isMobile()) setYOffset(COLLAPSED_H)
      else setIsDesktopOpen(false)
    },
    toggle: () => {
      if (isMobile()) setYOffset(prev => prev <= COLLAPSED_H ? getMaxH() * 0.5 : COLLAPSED_H)
      else setIsDesktopOpen(prev => !prev)
    },
  }))

  const displayedPosts = selectedPostId 
    ? posts.filter(p => p.id === selectedPostId)
    : posts

  const onDragStart = (e: React.PointerEvent) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(e.target as any).setPointerCapture(e.pointerId)
    setIsDragging(true)
    startPointerY.current = e.clientY
    startOffset.current = yOffset
  }

  const onDragMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const diff = startPointerY.current - e.clientY
    const newY = startOffset.current + diff
    const max = getMaxH()
    setYOffset(Math.max(COLLAPSED_H, Math.min(newY, max)))
  }

  const onDragEnd = () => {
    setIsDragging(false)
    const max = getMaxH()
    if (yOffset > max * 0.75) setYOffset(max)
    else if (yOffset > max * 0.3) setYOffset(max * 0.5)
    else setYOffset(COLLAPSED_H)
  }

  const refreshBtn = (size: number) => (
    <button className="glass-button" style={{ padding: '0.4rem 0.6rem', minHeight: size }} onClick={e => { e.stopPropagation(); void load() }}>
      <RefreshCw size={13} />
    </button>
  )

  const content = loading ? (
    <p className="text-[var(--text-muted)] text-sm text-center py-10">Ачааллаж байна...</p>
  ) : posts.length === 0 ? (
    <p className="text-[var(--text-muted)] text-sm text-center py-10">Мэдээлэл олдсонгүй.</p>
  ) : (
    <div className="flex flex-col gap-3">
      {selectedPostId && (
        <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/10 mb-2">
          <span className="text-[0.65rem] font-bold text-[var(--primary)] uppercase tracking-wider">Сонгосон мэдээлэл</span>
          <button className="text-[var(--text-muted)] hover:text-white" onClick={onClearSelection}>
            <X size={16} />
          </button>
        </div>
      )}
      {displayedPosts.length === 0 && selectedPostId && (
        <p className="text-center py-10 text-sm text-[var(--text-muted)]">Мэдээлэл олдсонгүй.</p>
      )}
      {displayedPosts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onLocate={onLocate}
          onDelete={id => {
            setPosts(prev => prev.filter(p => p.id !== id))
            onDeletePost?.()
          }}
        />
      ))}
    </div>
  )

  if (!mounted) return null
  const maxH = getMaxH()

  return (
    <>
      {/* Mobile Feed Sheet */}
      <div
        className="feed-mobile-panel md:hidden fixed left-0 right-0 z-50 flex flex-col pointer-events-none"
        style={{
          bottom: 0,
          height: `${yOffset}px`,
          background: 'rgba(10,12,18,0.98)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid var(--border-glass)',
          borderRadius: yOffset >= maxH - 10 ? '0' : '24px 24px 0 0',
          transition: isDragging ? 'none' : 'height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1), border-radius 0.3s',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="flex flex-col items-center pt-3 pb-2 shrink-0 select-none touch-none pointer-events-auto"
          style={{ cursor: 'ns-resize' }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mb-3" />
          <div
            className="flex items-center justify-between w-full px-5 transition-opacity duration-300"
            style={{ opacity: yOffset < COLLAPSED_H + 50 ? 0 : 1, pointerEvents: yOffset < COLLAPSED_H + 50 ? 'none' : 'auto' }}
          >
            <span className="font-bold text-lg">Нэгдсэн мэдээллийн хэсэг</span>
            <div className="flex items-center gap-2">
              {refreshBtn(30)}
              <button className="glass-button" onClick={e => { e.stopPropagation(); setYOffset(COLLAPSED_H) }} style={{ padding: '0.4rem 0.6rem', minHeight: 30 }}>
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <div
          className="overflow-y-auto px-4 py-2"
          style={{ 
            flex: 1,
            pointerEvents: isDragging || yOffset <= COLLAPSED_H ? 'none' : 'auto',
            paddingBottom: 'calc(var(--nav-h) + env(safe-area-inset-bottom, 0px) + 20px)',
            touchAction: 'pan-y'
          }}
        >
          {content}
        </div>
      </div>

      {/* Desktop feed pull-tab — always visible, slides with panel */}
      <div
        className="hidden md:block fixed"
        style={{
          right: isDesktopOpen ? 380 : 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 25,
          transition: 'right 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          onClick={() => setIsDesktopOpen(p => !p)}
          aria-label={isDesktopOpen ? 'Feed хаах' : 'Feed нээх'}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '0.9rem 0.5rem',
            background: 'rgba(10,12,18,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid var(--border-glass)',
            borderRight: 'none',
            borderRadius: '10px 0 0 10px',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-main)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <LayoutGrid size={15} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: '0.06em' }}>
            Feed
          </span>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <div
        className="hidden md:flex fixed right-0 top-0 z-20 w-[380px] h-screen flex-col"
        style={{
          paddingTop: 'calc(var(--header-h) + 1.25rem)',
          background: 'rgba(8,10,18,0.95)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderLeft: '1px solid var(--border-glass)',
          transform: isDesktopOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <div className="flex items-center justify-between px-6 pb-4 shrink-0" style={{ borderBottom: '1px solid var(--border-glass)' }}>
          <span className="font-bold text-xl">Нэгдсэн мэдээллийн хэсэг</span>
          <div className="flex items-center gap-2">
            {refreshBtn(32)}
            <button className="glass-button" onClick={() => setIsDesktopOpen(false)} style={{ padding: '0.4rem 0.6rem', minHeight: 32 }}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-5 pt-4 pb-32" style={{ flex: 1 }}>
          {content}
        </div>
      </div>
    </>
  )
})

export default Feed
