// TrafficCard.tsx
'use client'

import { useState, useEffect, useRef } from 'react'

// ==================== TYPES ====================

export interface TrafficData {
  id: string
  roadName: string
  congestion: 'heavy' | 'medium' | 'light' | 'empty'
  lengthMeters: number
  delayMinutes: number
  durationMinutes: number
  timestamp: number
}

interface TrafficCardProps {
  trafficData: TrafficData
  x: number
  y: number
  onClose: () => void
  onNavigate?: (trafficId: string) => void
}

// ==================== CONGESTION CONFIGURATION ====================

const congestionConfig = {
  heavy: {
    label: 'Хүнд хөдөлгөөн',
    labelEn: 'Heavy Traffic',
    color: '#22ff88',      // Bright neon green
    glowIntensity: '0.95',
    icon: '🔴',
    barHeight: '12px'
  },
  medium: {
    label: 'Дунд зэргийн хөдөлгөөн',
    labelEn: 'Medium Traffic',
    color: '#16a34a',      // Medium green
    glowIntensity: '0.7',
    icon: '🟡',
    barHeight: '8px'
  },
  light: {
    label: 'Хөнгөн хөдөлгөөн',
    labelEn: 'Light Traffic',
    color: '#4ade80',      // Faded green
    glowIntensity: '0.4',
    icon: '🟢',
    barHeight: '4px'
  },
  empty: {
    label: 'Чөлөөтэй зам',
    labelEn: 'Free Flow',
    color: '#1a3a2a',      // Dark green (barely visible)
    glowIntensity: '0.15',
    icon: '⚫',
    barHeight: '2px'
  }
}

// ==================== HELPER FUNCTIONS ====================

const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} км`
  }
  return `${meters} м`
}

const formatDuration = (minutes: number): string => {
  if (minutes < 1) return '<1 мин'
  if (minutes === 1) return '1 мин'
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} ц ${mins} мин` : `${hours} ц`
}

const getCongestionLevel = (congestion: TrafficData['congestion']) => {
  return congestionConfig[congestion]
}

// ==================== COMPONENT ====================

