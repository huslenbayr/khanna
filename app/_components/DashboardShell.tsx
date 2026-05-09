'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus, LayoutGrid, Map, User } from 'lucide-react'
import MapComponent, { type MapHandle } from './MapComponent'
import Feed, { type FeedHandle } from './Feed'
import UploadModal from './UploadModal'
import { useAuth } from '@/lib/auth-context'

export default function DashboardShell() {
  const [uploadOpen, setUploadOpen] = useState(false)
  const [feedRefresh, setFeedRefresh] = useState(0)
  const mapRef = useRef<MapHandle>(null)
  const feedRef = useRef<FeedHandle>(null)
  const { user, avatarUrl } = useAuth()
  const router = useRouter()

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

  return (
    <div className="dash">
      <div className="dash-map">
        <MapComponent ref={mapRef} />
      </div>

      <Feed ref={feedRef} onLocate={handleLocate} refreshSignal={feedRefresh} />

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

        <button className="nav-btn" onClick={() => feedRef.current?.close()}>
          <Map size={22} />
          <span>Газрын зураг</span>
        </button>

        <button className="nav-btn" onClick={() => router.push(user ? `/profile/${user.id}` : '/auth')}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="rounded-full object-cover" style={{ width: 26, height: 26 }} />
          ) : (
            <User size={22} />
          )}
          <span>Профайл</span>
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
