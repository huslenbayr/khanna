import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(id, name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await req.json() as { content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'Empty comment' }, { status: 400 })

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: user.id, content: content.trim() })
    .select('*, profiles(id, name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
