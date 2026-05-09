'use client'

import { use, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Camera, Check, ExternalLink,
  Mail, MapPin, RefreshCw, UserCheck, UserPlus, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/auth-context'
import PostCard, { type Post } from '@/app/_components/PostCard'

// ── Types ─────────────────────────────────────────────────────────────────────

type SocialLinks = {
  gmail?:     string
  facebook?:  string
  instagram?: string
  twitter?:   string
}

type Profile = {
  id: string
  name: string
  bio: string | null
  phone: string | null
  address: string | null
  avatar_url: string | null
  social_links: SocialLinks | null
  verified: boolean
  created_at: string
  post_count: number
  follower_count: number
  following_count: number
  is_following: boolean
  is_own: boolean
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({
  url, name, size = 80, editable, onUploaded,
}: {
  url: string | null
  name: string
  size?: number
  editable?: boolean
  onUploaded?: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { user, setAvatarUrl } = useAuth()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type, type: 'avatar' }),
    })
    if (presignRes.ok) {
      const { signedUrl, publicUrl } = await presignRes.json() as { signedUrl: string; publicUrl: string }
      const ok = await fetch(signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (ok.ok) {
        await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: publicUrl }),
        })
        onUploaded?.(publicUrl)
        setAvatarUrl(publicUrl)
      }
    }
    setUploading(false)
  }

  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {url ? (
        <img src={url} alt={name} className="rounded-full object-cover w-full h-full"
          style={{ border: '2px solid var(--border-glass)' }} />
      ) : (
        <div
          className="rounded-full flex items-center justify-center font-bold text-[var(--primary)]"
          style={{ width: size, height: size, background: 'rgba(74,222,128,0.12)',
            border: '2px solid var(--border-glass)', fontSize: size * 0.3 }}
        >
          {initials}
        </div>
      )}
      {editable && (
        <>
          <button
            className="absolute bottom-0 right-0 rounded-full flex items-center justify-center"
            style={{ width: 26, height: 26, background: 'var(--primary)', color: '#06111a',
              border: '2px solid var(--bg-dark)' }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <RefreshCw size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  )
}

// ── Edit form ─────────────────────────────────────────────────────────────────

function EditForm({ profile, onSaved, onCancel }: {
  profile: Profile
  onSaved: (p: Partial<Profile>) => void
  onCancel: () => void
}) {
  const [name, setName]           = useState(profile.name)
  const [bio, setBio]             = useState(profile.bio ?? '')
  const [phone, setPhone]         = useState(profile.phone ?? '')
  const [address, setAddress]     = useState(profile.address ?? '')
  const [gmail, setGmail]         = useState(profile.social_links?.gmail ?? '')
  const [facebook, setFacebook]   = useState(profile.social_links?.facebook ?? '')
  const [instagram, setInstagram] = useState(profile.social_links?.instagram ?? '')
  const [twitter, setTwitter]     = useState(profile.social_links?.twitter ?? '')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true); setError('')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(), bio: bio.trim() || null,
        phone: phone.trim() || null, address: address.trim() || null,
        social_links: {
          gmail: gmail.trim() || undefined, facebook: facebook.trim() || undefined,
          instagram: instagram.trim() || undefined, twitter: twitter.trim() || undefined,
        },
      }),
    })
    if (res.ok) {
      onSaved({ name: name.trim(), bio: bio.trim() || null,
        phone: phone.trim() || null, address: address.trim() || null,
        social_links: { gmail, facebook, instagram, twitter } })
    } else {
      setError('Хадгалахад алдаа гарлаа')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Нэр *" className="auth-input flex-1" />
        <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Утас" className="auth-input w-32" />
      </div>
      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Гэрийн хаяг" className="auth-input" />
      <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Өөрийн тухай..."
        rows={3} className="auth-input resize-none" />
      <div className="grid grid-cols-2 gap-2">
        <input value={gmail}     onChange={e => setGmail(e.target.value)}     placeholder="Gmail"     className="auth-input text-sm" />
        <input value={facebook}  onChange={e => setFacebook(e.target.value)}  placeholder="Facebook"  className="auth-input text-sm" />
        <input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="Instagram" className="auth-input text-sm" />
        <input value={twitter}   onChange={e => setTwitter(e.target.value)}   placeholder="Twitter/X" className="auth-input text-sm" />
      </div>
      {error && <p className="auth-error">{error}</p>}
      <div className="flex gap-2">
        <button className="glass-button active flex-1 justify-center" onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
          Хадгалах
        </button>
        <button className="glass-button" onClick={onCancel}><X size={14} /></button>
      </div>
    </div>
  )
}

// ── Social row ────────────────────────────────────────────────────────────────

function SocialRow({ links }: { links: SocialLinks | null }) {
  if (!links) return null
  const items = [
    { key: 'gmail',     label: 'Gmail',     icon: <Mail size={13} />,         href: links.gmail     ? `mailto:${links.gmail}` : null },
    { key: 'facebook',  label: 'Facebook',  icon: <ExternalLink size={13} />, href: links.facebook  || null },
    { key: 'instagram', label: 'Instagram', icon: <ExternalLink size={13} />, href: links.instagram || null },
    { key: 'twitter',   label: 'X',         icon: <ExternalLink size={13} />, href: links.twitter   || null },
  ].filter(i => i.href)
  if (items.length === 0) return null
  return (
    <div className="flex gap-2 flex-wrap">
      {items.map(({ key, label, icon, href }) => (
        <a key={key} href={href!} target="_blank" rel="noopener noreferrer"
          className="glass-button no-underline"
          style={{ padding: '0.4rem 0.7rem', minHeight: 32, fontSize: '0.75rem', color: 'var(--text-muted)', gap: '0.3rem' }}
        >
          {icon}{label}
        </a>
      ))}
    </div>
  )
}

