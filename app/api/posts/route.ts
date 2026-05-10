import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat      = searchParams.get('lat')
  const lng      = searchParams.get('lng')
  const userId   = searchParams.get('user_id')   // posts by this user
  const likedBy  = searchParams.get('liked_by')  // posts liked by this user
  const radius   = Number(searchParams.get('radius') ?? 500)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // When filtering by liked_by, get post IDs from likes table first
  let likedPostIds: string[] | null = null
  if (likedBy) {
    const { data: rows } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', likedBy)
      .order('created_at', { ascending: false })
    likedPostIds = rows?.map(r => r.post_id) ?? []
    if (likedPostIds.length === 0) return NextResponse.json([])
  }

  const now = new Date().toISOString()
  let query = supabase
    .from('posts')
    .select('*')
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (lat && lng) {
    query = query
      .gte('lat', Number(lat) - radius / 111000)
      .lte('lat', Number(lat) + radius / 111000)
      .gte('lng', Number(lng) - radius / 111000)
      .lte('lng', Number(lng) + radius / 111000)
  }
  if (userId)        query = query.eq('user_id', userId)
  if (likedPostIds)  query = query.in('id', likedPostIds)

  const { data: posts, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items   = posts ?? []
  const postIds = items.map(p => p.id as string)
  const userIds = [...new Set(items.map(p => p.user_id as string | null).filter(Boolean))] as string[]

  if (postIds.length === 0) return NextResponse.json([])

  // Author profiles
  let profileMap: Record<string, { name: string; phone: string | null; avatar_url: string | null; verified: boolean }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, phone, avatar_url, verified')
      .in('id', userIds)
    for (const p of profiles ?? []) profileMap[p.id] = p
  }

  // Counts + current user state
  const [
    { data: comments },
    { data: allLikes },
  ] = await Promise.all([
    supabase.from('comments').select('post_id').in('post_id', postIds),
    supabase.from('likes').select('post_id').in('post_id', postIds),
  ])

  const commentMap: Record<string, number> = {}
  for (const c of comments ?? []) commentMap[c.post_id] = (commentMap[c.post_id] ?? 0) + 1

  const likeMap: Record<string, number> = {}
  for (const l of allLikes ?? []) likeMap[l.post_id] = (likeMap[l.post_id] ?? 0) + 1

  const likedSet = new Set<string>()
  if (user) {
    const { data: myLikes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)
    for (const l of myLikes ?? []) likedSet.add(l.post_id)
  }

  const result = items.map(p => ({
    ...p,
    author:        p.user_id ? (profileMap[p.user_id] ?? null) : null,
    comment_count: commentMap[p.id] ?? 0,
    like_count:    likeMap[p.id]    ?? 0,
    is_liked:      likedSet.has(p.id),
  }))

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 })

  const body = await request.json() as {
    title: string
    caption: string | null
    post_type: string
    media_url: string
    media_type: 'photo' | 'video'
    lat: number
    lng: number
    location_name: string | null
    starts_at: string | null
    ends_at: string | null
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title:         body.title,
      caption:       body.caption,
      post_type:     body.post_type,
      media_url:     body.media_url,
      media_type:    body.media_type,
      lat:           body.lat,
      lng:           body.lng,
      location_name: body.location_name,
      starts_at:     body.starts_at ?? null,
      ends_at:       body.ends_at   ?? null,
      user_id:       user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
