import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 1) return NextResponse.json({ users: [], posts: [] })

  const supabase = await createClient()
  const pattern  = `%${q}%`

  const [usersRes, postsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, avatar_url, verified')
      .ilike('name', pattern)
      .limit(8),

    supabase
      .from('posts')
      .select('id, title, caption, media_url, media_type, post_type, created_at, user_id')
      .or(`title.ilike.${pattern},caption.ilike.${pattern}`)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  // Attach author info to posts
  const posts = postsRes.data ?? []
  const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))] as string[]
  let authorMap: Record<string, { name: string; avatar_url: string | null; verified: boolean }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, avatar_url, verified')
      .in('id', userIds)
    for (const p of profiles ?? []) authorMap[p.id] = p
  }

  return NextResponse.json({
    users: usersRes.data ?? [],
    posts: posts.map(p => ({
      ...p,
      author: p.user_id ? (authorMap[p.user_id] ?? null) : null,
    })),
  })
}
