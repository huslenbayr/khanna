'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, LayoutGrid, Map } from 'lucide-react'
import MapComponent, { type MapHandle } from './MapComponent'
import Feed, { type FeedHandle } from './Feed'
import UploadModal from './UploadModal'
import { useAuth } from '@/lib/auth-context'

export default function DashboardShell() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [feedRefresh, setFeedRefresh] = useState(0)
  const [events, setEvents] = useState<Array<{ id: string; lat: number; lng: number; type?: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const mapRef = useRef<MapHandle>(null)
  const feedRef = useRef<FeedHandle>(null)
  const { user } = useAuth()
  const router = useRouter()

  // ==================== MOCK EVENTS DATA (replace with API call) ====================
  // TODO: Replace this with real API call when backend is ready
  const fetchEvents = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Mock event data with types for colored dots
    const mockEvents = [
      { id: 'evt_1', lat: 47.9014, lng: 106.9155, type: 'music' },   // Pink dot - Stadium area
      { id: 'evt_2', lat: 47.9001, lng: 106.9168, type: 'tech' },    // Blue dot - Center area
      { id: 'evt_3', lat: 47.89899, lng: 106.91762, type: 'art' },    // Purple dot - Height marker area
      { id: 'sports_1', lat: 47.9025, lng: 106.9145, type: 'sports' }, // Green dot - North area
      { id: 'food_1', lat: 47.8995, lng: 106.9180, type: 'food' },     // Orange dot - East area
      { id: 'workshop_1', lat: 47.9010, lng: 106.9130, type: 'workshop' } // Yellow dot - West area
    ]
    
    return mockEvents
  }

  // ==================== LOAD EVENTS ON MOUNT ====================
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true)
      try {
        const eventData = await fetchEvents()
        setEvents(eventData)
      } catch (error) {
        console.error('Failed to load events:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadEvents()
  }, [])

  // ==================== HANDLERS ====================
  const handleLocate = (lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng)
    feedRef.current?.close()
  }

  const handlePosted = () => {
    setFeedRefresh(n => n + 1)
    feedRef.current?.open()
  }

  const openUpload = () => {
    if (!user) { 
      router.push('/auth')
      return 
    }
    setUploadOpen(true)
  }

  // ==================== DEBUG FUNCTIONS (remove in production) ====================
  const refreshEvents = async () => {
    const freshEvents = await fetchEvents()
    setEvents(freshEvents)
    mapRef.current?.updateEvents(freshEvents)
    console.log('✅ Events refreshed:', freshEvents.length)
  }

  const clearEvents = () => {
    setEvents([])
    mapRef.current?.updateEvents([])
    console.log('🗑️ Events cleared')
  }

  // ==================== RENDER ====================
  return (
    <div className="dash">
      <div className="dash-map">
        <MapComponent 
          ref={mapRef} 
          events={events}
        />
      </div>

      <Feed 
        ref={feedRef} 
        onLocate={handleLocate} 
        refreshSignal={feedRefresh} 
      />

      {/* Desktop upload FAB */}
      <button className="upload-fab" onClick={openUpload}>
        <ImagePlus size={17} />
        Нийтлэх
      </button>

      {/* ==================== DEBUG PANEL (remove in production) ==================== */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '20px',
          zIndex: 9999,
          display: 'flex',
          gap: '8px',
          flexDirection: 'column',
          background: 'rgba(0,0,0,0.8)',
          padding: '12px',
          borderRadius: '12px',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>
            🧪 DEBUG ({events.length} events)
          </div>
          
          <button 
            onClick={refreshEvents}
            style={{
              background: '#3b82f6',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500
            }}
          >
            🔄 Refresh Events
          </button>
          
          <button 
            onClick={clearEvents}
            style={{
              background: '#ef4444',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 500
            }}
          >
            🗑️ Clear Events
          </button>
          
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
            Event types: 🎵 💻 🎨 ⚽ 🍜 🔧
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-btn" onClick={() => feedRef.current?.toggle()}>
          <LayoutGrid size={22} />
          <span>Feed</span>
        </button>

        <button className="nav-btn nav-upload" onClick={openUpload} aria-label="Нийтлэх">
          <ImagePlus size={22} />
        </button>

        <button className="nav-btn" onClick={() => feedRef.current?.close()}>
          <Map size={22} />
          <span>Газрын зураг</span>
        </button>
      </nav>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onPosted={handlePosted}
      />
    </div>
  )
}
