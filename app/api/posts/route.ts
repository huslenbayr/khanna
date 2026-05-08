import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = Number(searchParams.get('radius') ?? 500)

  const supabase = await createClient()

  let query = supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (lat && lng) {
    query = query
      .gte('lat', Number(lat) - radius / 111000)
      .lte('lat', Number(lat) + radius / 111000)
      .gte('lng', Number(lng) - radius / 111000)
      .lte('lng', Number(lng) + radius / 111000)
  }

  const { data: posts, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const userIds = [...new Set((posts ?? []).map(p => p.user_id as string | null).filter(Boolean))] as string[]
  let profileMap: Record<string, { name: string; phone: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, phone')
      .in('id', userIds)
    for (const p of profiles ?? []) {
      profileMap[p.id] = { name: p.name, phone: p.phone }
    }
  }

  const result = (posts ?? []).map(p => ({
    ...p,
    author: p.user_id ? (profileMap[p.user_id] ?? null) : null,
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
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: body.title,
      caption: body.caption,
      post_type: body.post_type,
      media_url: body.media_url,
      media_type: body.media_type,
      lat: body.lat,
      lng: body.lng,
      location_name: body.location_name,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
