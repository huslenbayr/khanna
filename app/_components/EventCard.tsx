'use client'

import { useState, useEffect, useRef } from 'react'

// ==================== TYPES ====================

export interface EventData {
  id: string
  name: string
  dateTime: string
  description: string
  type?: 'music' | 'tech' | 'art' | 'sports' | 'food' | 'workshop' | 'default'
  location?: string
  organizer?: string
  lat?: number
  lng?: number
}

export type GetEventDataFunction = (eventId: string) => Promise<EventData>

interface EventCardProps {
  eventId: string
  x: number
  y: number
  onClose: () => void
  onThreeDotClick: (eventId: string) => void
  onGetMeThere?: (eventId: string, lat: number, lng: number, eventName: string) => void
  getEventData?: GetEventDataFunction
}

// ==================== COMPLETE MOCK DATABASE ====================

const getMockEventData = async (eventId: string): Promise<EventData> => {
  await new Promise(resolve => setTimeout(resolve, 200))

  const mockDatabase: Record<string, EventData> = {
    'evt_1': {
      id: 'evt_1',
      name: '🎵 Summer Music Festival',
      dateTime: '2026-07-15 | 18:00 - 23:00',
      description: 'Annual summer festival featuring local and international artists. Food trucks, live bands, and family activities.',
      type: 'music',
      location: 'National Sports Stadium',
      organizer: 'City Cultural Department',
      lat: 47.9014,
      lng: 106.9155
    },
    'evt_2': {
      id: 'evt_2',
      name: '💻 Tech Conference 2026',
      dateTime: '2026-08-20 | 09:00 - 18:00',
      description: 'Annual technology conference with workshops, networking sessions, and keynote speakers from leading companies.',
      type: 'tech',
      location: 'Convention Center',
      organizer: 'Tech Mongolia',
      lat: 47.9001,
      lng: 106.9168
    },
    'evt_3': {
      id: 'evt_3',
      name: '🎨 Contemporary Art Exhibition',
      dateTime: '2026-09-05 | 11:00 - 19:00',
      description: 'Contemporary art exhibition featuring local Mongolian artists. Paintings, sculptures, and digital art.',
      type: 'art',
      location: 'National Art Gallery',
      organizer: 'Art Council of Mongolia',
      lat: 47.89899,
      lng: 106.91762
    },
    'food_1': {
      id: 'food_1',
      name: '🍜 International Food Festival',
      dateTime: '2026-08-01 | 12:00 - 22:00',
      description: 'Taste cuisines from 20+ countries. Cooking demonstrations, live music, and family activities. Free entry!',
      type: 'food',
      location: 'Exhibition Grounds',
      organizer: 'Culinary Association of Mongolia',
      lat: 47.9025,
      lng: 106.9145
    },
    'sports_1': {
      id: 'sports_1',
      name: '🏃 City Marathon 2026',
      dateTime: '2026-09-20 | 08:00 - 14:00',
      description: 'Annual city marathon. Run 5k, 10k, or full marathon. Medals for all finishers. Register by September 1st.',
      type: 'sports',
      location: 'City Center Start Line',
      organizer: 'Sports Federation of Mongolia',
      lat: 47.9020,
      lng: 106.9130
    },
    'workshop_1': {
      id: 'workshop_1',
      name: '📈 Digital Marketing Workshop',
      dateTime: '2026-07-28 | 10:00 - 16:00',
      description: 'Learn SEO, social media marketing, content strategy, and Google Analytics. Certificate included. Limited seats!',
      type: 'workshop',
      location: 'Business Center, Room 301',
      organizer: 'Digital Marketing Pros',
      lat: 47.9005,
      lng: 106.9190
    },
    'music_1': {
      id: 'music_1',
      name: '🎸 Jazz Night',
      dateTime: '2026-08-05 | 20:00 - 23:00',
      description: 'Smooth jazz evening with local quartet. Wine and cheese available.',
      type: 'music',
      location: 'Downtown Jazz Club',
      organizer: 'Jazz Association',
      lat: 47.9030,
      lng: 106.9100
    },
    'tech_1': {
      id: 'tech_1',
      name: '🤖 AI Workshop',
      dateTime: '2026-07-25 | 14:00 - 17:00',
      description: 'Hands-on workshop on machine learning and AI applications. Bring your laptop.',
      type: 'tech',
      location: 'Innovation Hub',
      organizer: 'AI Lab Mongolia',
      lat: 47.8995,
      lng: 106.9200
    },
    'art_1': {
      id: 'art_1',
      name: '📸 Photography Expo',
      dateTime: '2026-07-30 | 10:00 - 18:00',
      description: 'Annual photography exhibition featuring landscape and portrait works by local artists.',
      type: 'art',
      location: 'Photo Gallery',
      organizer: 'Photographers Union',
      lat: 47.9010,
      lng: 106.9120
    }
  }

  const result = mockDatabase[eventId]
  if (result) return result
  
  const typeFromId = eventId.split('_')[0]
  const typeMap: Record<string, { type: string; icon: string; defaultName: string }> = {
    food: { type: 'food', icon: '🍜', defaultName: 'Food Event' },
    sports: { type: 'sports', icon: '🏃', defaultName: 'Sports Event' },
    workshop: { type: 'workshop', icon: '📈', defaultName: 'Workshop' },
    music: { type: 'music', icon: '🎵', defaultName: 'Music Event' },
    tech: { type: 'tech', icon: '💻', defaultName: 'Tech Event' },
    art: { type: 'art', icon: '🎨', defaultName: 'Art Event' },
    evt: { type: 'default', icon: '📌', defaultName: 'Event' }
  }
  
  const info = typeMap[typeFromId] || typeMap['evt']
  return {
    id: eventId,
    name: `${info.icon} ${info.defaultName} ${eventId.split('_')[1] || ''}`,
    dateTime: 'Date TBD - Check back soon',
    description: `This is a ${info.type} event. More details will be announced. Stay tuned for updates!`,
    type: info.type as any,
    location: 'Venue to be announced',
    organizer: 'Organizer to be announced',
    lat: 47.9014,
    lng: 106.9155
  }
}

