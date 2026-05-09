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
    const handleUpdateLocation = (e: any) => {
      const { lat, lng } = e.detail
      setCurrentLocation({ lat, lng })
      mapRef.current?.flyTo(lat, lng)
    }

    window.addEventListener('toggle-city', handleToggleCity)
    window.addEventListener('toggle-home', handleToggleHome)
    window.addEventListener('toggle-citizen', handleToggleCitizen)
    window.addEventListener('update-location', handleUpdateLocation)

    return () => {
      window.removeEventListener('toggle-city', handleToggleCity)
      window.removeEventListener('toggle-home', handleToggleHome)
      window.removeEventListener('toggle-citizen', handleToggleCitizen)
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

  return (
    <div className="dash">
      <div className="dash-map">
        <MapComponent 
          ref={mapRef} 
          reports={reports}
          selectedReportId={selectedReportId}
          onReportSelect={setSelectedReportId}
          communityMembers={members}
          selectedCommunityMemberId={selectedMemberId}
          onCommunityMemberSelect={setSelectedMemberId}
          currentLocation={currentLocation}
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
        <button className="nav-btn" onClick={() => feedRef.current?.toggle()}>
          <LayoutGrid size={22} />
          <span>Feed</span>
        </button>

        <button className="nav-btn nav-upload" onClick={openUpload} aria-label="Нийтлэх">
          <ImagePlus size={22} />
        </button>

        {user ? (
          <button className="nav-btn" onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
          }}>
            <LogOut size={22} />
            <span>Гарах</span>
          </button>
        ) : (
          <button className="nav-btn" onClick={() => router.push('/auth')}>
            <User size={22} />
            <span>Нэвтрэх</span>
          </button>
        )}
      </nav>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onPosted={handlePosted}
      />
    </div>
  )
}
