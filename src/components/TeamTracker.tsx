'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Activity, MapPin, Navigation, Phone, Plus, Trash2, Users } from 'lucide-react'

const STORAGE_KEY = 'khannaway-team-units-v2'

type TeamCategory = 'Аюулгүй байдал' | 'Эмнэлэг' | 'Засвар үйлчилгээ' | 'Ложистик' | 'Медиа'
type TeamStatus = 'Эргүүл' | 'Бэлэн' | 'Очих замдаа' | 'Завсарлага'
type TeamPriority = 'Бага' | 'Дунд' | 'Өндөр'

type TeamUnit = {
  id: number
  name: string
  category: TeamCategory
  lead: string
  phone: string
  location: string
  status: TeamStatus
  members: number
  priority: TeamPriority
  notes: string
}

type TeamForm = Omit<TeamUnit, 'id' | 'members'> & {
  members: string
}

const initialTeams: TeamUnit[] = [
  {
    id: 1,
    name: 'Unit Alpha',
    category: 'Аюулгүй байдал',
    lead: 'Б. Тэмүүлэн',
    phone: '+976 8800 1122',
    location: 'Зүүн хаалга',
    status: 'Эргүүл',
    members: 8,
    priority: 'Дунд',
    notes: 'Үзэгчдийн урсгал болон хаалганы нэвтрэлтийг хянаж байна.'
  },
  {
    id: 2,
    name: 'Unit Bravo',
    category: 'Эмнэлэг',
    lead: 'С. Энхжин',
    phone: '+976 8800 2233',
    location: 'Төв талбай',
    status: 'Бэлэн',
    members: 5,
    priority: 'Өндөр',
    notes: 'Анхны тусламжийн баг үндсэн асарт байрлаж байна.'
  },
  {
    id: 3,
    name: 'Unit Charlie',
    category: 'Засвар үйлчилгээ',
    lead: 'Д. Бат-Оргил',
    phone: '+976 8800 3344',
    location: 'D сектор',
    status: 'Очих замдаа',
    members: 4,
    priority: 'Дунд',
    notes: 'Гэрэлтүүлэг болон түр хаалтын шалгалт хийж байна.'
  }
]

const emptyForm: TeamForm = {
  name: '',
  category: 'Аюулгүй байдал',
  lead: '',
  phone: '',
  location: '',
  status: 'Бэлэн',
  members: '1',
  priority: 'Дунд',
  notes: ''
}

const statusColors: Record<TeamStatus, string> = {
  Эргүүл: 'var(--primary)',
  Бэлэн: 'var(--secondary)',
  'Очих замдаа': '#f59e0b',
  Завсарлага: 'var(--text-muted)'
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.75rem',
  borderRadius: 8,
  border: '1px solid var(--border-glass)',
  background: 'rgba(255, 255, 255, 0.06)',
  color: 'var(--text-main)',
  fontFamily: 'inherit'
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
  fontSize: '0.76rem',
  color: 'var(--text-muted)'
}

