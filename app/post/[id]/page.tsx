import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import PostCard, { type Post } from '@/components/PostCard'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: postData }, { data: authData }] = await Promise.all([
    supabase.from('posts').select('*').eq('id', id).single(),
    supabase.auth.getUser(),
  ])

  if (!postData) notFound()

  const user = authData.user

  const [{ data: profile }, { count: likeCount }, { count: commentCount }, { data: likeRow }] = await Promise.all([
    postData.user_id
      ? supabase.from('profiles').select('name, phone, avatar_url, verified').eq('id', postData.user_id).single()
      : Promise.resolve({ data: null }),
    supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', id),
    supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', id),
    user?.id
      ? supabase.from('likes').select('id').eq('post_id', id).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const post: Post = {
    id: postData.id,
    user_id: postData.user_id,
    title: postData.title,
    caption: postData.caption,
    media_url: postData.media_url,
    media_type: postData.media_type ?? 'photo',
    lat: Number(postData.lat),
    lng: Number(postData.lng),
    location_name: postData.location_name,
    post_type: postData.post_type,
    created_at: postData.created_at,
    starts_at: (postData as { starts_at?: string | null }).starts_at ?? null,
    ends_at:   (postData as { ends_at?: string | null }).ends_at   ?? null,
    author: profile ? {
      name: profile.name,
      phone: (profile as { phone?: string | null }).phone ?? null,
      avatar_url: profile.avatar_url,
      verified: profile.verified ?? false,
    } : null,
    comment_count: commentCount ?? 0,
    like_count: likeCount ?? 0,
    is_liked: !!likeRow,
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg-dark)', paddingTop: 'var(--header-h)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
        <Link href="/map" className="glass-button no-underline mb-4 inline-flex" style={{ fontSize: '0.85rem' }}>
          <ArrowLeft size={15} /> Газрын зураг руу буцах
        </Link>
        <div style={{ marginTop: '0.75rem' }}>
          <PostCard post={post} />
        </div>
      </div>
    </div>
  )
}
