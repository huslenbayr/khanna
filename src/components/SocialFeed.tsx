'use client'

import type { CSSProperties, FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { Bell, CheckCircle2, Crosshair, ImagePlus, Loader2, MapPin, MessageSquare, Send, X } from 'lucide-react'
import type { CitizenReport, ReportCategory, ReportCoordinates, ReportMedia, ReportStatus } from '../types/citizenReport'
import { reportCategories, reportStatuses } from '../types/citizenReport'

type CitizenReportPanelProps = {
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

const CitizenReportPanel = ({
  reports,
  currentLocation,
  selectedReport,
  createdBy,
  onCurrentLocationChange,
  onAddReport,
  onSelectReport,
}: CitizenReportPanelProps) => {
  const [form, setForm] = useState<ReportForm>(emptyForm)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<ReportMedia[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [locationStatus, setLocationStatus] = useState('')
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
    setLocationStatus('')
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Таны browser байршил авах боломжгүй байна.')
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
        setLocationStatus('Таны байршлыг амжилттай авлаа.')
        setNearbyOpen(true)
        setLocationLoading(false)
      },
      error => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Байршлын зөвшөөрөл цуцлагдсан байна.'
          : 'Байршил авахад алдаа гарлаа. Дахин оролдоно уу.'
        setLocationError(message)
        setLocationLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    )
  }

  const addReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const description = form.description.trim()
    const locationText = form.locationText.trim()
    if (!description || !locationText) return

    const media = mediaPreviews

    const coordinates = currentLocation ?? {
      lat: 47.9186,
      lng: 106.9177,
    }

    const report: CitizenReport = {
      id: `report-${Date.now()}`,
      category: form.category,
      description,
      district: form.district.trim() || 'Дүүрэг сонгоогүй',
      locationText,
      coordinates,
      media,
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
    setSuccessMessage('Мэдээлэл амжилттай нэмэгдлээ')
    event.currentTarget.reset()
  }

  return (
    <div className="glass-panel overlay-panel animate-fade-in citizen-report-panel" style={{
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
          <MapPin size={23} color="var(--primary)" /> Байршилд мэдээлэл нэмэх
        </h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.45 }}>
          {reports.length} report • {reportSummary.active} идэвхтэй • {reportSummary.resolved} шийдвэрлэсэн
        </p>
        <p style={{ marginTop: '0.3rem', color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.45 }}>
          Байршил: {currentLocation ? `${currentLocation.lat.toFixed(5)}, ${currentLocation.lng.toFixed(5)}` : 'device location аваагүй байна'}
        </p>
      </div>

      {currentLocation && nearbyOpen && (
        <div className="nearby-popup">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700 }}>
                <Bell size={15} /> Ойролцоо юу болж байна
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.45, marginTop: '0.25rem' }}>
                Таны байршлаас 2 км доторх report-ууд.
              </p>
            </div>
            <button
              type="button"
              aria-label="Ойролцоох popup хаах"
              onClick={() => setNearbyOpen(false)}
              style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>

          {nearbyReports.length > 0 ? (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {nearbyReports.map(({ report, distanceMeters }) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => onSelectReport(report.id)}
                  className="nearby-report-item"
                >
                  <span>
                    <strong>{report.category}</strong>
                    <small>{report.district} • {report.locationText}</small>
                  </span>
                  <em>{formatDistance(distanceMeters)}</em>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.45 }}>
              Ойролцоо report одоогоор алга. Та шинэ мэдээлэл илгээвэл энэ feed дээр шууд нэмэгдэнэ.
            </div>
          )}
        </div>
      )}

      <div style={{
        display: 'grid',
        gap: '0.55rem',
        padding: '0.85rem',
        border: '1px solid var(--border-glass)',
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.05)',
      }}>
        <button className="glass-button active" onClick={requestCurrentLocation} disabled={locationLoading} style={{ justifyContent: 'center' }}>
          {locationLoading ? <Loader2 size={16} /> : <Crosshair size={16} />}
          {locationLoading ? 'Байршил авч байна...' : 'Миний байршлыг авах'}
        </button>
        <div style={{ color: locationError ? '#fecdd3' : 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.45 }}>
          {locationError || locationStatus || 'Report нь таны зөвшөөрсөн device location дээр marker болж нэмэгдэнэ.'}
        </div>
      </div>

      <form onSubmit={addReport} style={{
        display: 'grid',
        gap: '0.75rem',
        padding: '0.85rem',
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--border-glass)',
        borderRadius: 8,
      }}>
        <label style={labelStyle}>
          Ангилал
          <select value={form.category} onChange={(event) => updateForm('category', event.target.value as ReportCategory)} style={fieldStyle}>
            {reportCategories.map(category => <option key={category}>{category}</option>)}
          </select>
        </label>

        <label style={labelStyle}>
          Тайлбар
          <textarea
            value={form.description}
            onChange={(event) => updateForm('description', event.target.value)}
            placeholder="Юу болсон талаар товч тайлбар бичнэ үү..."
            rows={4}
            style={{ ...fieldStyle, resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
          <label style={labelStyle}>
            Дүүрэг
            <input value={form.district} onChange={(event) => updateForm('district', event.target.value)} placeholder="Сүхбаатар" style={fieldStyle} />
          </label>
          <label style={labelStyle}>
            Төлөв
            <select value={form.status} onChange={(event) => updateForm('status', event.target.value as ReportStatus)} style={fieldStyle}>
              {reportStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </label>
        </div>

        <label style={labelStyle}>
          Байршил
          <input
            value={form.locationText}
            onChange={(event) => updateForm('locationText', event.target.value)}
            placeholder="Жишээ: Сансарын туннель, Сүхбаатарын талбайн баруун тал..."
            style={fieldStyle}
          />
        </label>

        <label style={labelStyle}>
          Зураг / бичлэг
          <input
            onChange={(event) => updateMediaFiles(Array.from(event.target.files ?? []))}
            type="file"
            accept="image/*,video/*"
            multiple
            style={fieldStyle}
          />
        </label>

        {mediaPreviews.length > 0 && (
          <div className="upload-preview-popover">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'var(--primary)', fontSize: '0.76rem', fontWeight: 700 }}>Preview</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {mediaFiles.length} файл report дээр хавсарна
                </div>
              </div>
              <button
                type="button"
                aria-label="Preview хаах"
                onClick={() => updateMediaFiles([])}
                style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="upload-preview-strip">
              {mediaPreviews.map(media => (
                <div className="upload-preview-item" key={`${media.fileName}-${media.url}`}>
                  {media.type === 'image' ? (
                    <img src={media.url} alt={media.fileName || 'Зураг preview'} />
                  ) : (
                    <video src={media.url} muted playsInline />
                  )}
                  <span>{media.fileName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <label style={labelStyle}>
          Сэтгэгдэл
          <input
            value={form.comments}
            onChange={(event) => updateForm('comments', event.target.value)}
            placeholder="Нэмэлт тайлбар эсвэл анхаарах зүйл..."
            style={fieldStyle}
          />
        </label>

        <button className="glass-button active" type="submit" style={{ justifyContent: 'center' }}>
          <Send size={16} /> Илгээх
        </button>
      </form>

      {successMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--primary)', fontSize: '0.82rem' }}>
          <CheckCircle2 size={16} /> {successMessage}
        </div>
      )}

      {selectedReport && (
        <ReportDetail report={selectedReport} onClose={() => onSelectReport(null)} />
      )}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '0.98rem' }}>Нэгдсэн feed</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', marginTop: '0.2rem' }}>
              {currentLocation ? 'Танд ойроос эхэлж эрэмбэлсэн.' : 'Шинэ report-уудаас эхэлж харуулж байна.'}
            </p>
          </div>
          {currentLocation && (
            <button
              type="button"
              className="glass-button"
              onClick={() => setNearbyOpen(true)}
              style={{ padding: '0.45rem 0.55rem', fontSize: '0.75rem' }}
            >
              <Bell size={14} /> Ойролцоо
            </button>
          )}
        </div>

        {feedReports.map(({ report, distanceMeters }) => (
          <button
            key={report.id}
            className="report-list-item"
            onClick={() => onSelectReport(report.id)}
            style={{
              textAlign: 'left',
              color: 'var(--text-main)',
              background: selectedReport?.id === report.id ? 'rgba(74, 222, 128, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: selectedReport?.id === report.id ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
              borderRadius: 8,
              padding: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'inherit',
              display: 'grid',
              gap: '0.45rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
              <strong style={{ fontSize: '0.9rem' }}>{report.category}</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                {distanceMeters !== undefined ? formatDistance(distanceMeters) : statusLabels[report.status]}
              </span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{report.district} • {report.locationText}</span>
            <span style={{ fontSize: '0.82rem', lineHeight: 1.45 }}>{report.description}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{statusLabels[report.status]} • {formatCreatedAt(report.createdAt)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

type ReportDetailProps = {
  report: CitizenReport
  onClose: () => void
}

const ReportDetail = ({ report, onClose }: ReportDetailProps) => (
  <article className="report-detail-card" style={{
    display: 'grid',
    gap: '0.8rem',
    padding: '0.9rem',
    borderRadius: 8,
    border: '1px solid rgba(74, 222, 128, 0.34)',
    background: 'rgba(74, 222, 128, 0.08)',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
      <div>
        <div style={{ color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700 }}>Дэлгэрэнгүй</div>
        <h3 style={{ marginTop: '0.2rem', fontSize: '1rem' }}>{report.category}</h3>
      </div>
      <button aria-label="Дэлгэрэнгүй хаах" onClick={onClose} style={{ border: 0, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
        <X size={17} />
      </button>
    </div>

    <p style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>{report.description}</p>

    {report.media.length > 0 && (
      <div style={{ display: 'grid', gap: '0.55rem' }}>
        {report.media.map(media => (
          <div key={`${media.fileName}-${media.url}`} style={{ overflow: 'hidden', borderRadius: 8, border: '1px solid var(--border-glass)', background: '#020617' }}>
            {media.type === 'image' ? (
              <img src={media.url} alt={media.fileName || 'Иргэний мэдээллийн зураг'} style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            ) : (
              <video src={media.url} controls style={{ width: '100%', maxHeight: 220, display: 'block' }} />
            )}
          </div>
        ))}
      </div>
    )}

    {report.media.length === 0 && (
      <div style={{
        minHeight: 82,
        borderRadius: 8,
        border: '1px dashed var(--border-glass)',
        display: 'grid',
        placeItems: 'center',
        color: 'var(--text-muted)',
        gap: '0.35rem',
      }}>
        <ImagePlus size={22} />
        <span style={{ fontSize: '0.78rem' }}>Зураг / бичлэг хавсаргаагүй</span>
      </div>
    )}

    <div style={{ display: 'grid', gap: '0.45rem', color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.45 }}>
      <span><MapPin size={13} style={{ verticalAlign: '-2px' }} /> {report.district} • {report.locationText}</span>
      <span>Координат: {report.coordinates.lat.toFixed(5)}, {report.coordinates.lng.toFixed(5)}</span>
      <span>Төлөв: {statusLabels[report.status]}</span>
      <span>Илгээсэн: {formatCreatedAt(report.createdAt)}</span>
      <span>Оруулсан: {report.createdBy}</span>
      {report.comments && <span><MessageSquare size={13} style={{ verticalAlign: '-2px' }} /> {report.comments}</span>}
    </div>
  </article>
)

export default CitizenReportPanel
