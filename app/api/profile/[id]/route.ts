import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const [profileRes, postsRes, followersRes, followingRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
  ])

  if (profileRes.error) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: { user } } = await supabase.auth.getUser()
  let is_following = false
  if (user && user.id !== id) {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', id)
      .maybeSingle()
    is_following = !!data
  }

  return NextResponse.json({
    ...profileRes.data,
    post_count:      postsRes.count     ?? 0,
    follower_count:  followersRes.count  ?? 0,
    following_count: followingRes.count  ?? 0,
    is_following,
    is_own: user?.id === id,
  })
}
