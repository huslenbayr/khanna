'use client'

import { useState, useEffect, useRef } from 'react'

// ==================== TYPES ====================

export interface RoadReport {
  id: string
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  type: 'accident' | 'roadwork' | 'hazard' | 'other'
  timestamp: Date
  reportedBy?: string
  lat?: number
  lng?: number
}

export interface RoadSegmentData {
  segmentId: string
  roadName: string
  coordinates: [number, number][]
  lengthMeters: number
  reports: RoadReport[]
  lat?: number
  lng?: number
}

interface RoadSegmentCardProps {
  segmentId: string
  roadName: string
  x: number
  y: number
  lat?: number
  lng?: number
  onClose: () => void
  onThreeDotClick: (segmentId: string, lat?: number, lng?: number) => void
  fetchReportData: (segmentId: string, lat: number, lng: number, roadName: string) => Promise<RoadSegmentData>
}

// ==================== HELPER FUNCTIONS ====================

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} км`
  }
  return `${meters} м`
}

// Severity color mapping
const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'high': return '#ef4444'
    case 'medium': return '#f59e0b'
    case 'low': return '#22c55e'
    default: return '#6b7280'
  }
}

// Severity label
const getSeverityLabel = (severity: string): string => {
  switch (severity) {
    case 'high': return 'Хүнд'
    case 'medium': return 'Дунд'
    case 'low': return 'Хөнгөн'
    default: return 'Тодорхойгүй'
  }
}

// Report type icon
const getReportIcon = (type: string): string => {
  switch (type) {
    case 'accident': return '🚗💥'
    case 'roadwork': return '🚧'
    case 'hazard': return '⚠️'
    default: return '📋'
  }
}

// Report type label
const getReportTypeLabel = (type: string): string => {
  switch (type) {
    case 'accident': return 'Осол'
    case 'roadwork': return 'Зам засвар'
    case 'hazard': return 'Аюул'
    default: return 'Мэдээлэл'
  }
}

// Format time ago
const getTimeAgo = (date: Date): string => {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'Саяхан'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин өмнө`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ц өмнө`
  return `${Math.floor(seconds / 86400)} өдрийн өмнө`
}

// ==================== COMPONENT ====================

export default function RoadSegmentCard({
  segmentId,
  roadName,
  x,
  y,
  lat,
  lng,
  onClose,
  onThreeDotClick,
  fetchReportData
}: RoadSegmentCardProps) {
  const [data, setData] = useState<RoadSegmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)

  // Fetch report data
  useEffect(() => {
    let mounted = true
    
    setLoading(true)
    fetchReportData(segmentId, lat || 0, lng || 0, roadName)
      .then(fetchedData => {
        if (mounted) {
          setData(fetchedData)
          setLoading(false)
        }
      })
      .catch(error => {
        console.error('Failed to fetch road data:', error)
        if (mounted) {
          setLoading(false)
        }
      })
    
    return () => { mounted = false }
  }, [segmentId, lat, lng, roadName, fetchReportData])

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const toggleCard = () => {
    setIsExpanded(!isExpanded)
  }

  const handleThreeDotClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onThreeDotClick(segmentId, lat, lng)
  }

  // Calculate position (centered above click)
  const cardX = x - 160
  const cardY = y - 140

  // Loading state
  if (loading) {
    return (
      <div
        className="fixed z-50 bg-[#0a0c14] rounded-lg shadow-xl border border-white/10 p-4"
        style={{
          left: cardX,
          top: cardY,
          width: '320px'
        }}
      >
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <div className="animate-pulse text-slate-400 text-sm">Замын мэдээлэл уншиж байна...</div>
        </div>
      </div>
    )
  }

  if (!data) return null

  // Collapsed view
  if (!isExpanded) {
    const reportCount = data.reports.length
    const hasIssues = reportCount > 0
    const indicatorColor = hasIssues ? '#ef4444' : '#22c55e'
    const indicatorText = hasIssues ? `${reportCount} асуудал` : 'Чөлөөтэй'
    
    return (
      <div
        ref={cardRef}
        className="fixed z-50 rounded-lg shadow-xl overflow-hidden transition-all duration-200 cursor-pointer"
        style={{
          left: cardX,
          top: cardY + 50,
          width: '280px',
          backgroundColor: 'rgba(10, 12, 20, 0.95)',
          borderLeft: `3px solid ${indicatorColor}`,
          backdropFilter: 'blur(8px)'
        }}
        onClick={toggleCard}
      >
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: indicatorColor }}
            />
            <span className="text-xs text-white truncate max-w-[180px]">
              {data.roadName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: indicatorColor }}>
              {indicatorText}
            </span>
            <span className="text-cyan-400 text-xs">▼</span>
          </div>
        </div>
      </div>
    )
  }

  // Expanded view
  const hasReports = data.reports.length > 0

  return (
    <div
      ref={cardRef}
      className="fixed z-50 rounded-lg shadow-2xl overflow-hidden transition-all duration-200"
      style={{
        left: cardX,
        top: cardY,
        width: '340px',
        backgroundColor: '#0a0c14',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        boxShadow: '0 0 16px rgba(34, 197, 94, 0.15)'
      }}
    >
      {/* Header with green accent */}
      <div className="h-0.5 bg-gradient-to-r from-green-500 to-green-500/20" />
      
      <div onClick={toggleCard} className="cursor-pointer">
        {/* Title bar with 3-dot menu */}
        <div className="flex items-center justify-between p-3 bg-white/5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛣️</span>
            <h3 className="font-medium text-white text-sm truncate max-w-[200px]">
              {data.roadName}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">
              {formatDistance(data.lengthMeters)}
            </span>
            <button
              onClick={handleThreeDotClick}
              className="text-slate-500 hover:text-white transition-colors px-2 py-1 rounded text-lg font-bold"
              style={{ fontSize: '18px' }}
            >
              ⋮
            </button>
          </div>
        </div>
        
        {/* Reports section */}
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-400">📋 Замын мэдээлэл</span>
            <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
              {data.reports.length} тайлан
            </span>
          </div>
          
          {!hasReports ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-sm text-slate-400">Тайлан байхгүй байна</div>
              <div className="text-xs text-slate-500 mt-1">Энэ хэсэгт гомдол, мэдээлэл байхгүй</div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.reports.slice(0, 3).map((report) => (
                <div 
                  key={report.id}
                  className="p-2.5 rounded-lg bg-white/5 border-l-2 transition-all"
                  style={{ borderLeftColor: getSeverityColor(report.severity) }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{getReportIcon(report.type)}</span>
                      <span className="text-sm font-medium text-white">{report.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5" style={{ color: getSeverityColor(report.severity) }}>
                        {getSeverityLabel(report.severity)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-2 leading-relaxed pl-7">{report.description}</p>
                  <div className="flex items-center justify-between text-xs pl-7">
                    <span className="text-slate-500">
                      {getReportTypeLabel(report.type)} · {getTimeAgo(report.timestamp)}
                    </span>
                    {report.reportedBy && (
                      <span className="text-slate-600">📢 {report.reportedBy}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {data.reports.length > 3 && (
            <div className="text-center text-xs text-slate-500 mt-3 pt-1">
              + {data.reports.length - 3} нэмэлт тайлан
            </div>
          )}
        </div>
        
        {/* Footer hint */}
        <div className="text-center text-[10px] py-2 border-t border-white/5 text-slate-600">
          Товшиж буулгах · ⋮ дэлгэрэнгүй
        </div>
      </div>
    </div>
  )
}
