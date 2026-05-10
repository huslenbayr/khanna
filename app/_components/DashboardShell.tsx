'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, LayoutGrid, Map, User, LogOut, Info } from 'lucide-react'
import MapComponent, { type MapHandle } from './MapComponent'
import Feed, { type FeedHandle } from './Feed'
import UploadModal from './UploadModal'
import CityInfo from './CityInfo'
import TeamTracker from './TeamTracker'
import SocialDashboard from './SocialDashboard'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/client'
import type { CitizenReport } from '../_types/citizenReport'
import type { CommunityMember } from '../_types/community'

export default function DashboardShell() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [feedRefresh, setFeedRefresh] = useState(0)
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null)
  
  // States for the new features
  const [reports, setReports] = useState<CitizenReport[]>([])
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [currentLocation, setCurrentLocation] = useState<import('../_types/citizenReport').ReportCoordinates | null>(null)

  const mapRef = useRef<MapHandle>(null)
  const feedRef = useRef<FeedHandle>(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleToggleCity = () => setActiveOverlay(prev => prev === 'city' ? null : 'city')
    const handleToggleHome = () => setActiveOverlay(prev => prev === 'home' ? null : 'home')
    const handleToggleCitizen = () => setActiveOverlay(prev => prev === 'citizen' ? null : 'citizen')
    const handleToggleFeed = () => feedRef.current?.toggle()
    
    const handleUpdateLocation = (e: any) => {
      const { lat, lng } = e.detail
      setCurrentLocation({ lat, lng })
      mapRef.current?.flyTo(lat, lng)
    }

    window.addEventListener('toggle-city', handleToggleCity)
    window.addEventListener('toggle-home', handleToggleHome)
    window.addEventListener('toggle-citizen', handleToggleCitizen)
    window.addEventListener('toggle-feed', handleToggleFeed)
    window.addEventListener('update-location', handleUpdateLocation)

    return () => {
      window.removeEventListener('toggle-city', handleToggleCity)
      window.removeEventListener('toggle-home', handleToggleHome)
      window.removeEventListener('toggle-citizen', handleToggleCitizen)
      window.removeEventListener('toggle-feed', handleToggleFeed)
      window.removeEventListener('update-location', handleUpdateLocation)
    }
  }, [])

  const handleLocate = (lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng)
    feedRef.current?.close()
  }

  const handlePosted = () => {
    setFeedRefresh(n => n + 1)
    feedRef.current?.open()
  }

  const openUpload = () => {
    if (!user) { router.push('/auth'); return }
    setUploadOpen(true)
  }

  const selectedReport = reports.find(r => r.id === selectedReportId) || null

  // ==================== MOCK EVENTS WITH MATCHING COORDINATES ====================
  // These coordinates MUST match the ones in EventCard.tsx for routes to work correctly
  const mockEvents = [
    { id: 'evt_1', lat: 47.9014, lng: 106.9155, type: 'music' },    // National Sports Stadium
    { id: 'evt_2', lat: 47.9001, lng: 106.9168, type: 'tech' },     // Convention Center (near)
    { id: 'evt_3', lat: 47.89899, lng: 106.91762, type: 'art' },     // Art Gallery (near height marker)
    { id: 'food_1', lat: 47.9025, lng: 106.9145, type: 'food' },      // Food Festival location
    { id: 'sports_1', lat: 47.9020, lng: 106.9130, type: 'sports' },  // Sports event location
  ]

  return (
    <div className="dashboard-shell h-screen overflow-hidden relative">
      <div className="absolute inset-0 z-0">
        <MapComponent
          ref={mapRef}
          reports={reports}
          selectedReportId={selectedReportId}
          onReportSelect={setSelectedReportId}
          communityMembers={members}
          selectedCommunityMemberId={selectedMemberId}
          onCommunityMemberSelect={setSelectedMemberId}
          currentLocation={currentLocation}
          events={mockEvents}
        />
      </div>

      <Feed ref={feedRef} onLocate={handleLocate} refreshSignal={feedRefresh} />

      {/* Overlays from the Header / Navigation */}
      {activeOverlay === 'city' && <CityInfo />}
      {activeOverlay === 'home' && (
        <TeamTracker 
          members={members} 
          selectedMemberId={selectedMemberId}
          onMembersChange={setMembers}
          onSelectMember={setSelectedMemberId}
        />
      )}
      {activeOverlay === 'citizen' && (
        <SocialDashboard 
          reports={reports}
          currentLocation={currentLocation}
          selectedReport={selectedReport}
          createdBy={user?.email || 'Guest'}
          onCurrentLocationChange={setCurrentLocation} 
          onAddReport={(r) => setReports(prev => [r, ...prev])}
          onSelectReport={setSelectedReportId}
        />
      )}

      {/* Desktop upload FAB */}
      <button className="upload-fab" onClick={openUpload}>
        <ImagePlus size={17} />
        Нийтлэх
      </button>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        <button className="nav-btn nav-upload" onClick={openUpload} aria-label="Нийтлэх">
          <ImagePlus size={22} />
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
