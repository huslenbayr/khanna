'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, LayoutGrid, Search } from 'lucide-react'
import MapComponent, { type MapHandle } from './MapComponent'
import Feed, { type FeedHandle } from './Feed'
import UploadModal from './UploadModal'
import type { Post } from './PostCard'
import TeamTracker from './TeamTracker'
import SocialDashboard from './SocialDashboard'
import { useAuth } from '@/lib/auth-context'
import type { CitizenReport } from '../_types/citizenReport'
import type { CommunityMember } from '../_types/community'
import type { ReportCoordinates } from '../_types/citizenReport'
import { fetchReportsForSegment, convertRoadReportsToPosts } from '@/lib/road-api'

export default function DashboardShell() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [feedRefresh, setFeedRefresh] = useState(0)
  const [activeOverlay, setActiveOverlay] = useState<string | null>(null)
  const [feedDesktopOpen, setFeedDesktopOpen] = useState(false)
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null)

  const [reports, setReports] = useState<CitizenReport[]>([])
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [members, setMembers] = useState<CommunityMember[]>([])
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [currentLocation, setCurrentLocation] = useState<ReportCoordinates | null>(null)
  const [mapPosts, setMapPosts] = useState<Post[]>([])
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [longPressLocation, setLongPressLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [overridePosts, setOverridePosts] = useState<Post[] | null>(null)
  const [overrideTitle, setOverrideTitle] = useState<string | null>(null)

  const mapRef = useRef<MapHandle>(null)
  const feedRef = useRef<FeedHandle>(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleToggleHome = () => setActiveOverlay(prev => prev === 'home' ? null : 'home')
    const handleToggleCitizen = () => setActiveOverlay(prev => prev === 'citizen' ? null : 'citizen')
    const handleToggleFeed = () => feedRef.current?.toggle()
    const handleUpdateLocation = (e: Event) => {
      const { lat, lng } = (e as CustomEvent).detail as { lat: number; lng: number }
      setCurrentLocation({ lat, lng })
      mapRef.current?.flyTo(lat, lng)
    }

    window.addEventListener('toggle-home', handleToggleHome)
    window.addEventListener('toggle-citizen', handleToggleCitizen)
    window.addEventListener('toggle-feed', handleToggleFeed)
    window.addEventListener('update-location', handleUpdateLocation)

    return () => {
      window.removeEventListener('toggle-home', handleToggleHome)
      window.removeEventListener('toggle-citizen', handleToggleCitizen)
      window.removeEventListener('toggle-feed', handleToggleFeed)
      window.removeEventListener('update-location', handleUpdateLocation)
    }
  }, [])

  useEffect(() => {
    fetch('/api/posts')
      .then(r => r.json())
      .then((d: Post[]) => setMapPosts(Array.isArray(d) ? d : []))
      .catch(() => setMapPosts([]))
  }, [feedRefresh])

  const handleLocate = (lat: number, lng: number) => {
    mapRef.current?.flyTo(lat, lng)
    feedRef.current?.close()
  }

  const handlePostSelect = (id: string) => {
    setOverridePosts(null)
    setOverrideTitle(null)
    setSelectedPostId(id)
    feedRef.current?.open()
  }

  const handleDeleted = () => {
    setFeedRefresh(n => n + 1)
  }

  const handlePosted = (lat?: number, lng?: number) => {
    setFeedRefresh(n => n + 1)
    if (lat && lng) mapRef.current?.flyTo(lat, lng)
    feedRef.current?.open()
  }

  const handleLongPress = (lat: number, lng: number) => {
    if (!user) { router.push('/auth'); return }
    setLongPressLocation({ lat, lng })
    setUploadOpen(true)
  }

  const handleGetMeThere = (postId: string, lat: number, lng: number) => {
    if (activeRouteId === postId) {
      mapRef.current?.clearRoute()
      setActiveRouteId(null)
    } else {
      feedRef.current?.close()
      setActiveRouteId(postId)
      mapRef.current?.calculateRoute(lat, lng)
    }
  }

  const handleRoadSelect = async (roadId: string, roadName: string, lat: number, lng: number) => {
    try {
      const data = await fetchReportsForSegment(roadId, lat, lng, roadName)
      const converted = convertRoadReportsToPosts(data.reports, lat, lng, roadName)
      setOverridePosts(converted)
      setOverrideTitle(roadName ? `${roadName} - Мэдээлэл` : 'Замын мэдээлэл')
      feedRef.current?.open()
    } catch (err) {
      console.error(err)
    }
  }

  const openUpload = () => {
    if (!user) { router.push('/auth'); return }
    setLongPressLocation(null)
    setUploadOpen(true)
  }

  const selectedReport = reports.find(r => r.id === selectedReportId) || null

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
          feedDesktopOpen={feedDesktopOpen}
          mapPosts={mapPosts}
          onLongPress={handleLongPress}
          onPostSelect={handlePostSelect}
          onRoadSelect={handleRoadSelect}
        />
      </div>

      <Feed 
        ref={feedRef} 
        onLocate={handleLocate} 
        refreshSignal={feedRefresh} 
        onDesktopOpenChange={setFeedDesktopOpen}
        selectedPostId={selectedPostId}
        onClearSelection={() => {
          setSelectedPostId(null)
          setOverridePosts(null)
          setOverrideTitle(null)
        }}
        onDeletePost={handleDeleted}
        onGetMeThere={handleGetMeThere}
        activeRouteId={activeRouteId}
        overridePosts={overridePosts}
        overrideTitle={overrideTitle}
      />

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
          onAddReport={r => setReports(prev => [r, ...prev])}
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
        <button className="nav-btn" onClick={() => router.push('/search')} aria-label="Хайх">
          <Search size={22} />
          <span>Хайх</span>
        </button>
        <button className="nav-btn nav-upload" onClick={openUpload} aria-label="Нийтлэх">
          <ImagePlus size={22} />
        </button>
        <button className="nav-btn" onClick={() => feedRef.current?.toggle()} aria-label="Feed">
          <LayoutGrid size={22} />
          <span>Feed</span>
        </button>
      </nav>

      <UploadModal
        key={longPressLocation ? `${longPressLocation.lat},${longPressLocation.lng}` : 'default'}
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); mapRef.current?.clearSelection() }}
        onPosted={handlePosted}
        defaultLat={longPressLocation?.lat}
        defaultLng={longPressLocation?.lng}
      />
    </div>
  )
}