const TeamTracker = () => {
  const [team, setTeam] = useState<TeamUnit[]>(initialTeams)
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY)
      const savedTeams = savedRaw ? JSON.parse(savedRaw) as TeamUnit[] : null
      if (Array.isArray(savedTeams) && savedTeams.length > 0) {
        setTeam(savedTeams)
      }
    } catch {
      setTeam(initialTeams)
    }

    setStorageReady(true)
  }, [])

  const [form, setForm] = useState<TeamForm>(emptyForm)
  const [showForm, setShowForm] = useState(true)

  useEffect(() => {
    if (!storageReady) return

    localStorage.setItem(STORAGE_KEY, JSON.stringify(team))
  }, [team, storageReady])

  const teamSummary = useMemo(() => {
    const members = team.reduce((total, unit) => total + Number(unit.members || 0), 0)
    const active = team.filter(unit => unit.status !== 'Завсарлага').length
    return { members, active }
  }, [team])

  const updateForm = <Field extends keyof TeamForm>(field: Field, value: TeamForm[Field]) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const addTeam = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = form.name.trim()
    const location = form.location.trim()
    if (!name || !location) return

    setTeam(current => [
      {
        ...form,
        id: Date.now(),
        name,
        lead: form.lead.trim() || 'Томилоогүй',
        phone: form.phone.trim() || 'Холбоо барих дугаар алга',
        location,
        members: Math.max(1, Number(form.members) || 1),
        notes: form.notes.trim() || 'Нэмэлт мэдээлэл оруулаагүй.'
      },
      ...current
    ])
    setForm(emptyForm)
  }

  const removeTeam = (id: number) => {
    setTeam(current => current.filter(unit => unit.id !== id))
  }

  return (
    <div className="glass-panel overlay-panel animate-fade-in" style={{
      top: '5.25rem', right: '2rem', width: '430px', maxHeight: '84vh', overflowY: 'auto', padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={23} color="var(--secondary)" /> Багийн бүртгэл
          </h2>
          <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            {team.length} баг • {teamSummary.active} идэвхтэй • {teamSummary.members} хүн
          </p>
        </div>
        <button className="glass-button" onClick={() => setShowForm(current => !current)} style={{ padding: '0.55rem 0.65rem' }}>
          <Plus size={16} /> Нэмэх
        </button>
      </div>

      {showForm && (
        <form onSubmit={addTeam} style={{
          display: 'grid', gap: '0.75rem', padding: '0.85rem',
          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: 8
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Багийн нэр
              <input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Жишээ: Unit Delta" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Төрөл
              <select value={form.category} onChange={(event) => updateForm('category', event.target.value as TeamCategory)} style={fieldStyle}>
                <option>Аюулгүй байдал</option>
                <option>Эмнэлэг</option>
                <option>Засвар үйлчилгээ</option>
                <option>Ложистик</option>
                <option>Медиа</option>
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Ахлагч
              <input value={form.lead} onChange={(event) => updateForm('lead', event.target.value)} placeholder="Ахлагчийн нэр" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Утас
              <input value={form.phone} onChange={(event) => updateForm('phone', event.target.value)} placeholder="+976 ..." style={fieldStyle} />
            </label>
          </div>

          <label style={labelStyle}>
            Байршил
            <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="Жишээ: Баруун хаалга" style={fieldStyle} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Төлөв
              <select value={form.status} onChange={(event) => updateForm('status', event.target.value as TeamStatus)} style={fieldStyle}>
                <option>Бэлэн</option>
                <option>Эргүүл</option>
                <option>Очих замдаа</option>
                <option>Завсарлага</option>
              </select>
            </label>
            <label style={labelStyle}>
              Хүн
              <input value={form.members} onChange={(event) => updateForm('members', event.target.value)} type="number" min="1" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Чухал
              <select value={form.priority} onChange={(event) => updateForm('priority', event.target.value as TeamPriority)} style={fieldStyle}>
                <option>Бага</option>
                <option>Дунд</option>
                <option>Өндөр</option>
              </select>
            </label>
          </div>

          <label style={labelStyle}>
            Нэмэлт мэдээлэл
            <textarea value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Багийн үүрэг, хэрэгтэй мэдээлэл..." rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
          </label>

          <button className="glass-button active" type="submit" style={{ justifyContent: 'center' }}>
            <Plus size={16} /> Баг нэмэх
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {team.map(member => (
          <div key={member.id} style={{
            display: 'grid', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.85rem', borderRadius: 8,
            border: '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div style={{
                width: 42, height: 42, borderRadius: '50%', background: statusColors[member.status] || 'var(--secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06111a', flex: '0 0 auto'
              }}>
                <Navigation size={20} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{member.name}</div>
                  <button aria-label="Баг устгах" onClick={() => removeTeam(member.id)} style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.18rem' }}>{member.category} • {member.priority} чухал</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><MapPin size={13} /> {member.location}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Activity size={13} /> {member.status}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={13} /> {member.members} хүн</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Phone size={13} /> {member.phone}</span>
            </div>

            <div style={{ fontSize: '0.82rem', lineHeight: 1.45 }}>
              <strong>{member.lead}</strong>
              <span style={{ color: 'var(--text-muted)' }}> • {member.notes}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TeamTracker