// ── Post list ─────────────────────────────────────────────────────────────────

function PostList({ url, emptyMsg }: { url: string; emptyMsg: string }) {
  const [posts, setPosts]     = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(url)
      .then(r => r.json())
      .then((d: Post[]) => setPosts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [url])

  if (loading) return <p className="text-center text-[var(--text-muted)] py-8 text-sm">Уншиж байна...</p>
  if (posts.length === 0) return <p className="text-center text-[var(--text-muted)] py-8 text-sm">{emptyMsg}</p>
  return (
    <div className="flex flex-col gap-3">
      {posts.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  )
}

// ── Profile page ──────────────────────────────────────────────────────────────

type Tab = 'posts' | 'liked'

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user } = useAuth()
  const router   = useRouter()

  const [profile, setProfile]     = useState<Profile | null>(null)
  const [loadingProfile, setLP]   = useState(true)
  const [editing, setEditing]     = useState(false)
  const [followLoading, setFL]    = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [tab, setTab]             = useState<Tab>('posts')

  const fetchProfile = useCallback(async () => {
    setLP(true)
    const res = await fetch(`/api/profile/${id}`)
    if (res.ok) {
      const data = await res.json() as Profile
      setProfile(data)
      setAvatarUrl(data.avatar_url)
    }
    setLP(false)
  }, [id])

  useEffect(() => { void fetchProfile() }, [fetchProfile])

  const handleFollow = async () => {
    if (!user) { router.push('/auth'); return }
    if (!profile) return
    setFL(true)
    await fetch(`/api/follow/${id}`, { method: profile.is_following ? 'DELETE' : 'POST' })
    setProfile(p => p ? ({
      ...p,
      is_following:   !p.is_following,
      follower_count: p.is_following ? p.follower_count - 1 : p.follower_count + 1,
    }) : p)
    setFL(false)
  }

  const handleEditSaved = (updates: Partial<Profile>) => {
    setProfile(p => p ? { ...p, ...updates } : p)
    setEditing(false)
  }

  if (loadingProfile) {
    return (
      <div className="profile-page flex items-center justify-center">
        <RefreshCw size={22} className="animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="profile-page flex flex-col items-center justify-center gap-3">
        <p className="text-[var(--text-muted)]">Хэрэглэгч олдсонгүй</p>
        <Link href="/" className="glass-button no-underline">Нүүр хуудас</Link>
      </div>
    )
  }

  return (
    <div className="profile-page">
      <button className="profile-back glass-button" onClick={() => router.back()}>
        <ArrowLeft size={16} /> Буцах
      </button>

      {/* Header card */}
      <div className="profile-header glass-panel">
        <div className="profile-header-top">
          <Avatar
            url={avatarUrl}
            name={profile.name}
            size={80}
            editable={profile.is_own}
            onUploaded={url => setAvatarUrl(url)}
          />
          <div className="profile-header-info">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="profile-name">{profile.name}</h1>
              {profile.verified && (
                <span className="verified-badge" title="Баталгаажсан"><Check size={10} /></span>
              )}
            </div>
            {profile.phone && (
              <p className="text-[0.78rem] text-[var(--text-muted)]">{profile.phone}</p>
            )}
            {profile.address && (
              <p className="flex items-center gap-1 text-[0.78rem] text-[var(--text-muted)]">
                <MapPin size={11} className="shrink-0" />{profile.address}
              </p>
            )}
            <p className="text-[0.72rem] text-[var(--text-muted)] mt-0.5">
              {new Date(profile.created_at).toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' })}-с нэгдсэн
            </p>
          </div>
        </div>

        {!editing ? (
          <>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            <SocialRow links={profile.social_links} />
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat-n">{profile.post_count}</span>
                <span>Пост</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-n">{profile.follower_count}</span>
                <span>Дагагч</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-n">{profile.following_count}</span>
                <span>Дагаж байна</span>
              </div>
            </div>
            {profile.is_own ? (
              <button className="glass-button w-full justify-center" onClick={() => setEditing(true)}>
                Профайл засах
              </button>
            ) : (
              <button
                className={`glass-button w-full justify-center ${profile.is_following ? '' : 'active'}`}
                onClick={handleFollow}
                disabled={followLoading}
              >
                {followLoading
                  ? <RefreshCw size={14} className="animate-spin" />
                  : profile.is_following
                    ? <><UserCheck size={14} /> Дагаж байна</>
                    : <><UserPlus size={14} /> Дагах</>
                }
              </button>
            )}
          </>
        ) : (
          <EditForm profile={profile} onSaved={handleEditSaved} onCancel={() => setEditing(false)} />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-4 mb-3 px-1">
        {(['posts', 'liked'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-[0.82rem] font-medium transition-all"
            style={{
              background: tab === t ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
              color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
              border: `1px solid ${tab === t ? 'rgba(74,222,128,0.3)' : 'var(--border-glass)'}`,
            }}
          >
            {t === 'posts' ? 'Постууд' : 'Дуртай'}
          </button>
        ))}
      </div>

      {/* Post lists */}
      <div className="profile-posts">
        {tab === 'posts' ? (
          <PostList
            url={`/api/posts?user_id=${id}`}
            emptyMsg="Пост байхгүй байна"
          />
        ) : (
          <PostList
            url={`/api/posts?liked_by=${id}`}
            emptyMsg="Дуртай пост байхгүй байна"
          />
        )}
      </div>
    </div>
  )
}
