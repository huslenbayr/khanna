'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Clock3, Home, MapPin, Navigation, Phone, Plus, Trash2 } from 'lucide-react'
import type { CommunityMember, CommunityRole, CommunityStatus } from '../_types/community'

const STORAGE_KEY = 'khannaway-community-home-v1'
const HOME_NAME_KEY = 'khannaway-community-home-name-v1'

type TeamTrackerProps = {
  members: CommunityMember[]
  selectedMemberId: number | null
  onMembersChange: (members: CommunityMember[]) => void
  onSelectMember: (memberId: number | null) => void
}

type CommunityForm = {
  name: string
  role: CommunityRole
  phone: string
  location: string
  status: CommunityStatus
  lat: string
  lng: string
}

const emptyForm: CommunityForm = {
  name: '',
  role: 'Найз',
  phone: '',
  location: '',
  status: 'Онлайн',
  lat: '',
  lng: '',
}

const statusColors: Record<CommunityStatus, string> = {
  Онлайн: 'var(--primary)',
  Офлайн: 'var(--text-muted)',
  'Хамт байна': 'var(--secondary)',
}

const statusLabels: Record<CommunityStatus, string> = {
  Онлайн: 'Онлайн',
  Офлайн: 'Офлайн',
  'Хамт байна': 'Хамт байна',
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  borderRadius: 8,
  border: '1px solid var(--border-glass)',
  background: 'rgba(255, 255, 255, 0.06)',
  color: 'var(--text-main)',
  fontFamily: 'inherit',
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
}

const fallbackCoordinate = (offset: number) => ({
  lat: 47.9186 + offset * 0.0042,
  lng: 106.9177 + offset * 0.0064,
})

const normalizeStatus = (status: string): CommunityStatus => {
  if (status === 'Онлайн' || status === 'Офлайн' || status === 'Хамт байна') {
    return status
  }
  return 'Онлайн'
}

