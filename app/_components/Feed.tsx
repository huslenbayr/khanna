'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import PostCard, { type Post } from './PostCard'

export type FeedHandle = { open: () => void; close: () => void; toggle: () => void }
type Props = { onLocate?: (lat: number, lng: number) => void; refreshSignal?: number }

const Feed = forwardRef<FeedHandle, Props>(function Feed({ onLocate, refreshSignal }, ref) {
  const [posts, setPosts]     = useState<Post[]>([])
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
  useImperativeHandle(ref, () => ({ open: () => {}, close: () => {}, toggle: () => {} }))

  const panelStyle: React.CSSProperties = {
    background: 'rgba(8,10,18,0.97)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    borderTop: '1px solid var(--border-glass)',
    borderRadius: '20px 20px 0 0',
  }
  const headerStyle: React.CSSProperties = { borderBottom: '1px solid var(--border-glass)' }

  const refreshBtn = (size: number) => (
    <button
      className="glass-button"
      style={{ padding: '0.3rem 0.5rem', minHeight: size, fontSize: '0.78rem' }}
      onClick={() => void load()}
    >
      <RefreshCw size={size === 28 ? 12 : 13} />
    </button>
  )

  const content = loading ? (
    <p className="text-[var(--text-muted)] text-sm text-center py-10">Уншиж байна...</p>
  ) : posts.length === 0 ? (
    <p className="text-[var(--text-muted)] text-sm text-center py-10 leading-relaxed">
      Одоогоор post байхгүй байна.<br />Эхний post-ийг та нийтлээрэй!
    </p>
  ) : (
    <div className="flex flex-col gap-3">
      {posts.map(post => <PostCard key={post.id} post={post} onLocate={onLocate} />)}
    </div>
  )

  return (
    <>
      {/* Mobile */}
      <div
        className="feed-mobile-panel md:hidden fixed left-0 right-0 z-20 flex flex-col"
        style={{ bottom: 'var(--nav-h)', ...panelStyle }}
      >
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={headerStyle}>
          <span className="font-semibold text-sm">Feed</span>
          {refreshBtn(28)}
        </div>
        <div
          className="overflow-y-scroll px-3 py-3"
          style={{ flex: 1, minHeight: 0, overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {content}
        </div>
      </div>

      {/* Desktop */}
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
          {refreshBtn(32)}
        </div>
        <div
          className="overflow-y-scroll px-3 pt-3 pb-4"
          style={{ flex: 1, minHeight: 0 }}
        >
          {content}
        </div>
      </div>
    </>
  )
})

export default Feed
