'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Bell, CheckCircle2, Crosshair, ImagePlus, Loader2, MapPin, MessageSquare, Send, X } from 'lucide-react'
import type { CitizenReport, ReportCategory, ReportCoordinates, ReportMedia, ReportStatus } from '../_types/citizenReport'
import { reportCategories, reportStatuses } from '../_types/citizenReport'

type SocialDashboardProps = {
  reports: CitizenReport[]
  currentLocation: ReportCoordinates | null
  selectedReport: CitizenReport | null
  createdBy: string
  onCurrentLocationChange: (point: ReportCoordinates) => void
  onAddReport: (report: CitizenReport) => void
  onSelectReport: (reportId: string | null) => void
}

type ReportForm = {
  category: ReportCategory
  description: string
  district: string
  locationText: string
  comments: string
  status: ReportStatus
}

const emptyForm: ReportForm = {
  category: 'Мөстсөн / халтиргаатай хэсэг',
  description: '',
  district: '',
  locationText: '',
  comments: '',
  status: 'Received',
}

const statusLabels: Record<ReportStatus, string> = {
  Received: 'Хүлээн авсан',
  Verified: 'Баталгаажсан',
  'In Progress': 'Шийдвэрлэж байна',
  Resolved: 'Шийдвэрлэсэн',
}

const fieldStyle: CSSProperties = {
  width: '100%',
  padding: '0.72rem 0.78rem',
  borderRadius: 8,
  border: '1px solid var(--border-glass)',
  background: 'rgba(255, 255, 255, 0.06)',
  color: 'var(--text-main)',
  fontFamily: 'inherit',
  outline: 'none',
}

const labelStyle: CSSProperties = {
  display: 'grid',
  gap: '0.35rem',
  fontSize: '0.76rem',
  color: 'var(--text-muted)',
}

const getMediaType = (file: File): ReportMedia['type'] => (
  file.type.startsWith('video/') ? 'video' : 'image'
)