const TeamTracker = ({
  members,
  selectedMemberId,
  onMembersChange,
  onSelectMember,
}: TeamTrackerProps) => {
  const [homeName, setHomeName] = useState('Манай гэр')
  const [form, setForm] = useState<CommunityForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    try {
      const savedHomeName = localStorage.getItem(HOME_NAME_KEY)
      const savedRaw = localStorage.getItem(STORAGE_KEY)
      const savedMembers = savedRaw ? JSON.parse(savedRaw) as CommunityMember[] : null

      if (savedHomeName) {
        setHomeName(savedHomeName)
      }

      if (Array.isArray(savedMembers) && savedMembers.length > 0) {
        onMembersChange(savedMembers.map(member => ({
          ...member,
          status: normalizeStatus(member.status),
          updatedAt: member.updatedAt || new Date().toISOString(),
        })))
      }
    } catch {
      // Fallback
    }

    setStorageReady(true)
  }, [onMembersChange])

  useEffect(() => {
    if (!storageReady) return

    localStorage.setItem(HOME_NAME_KEY, homeName)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(members))
  }, [homeName, members, storageReady])

  const summary = useMemo(() => {
    const online = members.filter(member => member.status === 'Онлайн').length
    const withYou = members.filter(member => member.status === 'Хамт байна').length
    return { online, withYou }
  }, [members])

  const updateForm = <Field extends keyof CommunityForm>(field: Field, value: CommunityForm[Field]) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const addMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = form.name.trim()
    const location = form.location.trim()
    if (!name || !location) return

    const fallback = fallbackCoordinate(members.length + 1)
    const lat = Number(form.lat) || fallback.lat
    const lng = Number(form.lng) || fallback.lng
    const nextMember: CommunityMember = {
      id: Date.now(),
      name,
      role: form.role,
      phone: form.phone.trim() || 'Дугаар нэмээгүй',
      location,
      status: form.status,
      coordinates: { lat, lng },
      updatedAt: new Date().toISOString(),
    }

    onMembersChange([nextMember, ...members])
    onSelectMember(nextMember.id)
    setForm(emptyForm)
  }

  const removeMember = (id: number) => {
    onMembersChange(members.filter(member => member.id !== id))
    if (selectedMemberId === id) {
      onSelectMember(null)
    }
  }

  const useDeviceLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(position => {
      setForm(current => ({
        ...current,
        lat: position.coords.latitude.toFixed(6),
        lng: position.coords.longitude.toFixed(6),
        location: current.location || 'Миний одоогийн байршил',
      }))
    })
  }

  return (
    <div className="glass-panel overlay-panel animate-fade-in" style={{
      top: '5.25rem',
      right: '2rem',
      width: '430px',
      maxHeight: '84vh',
      overflowY: 'auto',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={23} color="var(--secondary)" /> Миний гэр
          </h2>
          <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.45 }}>
            {homeName} • {members.length} хүн • {summary.online} онлайн • {summary.withYou} хамт
          </p>
        </div>
        <button className="glass-button" onClick={() => setShowForm(current => !current)} style={{ padding: '0.55rem 0.65rem' }}>
          <Plus size={16} /> Нэмэх
        </button>
      </div>

      <label style={labelStyle}>
        Гэрийн нэр
        <input value={homeName} onChange={(event) => setHomeName(event.target.value)} placeholder="Гэрийн нэр" style={fieldStyle} />
      </label>

      {showForm && (
        <form onSubmit={addMember} style={{
          display: 'grid',
          gap: '0.75rem',
          padding: '0.85rem',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-glass)',
          borderRadius: 8,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Нэр
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Нэр" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Хамаарал
              <select value={form.role} onChange={(event) => updateForm('role', event.target.value as CommunityRole)} style={fieldStyle}>
                <option>Гэр бүлийн гишүүн</option>
                <option>Найз</option>
                <option>Хөрш</option>
                <option>Хамт яваа</option>
              </select>
            </label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Утас
              <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="+976 ..." style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Төлөв
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value as CommunityStatus)} style={fieldStyle}>
                <option>Онлайн</option>
                <option>Офлайн</option>
                <option>Хамт байна</option>
              </select>
            </label>
          </div>
          <label style={labelStyle}>
            Байршил
            <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="Жишээ: Сансар..." style={fieldStyle} />
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.65rem', alignItems: 'end' }}>
            <label style={labelStyle}>
              Lat
              <input value={form.lat} onChange={(event) => updateForm('lat', event.target.value)} placeholder="47.9186" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Lng
              <input value={form.lng} onChange={(event) => updateForm('lng', event.target.value)} placeholder="106.9177" style={fieldStyle} />
            </label>
            <button type="button" className="glass-button" onClick={useDeviceLocation} style={{ padding: '0.65rem 0.72rem' }}>
              <Navigation size={15} />
            </button>
          </div>
          <button className="glass-button active" type="submit" style={{ justifyContent: 'center' }}>
            <Plus size={16} /> Гэрт нэмэх
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {members.map(member => (
          <button
            key={member.id}
            type="button"
            onClick={() => onSelectMember(member.id)}
            style={{
              display: 'grid',
              gap: '0.75rem',
              background: selectedMemberId === member.id ? 'rgba(59, 130, 246, 0.16)' : 'rgba(255, 255, 255, 0.05)',
              padding: '0.85rem',
              borderRadius: 8,
              border: selectedMemberId === member.id ? '1px solid var(--secondary)' : '1px solid var(--border-glass)',
              color: 'var(--text-main)',
              textAlign: 'left',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: statusColors[member.status],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#06111a',
                flex: '0 0 auto',
                fontWeight: 800,
              }}>
                {member.name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{member.name}</div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation()
                      removeMember(member.id)
                    }}
                    style={{ color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <Trash2 size={15} />
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.18rem' }}>
                  {member.role} • {statusLabels[member.status]}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {member.location}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock3 size={13} /> {new Date(member.updatedAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={13} /> {member.phone}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Navigation size={13} /> {member.coordinates.lat.toFixed(4)}, {member.coordinates.lng.toFixed(4)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default TeamTracker
