import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, MapPin, MessageCircle, User } from 'lucide-react'

const TYPE_META: Record<string, { label: string; color: string }> = {
  info:     { label: 'Мэдээлэл',       color: '#38bdf8' },
  issue:    { label: 'Асуудал',         color: '#f87171' },
  landmark: { label: 'Онцгой газар',   color: '#a78bfa' },
  event:    { label: 'Арга хэмжээ',    color: '#4ade80' },
  safety:   { label: 'Аюулгүй байдал', color: '#fb923c' },
}

const fmt = (iso: string) => new Date(iso).toLocaleString('mn-MN')

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase.from('posts').select('*').eq('id', id).single()
  if (!post) notFound()

  const [{ data: profile }, { count: likeCount }, { count: commentCount }] = await Promise.all([
    post.user_id
      ? supabase.from('profiles').select('id, name, avatar_url, verified').eq('id', post.user_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', id),
  ])

  const meta = TYPE_META[post.post_type ?? 'info'] ?? TYPE_META.info

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg-dark)', paddingTop: 'var(--header-h)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <Link href="/dashboard" className="glass-button no-underline mb-4 inline-flex" style={{ fontSize: '0.85rem' }}>
          <ArrowLeft size={15} /> Газрын зураг руу буцах
        </Link>

        <div className="glass-panel post-card" style={{ marginTop: '0.75rem' }}>
          {/* Type + time */}
          <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
            <span
              className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full"
              style={{ color: meta.color, background: `${meta.color}1a` }}
            >
              {meta.label}
            </span>
            <span className="text-[0.72rem] text-[var(--text-muted)] ml-auto">{fmt(post.created_at)}</span>
          </div>

          {/* Author */}
          {profile && post.user_id && (
            <Link href={`/profile/${post.user_id}`} className="px-3 pb-1.5 flex items-center gap-1.5 no-underline">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(74,222,128,0.15)' }}>
                  <User size={12} className="text-[var(--primary)]" />
                </div>
              )}
              <span className="text-[0.78rem] font-medium text-[var(--text-sub)] hover:text-[var(--primary)] transition-colors">
                {profile.name}
              </span>
              {profile.verified && <span className="verified-badge"><Check size={9} /></span>}
            </Link>
          )}

          {/* Title */}
          {post.title && <div className="px-3 pb-1.5 font-semibold text-[0.9rem] leading-tight">{post.title}</div>}

          {/* Media */}
          {post.media_type === 'video' ? (
            <video src={post.media_url} controls playsInline className="w-full block bg-[#020617]" />
          ) : (
            <img src={post.media_url} alt={post.title ?? ''} className="w-full object-cover block" />
          )}

          {/* Caption */}
          {post.caption && (
            <p className="px-3 pt-2 pb-0 m-0 text-[0.85rem] leading-[1.55] text-[var(--text-sub)]">{post.caption}</p>
          )}

          {/* Location + stats */}
          <div className="px-3 py-2.5 flex items-center gap-3 flex-wrap">
            <span className="post-locate-btn">
              <MapPin size={11} />
              {post.location_name ?? `${Number(post.lat).toFixed(3)}, ${Number(post.lng).toFixed(3)}`}
            </span>
            <span className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)] ml-auto">
              ❤️ {likeCount ?? 0}
            </span>
            <span className="flex items-center gap-1 text-[0.75rem] text-[var(--text-muted)]">
              <MessageCircle size={13} /> {commentCount ?? 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