const formatCreatedAt = (value: string) => (
  new Intl.DateTimeFormat('mn-MN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
)

const getDistanceMeters = (from: ReportCoordinates, to: ReportCoordinates) => {
  const earthRadiusMeters = 6371000
  const toRadians = (value: number) => (value * Math.PI) / 180
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLng = toRadians(to.lng - from.lng)
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)

  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

const formatDistance = (meters?: number) => {
  if (meters === undefined) return ''
  if (meters < 1000) return `${Math.round(meters)} м`
  return `${(meters / 1000).toFixed(1)} км`
}

const SocialDashboard = ({
  reports,
  currentLocation,
  selectedReport,
  createdBy,
  onCurrentLocationChange,
  onAddReport,
  onSelectReport,
}: SocialDashboardProps) => {
  const [form, setForm] = useState<ReportForm>(emptyForm)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<ReportMedia[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [locationError, setLocationError] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [nearbyOpen, setNearbyOpen] = useState(false)

  const reportSummary = useMemo(() => {
    const active = reports.filter(report => report.status !== 'Resolved').length
    const resolved = reports.length - active
    return { active, resolved }
  }, [reports])

  const feedReports = useMemo(() => {
    const reportsWithDistance = reports.map(report => ({
      report,
      distanceMeters: currentLocation ? getDistanceMeters(currentLocation, report.coordinates) : undefined,
    }))

    return reportsWithDistance.sort((a, b) => {
      if (a.distanceMeters !== undefined && b.distanceMeters !== undefined) {
        return a.distanceMeters - b.distanceMeters
      }
      return new Date(b.report.createdAt).getTime() - new Date(a.report.createdAt).getTime()
    })
  }, [currentLocation, reports])

  const nearbyReports = useMemo(() => (
    feedReports
      .filter(item => item.distanceMeters !== undefined && item.distanceMeters <= 2000)
      .slice(0, 4)
  ), [feedReports])

  const updateForm = <Field extends keyof ReportForm>(field: Field, value: ReportForm[Field]) => {
    setForm(current => ({ ...current, [field]: value }))
  }

  const updateMediaFiles = (files: File[]) => {
    mediaPreviews.forEach(media => URL.revokeObjectURL(media.url))
    setMediaFiles(files)
    setMediaPreviews(files.map(file => ({
      type: getMediaType(file),
      url: URL.createObjectURL(file),
      fileName: file.name,
    })))
  }

  const requestCurrentLocation = () => {
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Байршил авах боломжгүй байна.')
      return
    }

    setLocationLoading(true)
    navigator.geolocation.getCurrentPosition(
      position => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        onCurrentLocationChange(nextLocation)
        setNearbyOpen(true)
        setLocationLoading(false)
      },
      error => {
        setLocationError('Байршил авахад алдаа гарлаа.')
        setLocationLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  const addReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const description = form.description.trim()
    const locationText = form.locationText.trim()
    if (!description || !locationText) return

    const coordinates = currentLocation ?? { lat: 47.9186, lng: 106.9177 }
    const report: CitizenReport = {
      id: `report-${Date.now()}`,
      category: form.category,
      description,
      district: form.district.trim() || 'Дүүрэг сонгоогүй',
      locationText,
      coordinates,
      media: mediaPreviews,
      comments: form.comments.trim(),
      status: form.status,
      createdAt: new Date().toISOString(),
      createdBy,
    }

    onAddReport(report)
    onSelectReport(report.id)
    setForm(emptyForm)
    setMediaFiles([])
    setMediaPreviews([])
    setSuccessMessage('Мэдээлэл илгээгдлээ')
    event.currentTarget.reset()
  }

  return (
    <div className="glass-panel overlay-panel animate-fade-in" style={{
      top: '5.25rem',
      right: '2rem',
      width: 'min(480px, calc(100vw - 2rem))',
      maxHeight: '84vh',
      overflowY: 'auto',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.85rem' }}>
        <h2 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MapPin size={23} color="var(--primary)" /> Иргэдийн мэдээлэл
        </h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.45 }}>
          {reports.length} мэдээ • {reportSummary.active} идэвхтэй • {reportSummary.resolved} шийдвэрлэсэн
        </p>
      </div>

      {currentLocation && nearbyOpen && (
        <div style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid var(--primary)', borderRadius: 8, padding: '0.75rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700 }}>
              <Bell size={15} /> Ойролцоох мэдээлэл
            </div>
            <button onClick={() => setNearbyOpen(false)} style={{ background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
            {nearbyReports.map(({ report, distanceMeters }) => (
              <button key={report.id} onClick={() => onSelectReport(report.id)} style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: 6, padding: '0.5rem', textAlign: 'left', color: 'var(--text-main)', cursor: 'pointer' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{report.category}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatDistance(distanceMeters)} • {report.locationText}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="glass-button active" onClick={requestCurrentLocation} disabled={locationLoading} style={{ justifyContent: 'center' }}>
        {locationLoading ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
        {locationLoading ? 'Байршил авч байна...' : 'Байршил тогтоох'}
      </button>

      <form onSubmit={addReport} style={{ display: 'grid', gap: '0.75rem', padding: '0.85rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: 8 }}>
        <label style={labelStyle}>
          Ангилал
          <select value={form.category} onChange={(event) => updateForm('category', event.target.value as ReportCategory)} style={fieldStyle}>
            {reportCategories.map(cat => <option key={cat}>{cat}</option>)}
          </select>
        </label>
        <label style={labelStyle}>
          Тайлбар
          <textarea value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Тайлбар..." rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <label style={labelStyle}>Дүүрэг <input value={form.district} onChange={(event) => updateForm('district', event.target.value)} placeholder="Дүүрэг" style={fieldStyle} /></label>
          <label style={labelStyle}>Төлөв 
            <select value={form.status} onChange={(event) => updateForm('status', event.target.value as ReportStatus)} style={fieldStyle}>
              {reportStatuses.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
            </select>
          </label>
        </div>
        <label style={labelStyle}>Байршил <input value={form.locationText} onChange={(event) => updateForm('locationText', event.target.value)} placeholder="Байршлын нэр..." style={fieldStyle} /></label>
        <button className="glass-button active" type="submit" style={{ justifyContent: 'center' }}><Send size={16} /> Илгээх</button>
      </form>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem' }}>Шинэ мэдээллүүд</h3>
        {feedReports.map(({ report, distanceMeters }) => (
          <button key={report.id} onClick={() => onSelectReport(report.id)} style={{ textAlign: 'left', background: selectedReport?.id === report.id ? 'rgba(74, 222, 128, 0.12)' : 'rgba(255, 255, 255, 0.05)', border: selectedReport?.id === report.id ? '1px solid var(--primary)' : '1px solid var(--border-glass)', borderRadius: 8, padding: '0.85rem', cursor: 'pointer', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong style={{ fontSize: '0.9rem' }}>{report.category}</strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{distanceMeters !== undefined ? formatDistance(distanceMeters) : statusLabels[report.status]}</span>
            </div>
            <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>{report.locationText}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default SocialDashboard
