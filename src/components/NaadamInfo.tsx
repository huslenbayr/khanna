'use client'

import type { CSSProperties, FormEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, CalendarDays, Globe2, Info, MapPin, Plus, ShieldCheck, Trash2 } from 'lucide-react'

const STORAGE_KEY = 'khannaway-naadam-info-v1'

const categories = ['Бүгд', 'Ерөнхий', 'Хөтөлбөр', 'Тэмцээн', 'Зочны зөвлөмж', 'Аюулгүй байдал', 'Тээвэр'] as const

type InfoCategory = (typeof categories)[number]
type NaadamCategory = Exclude<InfoCategory, 'Бүгд'>
type LanguageFilter = 'both' | 'mn' | 'en'
type NaadamInfoVariant = 'overlay' | 'page'

type NaadamInfoItem = {
  id: number
  category: NaadamCategory
  audience: string
  location: string
  titleMn: string
  titleEn: string
  bodyMn: string
  bodyEn: string
  tipMn: string
  tipEn: string
}

type NaadamInfoForm = Omit<NaadamInfoItem, 'id'>

type NaadamInfoProps = {
  variant?: NaadamInfoVariant
}

const initialInfo: NaadamInfoItem[] = [
  {
    id: 1,
    category: 'Ерөнхий',
    audience: 'Гадаад зочид',
    location: 'Улаанбаатар',
    titleMn: 'Наадам гэж юу вэ?',
    titleEn: 'What is Naadam?',
    bodyMn: 'Наадам бол Монголын үндэсний их баяр бөгөөд бөх, хурдан морь, сур харваа зэрэг уламжлалт тэмцээнүүдээр дамжуулан түүх, соёлоо харуулдаг.',
    bodyEn: 'Naadam is Mongolia’s national festival, celebrating history and culture through traditional competitions such as wrestling, horse racing, and archery.',
    tipMn: 'Жилийн албан ёсны цагийн хуваарийг зохион байгуулагчийн мэдэгдлээр шинэчилнэ.',
    tipEn: 'Update the exact yearly schedule once the official program is published.'
  },
  {
    id: 2,
    category: 'Тэмцээн',
    audience: 'Анх удаа ирж буй зочид',
    location: 'Төв цэнгэлдэх',
    titleMn: 'Эрийн гурван наадам',
    titleEn: 'The Three Manly Games',
    bodyMn: 'Үндсэн төрлүүд нь үндэсний бөх, хурдан морины уралдаан, сур харваа. Мөн шагайн харваа зэрэг соёлын нэмэлт үзүүлбэрүүд байдаг.',
    bodyEn: 'The core events are Mongolian wrestling, horse racing, and archery. Visitors may also see ankle-bone shooting and other cultural showcases.',
    tipMn: 'Тэмцээний талбай бүрийн орох, гарах чиглэлийг map дээр тодорхой тэмдэглэ.',
    tipEn: 'Mark entrances, exits, and event areas clearly on the map.'
  },
  {
    id: 3,
    category: 'Зочны зөвлөмж',
    audience: 'Гадаад зочид',
    location: 'Цэнгэлдэх орчим',
    titleMn: 'Зочдод зориулсан соёлын зөвлөмж',
    titleEn: 'Visitor Etiquette',
    bodyMn: 'Зураг авахдаа хүмүүсээс зөвшөөрөл асуух, морь болон уралдааны бүсэд хэт ойртохгүй байх, хог хаяхгүй байх нь чухал.',
    bodyEn: 'Ask before taking close-up photos of people, keep a safe distance from horses and race areas, and avoid littering.',
    tipMn: 'Богино, ойлгомжтой signage-г Монгол/Англи хоёр хэлээр байрлуул.',
    tipEn: 'Use short bilingual signs in Mongolian and English.'
  },
  {
    id: 4,
    category: 'Аюулгүй байдал',
    audience: 'Бүх зочид',
    location: 'Хаалга, хүнсний хэсэг, суудлын бүс',
    titleMn: 'Аюулгүй байдлын мэдээлэл',
    titleEn: 'Safety Information',
    bodyMn: 'Хүүхэд, ахмад настан, гадаад зочид төөрөх эрсдэлтэй хэсгүүдэд тусламжийн цэг, эмнэлгийн баг, мэдээллийн ажилтныг тодорхой тэмдэглэ.',
    bodyEn: 'Clearly mark help desks, medical teams, and information staff in areas where children, elderly guests, or foreign visitors may need assistance.',
    tipMn: 'Яаралтай холбоо барих дугаар болон meeting point-уудыг card болгон оруул.',
    tipEn: 'Add emergency contacts and meeting points as dedicated info cards.'
  },
  {
    id: 5,
    category: 'Ерөнхий',
    audience: 'Гадаад зочид',
    location: 'Төв хаалга',
    titleMn: 'Жуулчны мэдээллийн цэг',
    titleEn: 'Tourist Information Point',
    bodyMn: 'Гадаад зочид газрын зураг, хөтөлбөр, тусламжийн мэдээллийг эндээс авна.',
    bodyEn: 'Foreign visitors can get maps, program updates, and help information here.',
    tipMn: 'Англи хэлтэй ажилтан байрлуулах.',
    tipEn: 'Assign English-speaking staff here.'
  }
]

