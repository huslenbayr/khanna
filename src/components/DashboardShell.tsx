'use client'

import { useState } from 'react'
import MapComponent from './MapComponent'
import ReportDashboard from './ReportDashboard'
import TeamTracker from './TeamTracker'
import SocialFeed from './SocialFeed'
import NaadamInfo from './NaadamInfo'

type DashboardTab = 'map' | 'reports' | 'tracker' | 'social' | 'naadam' | 'hotzones'

const DashboardShell = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('map')

  return (
    <div className="app-container">
      <div className="main-content">
        <MapComponent />
      </div>

      <div className="sidebar glass-panel animate-fade-in">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--primary)', letterSpacing: '-0.5px' }}>
            KhannaWay
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Наадам цэнгэлдэхийн удирдлагын төв
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button className={`glass-button ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>3D хяналт</button>
          <button className={`glass-button ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Дэд бүтцийн тайлан</button>
          <button className={`glass-button ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>Багийн байршил</button>
          <button className={`glass-button ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')}>Сошиал / AI мэдээлэл</button>
          <button className={`glass-button ${activeTab === 'naadam' ? 'active' : ''}`} onClick={() => setActiveTab('naadam')}>Наадмын мэдээлэл</button>
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
      {activeTab === 'tracker' && <TeamTracker />}
      {activeTab === 'social' && <SocialFeed />}
      {activeTab === 'naadam' && <NaadamInfo />}
    </div>
  )
}

export default DashboardShell