const defaultGetEventData: GetEventDataFunction = async (eventId: string) => {
  return getMockEventData(eventId)
}

export default function EventCard({ 
  eventId, 
  x, 
  y, 
  onClose, 
  onThreeDotClick,
  onGetMeThere,
  getEventData = defaultGetEventData
}: EventCardProps) {
  const [data, setData] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)
    
    getEventData(eventId)
      .then(fetchedData => {
        if (mounted) {
          setData(fetchedData)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setError('Failed to load event details')
          setLoading(false)
        }
      })
    
    return () => { mounted = false }
  }, [eventId, getEventData])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const cardX = x - 150
  const cardY = y - 120

  const getTypeColor = (type?: string): string => {
    const colors: Record<string, string> = {
      music: '#f43f5e',
      tech: '#3b82f6',
      art: '#a855f7',
      sports: '#22c55e',
      food: '#f97316',
      workshop: '#eab308',
      default: '#6b7280'
    }
    return colors[type || 'default'] || colors.default
  }

  const handleGetMeThere = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data && onGetMeThere && data.lat && data.lng) {
      onGetMeThere(eventId, data.lat, data.lng, data.name)
    }
  }

  if (loading) {
    return (
      <div className="fixed z-50 bg-[#0a0c14] rounded-lg shadow-xl border border-white/10 p-4" style={{ left: cardX, top: cardY, width: '300px' }}>
        <div className="flex flex-col items-center justify-center h-32 gap-2">
          <div className="animate-pulse text-slate-400 text-sm">Loading event details...</div>
        </div>
      </div>
    )
  }

  if (error || !data) return null

  const accentColor = getTypeColor(data.type)

  return (
    <div
      ref={cardRef}
      className="fixed z-50 bg-[#0a0c14] rounded-lg shadow-xl border overflow-hidden transition-all duration-200"
      style={{
        left: cardX,
        top: isExpanded ? cardY : cardY + 60,
        width: '300px',
        borderColor: accentColor,
        cursor: 'pointer'
      }}
    >
      <div onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? (
          <div>
            <div className="h-1" style={{ backgroundColor: accentColor }} />
            <div className="flex items-center justify-between p-3 bg-white/5">
              <h3 className="font-semibold text-white text-sm truncate flex-1">{data.name}</h3>
              <button 
                onClick={(e) => { e.stopPropagation(); onThreeDotClick(eventId); }} 
                className="text-slate-400 hover:text-white px-2 py-1 rounded text-lg font-bold"
              >
                ⋮
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs" style={{ color: accentColor }}>
                <span>📅</span><span>{data.dateTime}</span>
              </div>
              {data.location && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>📍</span><span>{data.location}</span>
                </div>
              )}
              <div className="text-sm text-slate-300 mt-2 leading-relaxed">{data.description}</div>
              {data.organizer && (
                <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-white/5">
                  Organized by: {data.organizer}
                </div>
              )}
              
              {/* ==================== GET ME THERE BUTTON ==================== */}
              {onGetMeThere && data.lat && data.lng && (
                <button
                  onClick={handleGetMeThere}
                  className="w-full mt-3 py-2 rounded-md text-xs flex items-center justify-center gap-2 transition-all hover:opacity-80"
                  style={{ 
                    background: '#22c55e20', 
                    color: '#22c55e', 
                    border: '1px solid #22c55e40'
                  }}
                >
                  <span>🚗</span>
                  <span>Get Me There</span>
                </button>
              )}
            </div>
            <div className="text-center text-xs text-slate-600 pb-2">Tap to collapse</div>
          </div>
        ) : (
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${accentColor}20` }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                <span className="text-xs text-white truncate max-w-[200px]">{data.name}</span>
              </div>
              <span className="text-cyan-400 text-xs">▼</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