const emptyForm: NaadamInfoForm = {
  category: 'Ерөнхий',
  audience: 'Гадаад зочид',
  location: '',
  titleMn: '',
  titleEn: '',
  bodyMn: '',
  bodyEn: '',
  tipMn: '',
  tipEn: ''
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

const iconByCategory: Record<NaadamCategory, LucideIcon> = {
  Ерөнхий: Info,
  Хөтөлбөр: CalendarDays,
  Тэмцээн: ShieldCheck,
  'Зочны зөвлөмж': Globe2,
  'Аюулгүй байдал': ShieldCheck,
  Тээвэр: MapPin
}

const NaadamInfo = ({ variant = 'overlay' }: NaadamInfoProps) => {
  const [language, setLanguage] = useState<LanguageFilter>('both')
  const [activeCategory, setActiveCategory] = useState<InfoCategory>('Бүгд')
  const [showForm, setShowForm] = useState(true)
  const [form, setForm] = useState<NaadamInfoForm>(emptyForm)
  const [items, setItems] = useState<NaadamInfoItem[]>(initialInfo)
  const [storageReady, setStorageReady] = useState(false)

  useEffect(() => {
    try {
      const savedRaw = localStorage.getItem(STORAGE_KEY)
      const saved = savedRaw ? JSON.parse(savedRaw) as NaadamInfoItem[] : null
      if (Array.isArray(saved) && saved.length > 0) {
        setItems(saved)
      }
    } catch {
      setItems(initialInfo)
    }

    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady) return

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, storageReady])

  const filteredItems = useMemo(() => (
    activeCategory === 'Бүгд' ? items : items.filter(item => item.category === activeCategory)
  ), [activeCategory, items])

  const updateForm = (field: keyof NaadamInfoForm, value: string) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const addInfo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.titleMn.trim() && !form.titleEn.trim()) return
    if (!form.bodyMn.trim() && !form.bodyEn.trim()) return

    setItems(current => [
      {
        ...form,
        id: Date.now(),
        titleMn: form.titleMn.trim() || form.titleEn.trim(),
        titleEn: form.titleEn.trim() || form.titleMn.trim(),
        bodyMn: form.bodyMn.trim() || form.bodyEn.trim(),
        bodyEn: form.bodyEn.trim() || form.bodyMn.trim(),
        location: form.location.trim() || 'Байршил оруулаагүй',
        tipMn: form.tipMn.trim(),
        tipEn: form.tipEn.trim()
      },
      ...current
    ])
    setForm(emptyForm)
  }

  const removeInfo = (id: number) => {
    setItems(current => current.filter(item => item.id !== id))
  }

  const shellStyle: CSSProperties = variant === 'page'
    ? {
        padding: '6.5rem 3rem 3rem',
        minHeight: '100vh',
        overflowY: 'auto',
        display: 'grid',
        gap: '1.25rem'
      }
    : {
        top: '5.25rem',
        right: '2rem',
        width: '520px',
        maxHeight: '84vh',
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }

  return (
    <div className={variant === 'page' ? 'naadam-info-page' : 'glass-panel overlay-panel animate-fade-in'} style={shellStyle}>
      <div className={variant === 'page' ? 'glass-panel' : undefined} style={{
        padding: variant === 'page' ? '1.25rem' : 0,
        display: 'grid',
        gap: '0.9rem',
        borderBottom: variant === 'overlay' ? '1px solid var(--border-glass)' : undefined,
        paddingBottom: variant === 'overlay' ? '0.95rem' : '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: variant === 'page' ? '1.65rem' : '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={variant === 'page' ? 28 : 23} color="var(--primary)" /> Наадмын мэдээлэл
            </h2>
            <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
              Гадаад зочдод зориулсан Монгол/Англи тайлбар, соёлын зөвлөмж, аюулгүй байдлын мэдээлэл.
            </p>
          </div>
          <button className="glass-button" onClick={() => setShowForm(current => !current)} style={{ padding: '0.55rem 0.65rem' }}>
            <Plus size={16} /> Мэдээлэл
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {(['both', 'mn', 'en'] as const).map(option => (
            <button
              key={option}
              className={`glass-button ${language === option ? 'active' : ''}`}
              onClick={() => setLanguage(option)}
              style={{ padding: '0.45rem 0.65rem', fontSize: '0.78rem' }}
            >
              {option === 'both' ? 'MN + EN' : option.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          {categories.map(category => (
            <button
              key={category}
              className={`glass-button ${activeCategory === category ? 'active' : ''}`}
              onClick={() => setActiveCategory(category)}
              style={{ padding: '0.42rem 0.58rem', fontSize: '0.74rem' }}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <form onSubmit={addInfo} className="glass-panel" style={{
          display: 'grid',
          gap: '0.75rem',
          padding: '0.9rem',
          borderRadius: 8,
          background: 'rgba(255, 255, 255, 0.05)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Ангилал
              <select value={form.category} onChange={(event) => updateForm('category', event.target.value)} style={fieldStyle}>
                {categories.filter((category): category is NaadamCategory => category !== 'Бүгд').map(category => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label style={labelStyle}>
              Хэнд зориулав
              <input value={form.audience} onChange={(event) => updateForm('audience', event.target.value)} placeholder="Гадаад зочид" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Байршил
              <input value={form.location} onChange={(event) => updateForm('location', event.target.value)} placeholder="Төв цэнгэлдэх" style={fieldStyle} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Гарчиг MN
              <input value={form.titleMn} onChange={(event) => updateForm('titleMn', event.target.value)} placeholder="Жишээ: Нээлтийн ёслол" style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Title EN
              <input value={form.titleEn} onChange={(event) => updateForm('titleEn', event.target.value)} placeholder="Example: Opening Ceremony" style={fieldStyle} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Тайлбар MN
              <textarea value={form.bodyMn} onChange={(event) => updateForm('bodyMn', event.target.value)} rows={4} placeholder="Монгол тайлбар..." style={{ ...fieldStyle, resize: 'vertical' }} />
            </label>
            <label style={labelStyle}>
              Description EN
              <textarea value={form.bodyEn} onChange={(event) => updateForm('bodyEn', event.target.value)} rows={4} placeholder="English description..." style={{ ...fieldStyle, resize: 'vertical' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
            <label style={labelStyle}>
              Зөвлөмж MN
              <input value={form.tipMn} onChange={(event) => updateForm('tipMn', event.target.value)} placeholder="Богино зөвлөмж..." style={fieldStyle} />
            </label>
            <label style={labelStyle}>
              Tip EN
              <input value={form.tipEn} onChange={(event) => updateForm('tipEn', event.target.value)} placeholder="Short visitor tip..." style={fieldStyle} />
            </label>
          </div>

          <button className="glass-button active" type="submit" style={{ justifyContent: 'center' }}>
            <Plus size={16} /> Мэдээлэл нэмэх
          </button>
        </form>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: variant === 'page' ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
        gap: '0.85rem'
      }}>
        {filteredItems.map(item => {
          const CategoryIcon = iconByCategory[item.category] || Info

          return (
            <article key={item.id} className="glass-panel" style={{
              padding: '0.95rem',
              display: 'grid',
              gap: '0.75rem',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(74, 222, 128, 0.12)',
                  color: 'var(--primary)',
                  flex: '0 0 auto'
                }}>
                  <CategoryIcon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>{item.category} • {item.audience}</div>
                      {(language === 'both' || language === 'mn') && (
                        <h3 style={{ fontSize: '1rem', marginTop: '0.25rem' }}>{item.titleMn}</h3>
                      )}
                      {(language === 'both' || language === 'en') && (
                        <h3 style={{ fontSize: language === 'both' ? '0.92rem' : '1rem', marginTop: language === 'both' ? '0.15rem' : '0.25rem', color: language === 'both' ? 'var(--primary)' : 'var(--text-main)' }}>{item.titleEn}</h3>
                      )}
                    </div>
                    <button aria-label="Мэдээлэл устгах" onClick={() => removeInfo(item.id)} style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {(language === 'both' || language === 'mn') && (
                <p style={{ fontSize: '0.86rem', lineHeight: 1.52 }}>{item.bodyMn}</p>
              )}
              {(language === 'both' || language === 'en') && (
                <p style={{ fontSize: '0.86rem', lineHeight: 1.52, color: language === 'both' ? 'var(--text-muted)' : 'var(--text-main)' }}>{item.bodyEn}</p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                <MapPin size={13} /> {item.location}
              </div>

              {(item.tipMn || item.tipEn) && (
                <div style={{ padding: '0.65rem', borderRadius: 8, background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.18)', fontSize: '0.78rem', lineHeight: 1.45 }}>
                  {(language === 'both' || language === 'mn') && item.tipMn && <div>{item.tipMn}</div>}
                  {(language === 'both' || language === 'en') && item.tipEn && <div style={{ color: language === 'both' ? 'var(--text-muted)' : 'var(--text-main)' }}>{item.tipEn}</div>}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}

export default NaadamInfo