export default function TrafficCard({ 
  trafficData, 
  x, 
  y, 
  onClose,
  onNavigate
}: TrafficCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isGlowing, setIsGlowing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  
  const config = getCongestionLevel(trafficData.congestion)
  
  // Pulsing glow effect for heavy traffic
  useEffect(() => {
    if (trafficData.congestion === 'heavy') {
      const interval = setInterval(() => {
        setIsGlowing(prev => !prev)
      }, 800)
      return () => clearInterval(interval)
    }
  }, [trafficData.congestion])
  
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
  
  const handleNavigate = () => {
    if (onNavigate) {
      onNavigate(trafficData.id)
    }
    onClose()
  }
  
  // Calculate position (centered above clicked point)
  const cardX = x - 160  // Center 320px wide card
  const cardY = y - 140  // Position above click
  
  // Get time ago string
  const timeAgo = () => {
    const seconds = Math.floor((Date.now() - trafficData.timestamp) / 1000)
    if (seconds < 60) return 'Саяхан'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин өмнө`
    return `${Math.floor(seconds / 3600)} ц өмнө`
  }
  
  // Collapsed view (bar only)
  if (!isExpanded) {
    return (
      <div
        ref={cardRef}
        className="fixed z-50 rounded-lg shadow-xl overflow-hidden transition-all duration-200 cursor-pointer"
        style={{
          left: cardX,
          top: cardY + 50,
          width: '280px',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          borderLeft: `4px solid ${config.color}`,
          backdropFilter: 'blur(8px)'
        }}
        onClick={toggleCard}
      >
        <div className="p-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: config.color,
                boxShadow: trafficData.congestion === 'heavy' && isGlowing 
                  ? `0 0 12px ${config.color}` 
                  : 'none'
              }}
            />
            <span className="text-xs text-white truncate max-w-[180px]">
              {trafficData.roadName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: config.color }}>
              {config.label}
            </span>
            <span className="text-cyan-400 text-xs">▼</span>
          </div>
        </div>
      </div>
    )
  }
  
  // Expanded view
  return (
    <div
      ref={cardRef}
      className="fixed z-50 rounded-lg shadow-2xl overflow-hidden transition-all duration-200"
      style={{
        left: cardX,
        top: cardY,
        width: '320px',
        backgroundColor: '#0f172a',
        border: `1px solid ${config.color}`,
        boxShadow: trafficData.congestion === 'heavy' && isGlowing
          ? `0 0 24px ${config.color}, 0 0 48px rgba(34, 255, 136, 0.3)`
          : `0 0 12px ${config.color}40`
      }}
    >
      {/* Header with gradient accent */}
      <div 
        className="h-1.5"
        style={{ 
          background: `linear-gradient(90deg, ${config.color}, ${config.color}40, transparent)`,
          boxShadow: trafficData.congestion === 'heavy' ? `0 0 8px ${config.color}` : 'none'
        }}
      />
      
      {/* Main content - click toggles collapse */}
      <div onClick={toggleCard} className="cursor-pointer">
        {/* Header info */}
        <div className="p-3 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{config.icon}</span>
              <h3 className="font-bold text-white text-sm">
                {trafficData.roadName}
              </h3>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              className="text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none"
              style={{ fontSize: '20px' }}
            >
              ×
            </button>
          </div>
          
          {/* Congestion badge */}
          <div className="mt-2 inline-block">
            <span 
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${config.color}20`,
                color: config.color,
                border: `1px solid ${config.color}40`
              }}
            >
              {config.label}
            </span>
          </div>
        </div>
        
        {/* Traffic visualization bar */}
        <div className="px-3 py-2">
          <div 
            className="rounded-full transition-all duration-300"
            style={{ 
              height: config.barHeight,
              width: '100%',
              backgroundColor: `${config.color}30`,
              boxShadow: trafficData.congestion === 'heavy' && isGlowing 
                ? `0 0 12px ${config.color}` 
                : 'none'
            }}
          >
            <div 
              className="rounded-full"
              style={{ 
                height: '100%',
                width: trafficData.congestion === 'heavy' ? '100%' : 
                       trafficData.congestion === 'medium' ? '60%' : '30%',
                backgroundColor: config.color,
                boxShadow: `0 0 8px ${config.color}`
              }}
            />
          </div>
        </div>
        
        {/* Stats grid */}
        <div className="px-3 py-2 grid grid-cols-3 gap-2">
          <div className="text-center">
            <div className="text-xs text-slate-500">Зай</div>
            <div className="text-sm text-white font-medium">
              {formatDistance(trafficData.lengthMeters)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Хугацаа</div>
            <div className="text-sm text-white font-medium">
              {formatDuration(trafficData.durationMinutes)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-500">Хоцролт</div>
            <div className="text-sm text-white font-medium">
              {trafficData.delayMinutes > 0 ? `+${formatDuration(trafficData.delayMinutes)}` : '0 мин'}
            </div>
          </div>
        </div>
        
        {/* Speed indicator (optional) */}
        <div className="px-3 pb-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>🚗 Хөдөлгөөний хурд</span>
            <span style={{ color: config.color }}>
              {trafficData.congestion === 'heavy' && '~10-20 км/ц'}
              {trafficData.congestion === 'medium' && '~30-50 км/ц'}
              {trafficData.congestion === 'light' && '~50-70 км/ц'}
              {trafficData.congestion === 'empty' && '>70 км/ц'}
            </span>
          </div>
        </div>
        
        {/* Timestamp */}
        <div className="px-3 pb-2">
          <div className="text-xs text-slate-600 text-right">
            Шинэчлэгдсэн: {timeAgo()}
          </div>
        </div>
        
        {/* Action buttons (optional) */}
        {onNavigate && (
          <div className="p-3 pt-0 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleNavigate()
              }}
              className="flex-1 text-xs py-1.5 rounded-md transition-all"
              style={{ 
                backgroundColor: `${config.color}15`,
                color: config.color,
                border: `1px solid ${config.color}30`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${config.color}25`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${config.color}15`
              }}
            >
              🗺️ Замын дэлгэрэнгүй
            </button>
          </div>
        )}
        
        {/* Collapse hint */}
        <div 
          className="text-center text-xs py-1.5 border-t border-slate-800"
          style={{ color: '#475569' }}
        >
          Товшиж буулгах
        </div>
      </div>
    </div>
  )
}
