'use client'

import { useCallback, useState } from 'react'
import MapComponent from './MapComponent'
import ReportDashboard from './ReportDashboard'
import CommunityHomePanel from './TeamTracker'
import CitizenReportPanel from './SocialFeed'
import CityInfo from './CityInfo'
import type { CitizenReport, ReportCoordinates } from '../types/citizenReport'
import type { CommunityMember } from '../types/community'

type DashboardTab = 'map' | 'reports' | 'tracker' | 'social' | 'city' | 'hotzones'

const initialCitizenReports: CitizenReport[] = [
  {
    id: 'report-draft-1',
    category: 'Замын нүх',
    description: 'Авто замын гол хэсэгт нүх үүсээд машин огцом тойрч байна.',
    district: 'Сүхбаатар',
    locationText: 'Сөүлийн гудамж орчим',
    coordinates: {
      lat: 47.91792,
      lng: 106.91678,
    },
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1571867424488-4565932edb41?auto=format&fit=crop&w=900&q=80',
        fileName: 'draft-road-report.jpg',
      },
    ],
    comments: 'Draft report - Supabase холболтын дараа real upload болно.',
    status: 'Received',
    createdAt: new Date().toISOString(),
    createdBy: 'currentUser-placeholder',
  },
  {
    id: 'report-draft-2',
    category: 'Хог / бохирдол',
    description: 'Явган хүний зам дагуу хог ихээр бөөгнөрсөн байна.',
    district: 'Баянзүрх',
    locationText: 'Сансарын туннель орчим',
    coordinates: {
      lat: 47.92272,
      lng: 106.94823,
    },
    media: [
      {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=900&q=80',
        fileName: 'draft-cleanup-report.jpg',
      },
    ],
    comments: 'Draft report - байршлын marker шалгах зориулалттай.',
    status: 'Verified',
    createdAt: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
    createdBy: 'currentUser-placeholder',
  },
]

const initialCommunityMembers: CommunityMember[] = [
  {
    id: 1,
    name: 'Ану',
    role: 'Найз',
    phone: '+976 8800 1122',
    location: 'Сүхбаатарын талбай орчим',
    coordinates: { lat: 47.91892, lng: 106.9176 },
    status: 'Онлайн',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Тэмүүлэн',
    role: 'Хамт яваа',
    phone: '+976 8800 2233',
    location: 'Сансарын туннель орчим',
    coordinates: { lat: 47.92272, lng: 106.94823 },
    status: 'Хамт байна',
    updatedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: 3,
    name: 'Энхжин',
    role: 'Гэр бүлийн гишүүн',
    phone: '+976 8800 3344',
    location: '3, 4-р хороолол',
    coordinates: { lat: 47.9144, lng: 106.8678 },
    status: 'Офлайн',
    updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
]

const DashboardShell = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('map')
  // TODO: replace this local report state with Supabase select/insert/storage after auth integration.
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>(initialCitizenReports)
  const [currentLocation, setCurrentLocation] = useState<ReportCoordinates | null>(null)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [communityMembers, setCommunityMembers] = useState<CommunityMember[]>(initialCommunityMembers)
  const [selectedCommunityMemberId, setSelectedCommunityMemberId] = useState<number | null>(null)
  const currentUser = { id: 'currentUser-placeholder' }

  const selectedReport = citizenReports.find(report => report.id === selectedReportId) ?? null
  const updateCommunityMembers = useCallback((members: CommunityMember[]) => {
    setCommunityMembers(members)
  }, [])

  const selectReport = (reportId: string | null) => {
    setSelectedReportId(reportId)
    if (reportId) {
      setActiveTab('social')
    }
  }

  return (
    <div className="app-container">
      <div className="main-content">
        <MapComponent
          reports={citizenReports}
          currentLocation={currentLocation}
          selectedReportId={selectedReportId}
          onReportSelect={selectReport}
          communityMembers={communityMembers}
          selectedCommunityMemberId={selectedCommunityMemberId}
          onCommunityMemberSelect={(memberId) => {
            setSelectedCommunityMemberId(memberId)
            setActiveTab('tracker')
          }}
        />
      </div>

      <div className="sidebar glass-panel animate-fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--primary)', letterSpacing: '-0.5px' }}>
            KhannaWay
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Улаанбаатар хотын удирдлагын төв
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className={`glass-button ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>3D хяналт</button>
          <button className={`glass-button ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Дэд бүтцийн тайлан</button>
          <button className={`glass-button ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>Миний гэр</button>
          <button className={`glass-button ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')}>Иргэдийн мэдээлэл</button>
          <button className={`glass-button ${activeTab === 'city' ? 'active' : ''}`} onClick={() => setActiveTab('city')}>Хотын мэдээлэл</button>
          <button className={`glass-button ${activeTab === 'hotzones' ? 'active' : ''}`} onClick={() => setActiveTab('hotzones')}>Шууд халуун бүс</button>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 8px var(--primary)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>Систем ажиллаж байна</span>
          </div>
        </div>
      </div>

      {activeTab === 'reports' && <ReportDashboard />}
      {activeTab === 'tracker' && (
        <CommunityHomePanel
          members={communityMembers}
          selectedMemberId={selectedCommunityMemberId}
          onMembersChange={updateCommunityMembers}
          onSelectMember={setSelectedCommunityMemberId}
        />
      )}
      {activeTab === 'social' && (
        <CitizenReportPanel
          reports={citizenReports}
          currentLocation={currentLocation}
          selectedReport={selectedReport}
          createdBy={currentUser.id}
          onCurrentLocationChange={setCurrentLocation}
          onAddReport={(report) => setCitizenReports(current => [report, ...current])}
          onSelectReport={selectReport}
        />
      )}
      {activeTab === 'city' && <CityInfo />}
    </div>
  )
}

export default DashboardShell
