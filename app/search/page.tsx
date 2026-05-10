'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, Search, User } from 'lucide-react'
import { TYPE_META } from '@/app/_components/PostCard'

// ── Types ─────────────────────────────────────────────────────────────────────

type UserResult = {
  id: string
  name: string
  avatar_url: string | null
  verified: boolean
}

type PostResult = {
  id: string
  title: string | null
  caption: string | null
  media_url: string
  media_type: 'photo' | 'video'
  post_type: string | null
  created_at: string
  user_id: string | null
  author: { name: string; avatar_url: string | null; verified: boolean } | null
}

type Results = { users: UserResult[]; posts: PostResult[] }

// ── User card ─────────────────────────────────────────────────────────────────

function UserCard({ u }: { u: UserResult }) {
  return (
    <Link href={`/profile/${u.id}`} className="flex items-center gap-3 p-3 rounded-xl no-underline transition-colors hover:bg-white/5"
      style={{ border: '1px solid var(--border-glass)' }}>
      {u.avatar_url ? (
        <img src={u.avatar_url} alt={u.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid var(--border-glass)' }}>
          <User size={18} className="text-[var(--primary)]" />
        </div>
      )}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="font-semibold text-[0.9rem] text-[var(--text-main)] truncate">{u.name}</span>
        {u.verified && <span className="verified-badge shrink-0"><Check size={9} /></span>}
      </div>
    </Link>
  )
}

// ── Post card (compact) ───────────────────────────────────────────────────────

function PostResultCard({ p }: { p: PostResult }) {
  const meta = TYPE_META[p.post_type ?? 'info'] ?? TYPE_META.info
  return (
    <Link href={`/post/${p.id}`} className="flex gap-3 p-3 rounded-xl no-underline transition-colors hover:bg-white/5"
      style={{ border: '1px solid var(--border-glass)' }}>
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[#020617]">
        {p.media_type === 'video' ? (
          <video src={p.media_url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
        ) : (
          <img src={p.media_url} alt={p.title ?? ''} className="w-full h-full object-cover" />
        )}
      </div>
      {/* Info */}
      <div className="flex flex-col gap-1 min-w-0 justify-center">
        <div className="flex items-center gap-1.5">
          <span className="text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ color: meta.color, background: `${meta.color}1a` }}>
            {meta.label}
          </span>
        </div>
        {p.title && (
          <span className="font-semibold text-[0.85rem] text-[var(--text-main)] truncate">{p.title}</span>
        )}
        {p.caption && (
          <span className="text-[0.75rem] text-[var(--text-muted)] truncate">{p.caption}</span>
        )}
        {p.author && (
          <span className="text-[0.72rem] text-[var(--text-muted)] truncate">
            {p.author.name}{p.author.verified ? ' ✓' : ''}
          </span>
        )}
      </div>
    </Link>
  )
}

// ── Search page ───────────────────────────────────────────────────────────────

function SearchInner() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const initialQ      = searchParams.get('q') ?? ''

  const [query, setQuery]     = useState(initialQ)
  const [results, setResults] = useState<Results | null>(null)
  const [loading, setLoading] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return }
    setLoading(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
    if (res.ok) setResults(await res.json() as Results)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (initialQ) void doSearch(initialQ)
    inputRef.current?.focus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (val: string) => {
    setQuery(val)
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => void doSearch(val), 350)
  }

  const total = (results?.users.length ?? 0) + (results?.posts.length ?? 0)
  const empty = results && total === 0

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg-dark)', paddingTop: 'var(--header-h)' }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '1rem' }}>

        {/* Top bar */}
        <div className="flex items-center gap-2 mb-4">
          <button className="glass-button shrink-0" onClick={() => router.back()}>
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-glass)' }}>
            <Search size={15} className="text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleChange(e.target.value)}
              placeholder="Хэрэглэгч, пост хайх..."
              className="flex-1 bg-transparent border-none outline-none text-[var(--text-main)] text-[0.9rem] font-[inherit] placeholder:text-[var(--text-muted)]"
              onKeyDown={e => { if (e.key === 'Escape') router.back() }}
            />
            {query && (
              <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                onClick={() => { setQuery(''); setResults(null) }}>
                ×
              </button>
            )}
          </div>
        </div>

        {/* States */}
        {loading && (
          <p className="text-center text-[var(--text-muted)] text-sm py-8">Хайж байна...</p>
        )}
        {!loading && empty && (
          <p className="text-center text-[var(--text-muted)] text-sm py-8">
            &ldquo;{query}&rdquo; — олдсонгүй
          </p>
        )}
        {!loading && !results && !query && (
          <p className="text-center text-[var(--text-muted)] text-sm py-8">
            Хэрэглэгч эсвэл post-ийн нэрийг бичнэ үү
          </p>
        )}

        {/* Users */}
        {!loading && (results?.users.length ?? 0) > 0 && (
          <section className="mb-5">
            <h2 className="text-[0.75rem] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
              Хэрэглэгчид
            </h2>
            <div className="flex flex-col gap-2">
              {results!.users.map(u => <UserCard key={u.id} u={u} />)}
            </div>
          </section>
        )}

        {/* Posts */}
        {!loading && (results?.posts.length ?? 0) > 0 && (
          <section>
            <h2 className="text-[0.75rem] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-1">
              Постууд
            </h2>
            <div className="flex flex-col gap-2">
              {results!.posts.map(p => <PostResultCard key={p.id} p={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  )
}
