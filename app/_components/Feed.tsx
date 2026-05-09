'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { RefreshCw, X } from 'lucide-react'
import PostCard, { type Post } from './PostCard'

export type FeedHandle = { open: () => void; close: () => void; toggle: () => void }
type Props = { onLocate?: (lat: number, lng: number) => void; refreshSignal?: number }

const Feed = forwardRef<FeedHandle, Props>(function Feed({ onLocate, refreshSignal }, ref) {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobileOpen, setIsMobileOpen]   = useState(false)
  const [isDesktopOpen, setIsDesktopOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // Mobile Drag State
  const COLLAPSED_H = 120 // Pixels visible when "down"
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
  
  const isMobile = () => mounted && window.innerWidth < 768
  const getMaxH = () => mounted ? window.innerHeight : 0

  useImperativeHandle(ref, () => ({
    open: () => {
      if (isMobile()) {
        setIsMobileOpen(true)
        setYOffset(getMaxH() * 0.5)
      } else {
        setIsDesktopOpen(true)
      }
    },
    close: () => {
      setIsMobileOpen(false)
      setIsDesktopOpen(false)
    },
    toggle: () => {
      if (isMobile()) {
        if (!isMobileOpen) {
          setIsMobileOpen(true)
          setYOffset(getMaxH() * 0.5)
        } else {
          setIsMobileOpen(false)
        }
      } else {
        setIsDesktopOpen(prev => !prev)
      }
    },
  }))

  const onDragStart = (e: React.PointerEvent) => {
    // @ts-ignore
    e.target.setPointerCapture(e.pointerId)
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
    <button
      className="glass-button"
      style={{ padding: '0.4rem 0.6rem', minHeight: size }}
      onClick={(e) => { e.stopPropagation(); void load() }}
    >
      <RefreshCw size={13} />
    </button>
  )

  const content = loading ? (
    <p className="text-[var(--text-muted)] text-sm text-center py-10">Ачааллаж байна...</p>
  ) : posts.length === 0 ? (
    <p className="text-[var(--text-muted)] text-sm text-center py-10">Мэдээлэл олдсонгүй.</p>
  ) : (
    <div className="flex flex-col gap-3">
      {posts.map(post => <PostCard key={post.id} post={post} onLocate={onLocate} />)}
    </div>
  )

  if (!mounted) return null
  const maxH = getMaxH()

  return (
    <>
      {/* Mobile Feed Sheet */}
      <div
        className={`feed-mobile-panel md:hidden fixed left-0 right-0 z-40 flex flex-col ${isMobileOpen ? 'open' : ''}`}
        style={{ 
          bottom: 0, // Align to bottom of screen for full coverage
          height: `${maxH}px`,
          background: 'rgba(10,12,18,0.98)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderTop: '1px solid var(--border-glass)',
          borderRadius: yOffset > maxH - 20 ? '0' : '24px 24px 0 0', // Square edges when full screen
          transform: isMobileOpen 
            ? `translateY(${maxH - yOffset}px)` 
            : `translateY(${maxH}px)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1), border-radius 0.3s',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drag Area */}
        <div 
          className="flex flex-col items-center pt-3 pb-2 shrink-0 select-none touch-none" 
          style={{ cursor: 'ns-resize' }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mb-3" />
          <div 
            className="flex items-center justify-between w-full px-5 transition-opacity duration-300"
            style={{ 
              opacity: yOffset < COLLAPSED_H + 50 ? 0 : 1,
              pointerEvents: yOffset < COLLAPSED_H + 50 ? 'none' : 'auto'
            }}
          >
            <span className="font-bold text-lg">Social Feed</span>
            <div className="flex items-center gap-2">
              {refreshBtn(30)}
              <button 
                className="glass-button" 
                onClick={(e) => { e.stopPropagation(); setIsMobileOpen(false) }} 
                style={{ padding: '0.4rem 0.6rem', minHeight: 30 }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          className="overflow-y-auto px-4 py-2" 
          style={{ 
            flex: 1, 
            pointerEvents: isDragging || yOffset < maxH * 0.4 ? 'none' : 'auto',
            marginBottom: 'var(--nav-h)' // Ensure content isn't hidden behind bottom nav
          }}
        >
          {content}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex fixed right-0 top-0 z-20 w-[380px] h-screen flex-col ${isDesktopOpen ? 'open' : ''}`}
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
          <span className="font-bold text-xl">Social Feed</span>
          {refreshBtn(32)}
        </div>
        <div className="overflow-y-auto px-5 pt-4 pb-10" style={{ flex: 1 }}>
          {content}
        </div>
      </div>
    </>
  )
})

export default Feed
