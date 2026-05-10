import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай' }, { status: 401 })

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', id).single()
  if (!post || post.user_id !== user.id) {
    return NextResponse.json({ error: 'Зөвшөөрөл байхгүй' }, { status: 403 })
  }

  const { error } = await supabase.from('posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
