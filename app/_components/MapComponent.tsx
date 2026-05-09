'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type { FeatureCollection, LineString } from 'geojson'
import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  StyleSpecification
} from 'maplibre-gl'
import { Settings } from 'lucide-react'
import EventCard from './EventCard'
import type { CitizenReport, ReportCategory, ReportCoordinates, ReportStatus } from '../_types/citizenReport'
import type { CommunityMember, CommunityStatus } from '../_types/community'

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
const CARTO_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const MAPBOX_STREETS_SOURCE_ID = 'mapbox-streets'
const BUILDING_LAYER_ID = '3d-buildings'
const BUILDING_HEIGHT_LABEL_LAYER_ID = 'building-height-labels'
const HOTZONE_COLOR = '#f43f5e'
const TRAFFIC_SOURCE_ID = 'khannaway-traffic-demo'
const TRAFFIC_LAYER_ID = 'khannaway-traffic-lines'

const buildingHeightExpression: ExpressionSpecification = ['case', ['has', 'height'], ['to-number', ['get', 'height']], 8]
const buildingBaseExpression: ExpressionSpecification = ['case', ['has', 'min_height'], ['to-number', ['get', 'min_height']], 0]

type MapComponentProps = {
  reports?: CitizenReport[]
  currentLocation?: ReportCoordinates | null
  selectedReportId?: string | null
  onReportSelect?: (reportId: string) => void
  communityMembers?: CommunityMember[]
  selectedCommunityMemberId?: number | null
  onCommunityMemberSelect?: (memberId: number) => void
  events?: Array<{ id: string; lat: number; lng: number; type?: string }>
}

export type MapHandle = { flyTo: (lat: number, lng: number) => void }

const statusColor: Record<ReportStatus, string> = {
  Received: '#38bdf8',
  Verified: '#4ade80',
  'In Progress': '#f59e0b',
  Resolved: '#94a3b8',
}

const categoryColor: Record<ReportCategory, string> = {
  'Мөстсөн / халтиргаатай хэсэг': '#38bdf8',
  'Замын нүх': '#f59e0b',
  'Эвдэрсэн гэрэл': '#fde047',
  'Хог / бохирдол': '#a3e635',
  'Аюултай явган зам': '#f43f5e',
  'Замын хөдөлгөөний асуудал': '#fb7185',
  Бусад: '#94a3b8',
}

const communityStatusColor: Record<CommunityStatus, string> = {
  Онлайн: '#4ade80',
  Офлайн: '#64748b',
  'Хамт байна': '#3b82f6',
}

const getEventDotColor = (type?: string): string => {
  const map: Record<string, string> = {
    music: '#f43f5e',
    tech: '#3b82f6',
    art: '#a855f7',
    sports: '#22c55e',
    food: '#f97316',
    workshop: '#eab308',
    default: '#6b7280'
  }
  return map[type || 'default'] || map.default
}

const trafficDemoData: FeatureCollection<LineString, { level: 'low' | 'medium' | 'high' }> = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { level: 'high' }, geometry: { type: 'LineString', coordinates: [[106.889, 47.914], [106.903, 47.916], [106.918, 47.918], [106.935, 47.920], [106.951, 47.923]] } },
    { type: 'Feature', properties: { level: 'medium' }, geometry: { type: 'LineString', coordinates: [[106.910, 47.930], [106.918, 47.922], [106.927, 47.913], [106.938, 47.903]] } },
    { type: 'Feature', properties: { level: 'low' }, geometry: { type: 'LineString', coordinates: [[106.857, 47.914], [106.875, 47.914], [106.894, 47.915], [106.908, 47.916]] } },
  ],
}

const createBaseMapStyle = (): string | StyleSpecification => {
  if (!MAPBOX_ACCESS_TOKEN) return CARTO_DARK_STYLE
  return {
    version: 8,
    glyphs: `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${MAPBOX_ACCESS_TOKEN}`,
    sources: {
      mapbox: { type: 'raster', tiles: [`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`], tileSize: 256, attribution: '© Mapbox © OpenStreetMap' },
      [MAPBOX_STREETS_SOURCE_ID]: { type: 'vector', tiles: [`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.mvt?access_token=${MAPBOX_ACCESS_TOKEN}`], minzoom: 0, maxzoom: 16 }
    },
    layers: [{ id: 'mapbox', type: 'raster', source: 'mapbox' }]
  } as StyleSpecification
}

const add3DBuildings = (targetMap: maplibregl.Map) => {
  if (!MAPBOX_ACCESS_TOKEN || targetMap.getLayer(BUILDING_LAYER_ID)) return
  targetMap.addLayer({
    id: BUILDING_LAYER_ID,
    type: 'fill-extrusion',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'building',
    minzoom: 14,
    filter: ['all', ['!=', ['get', 'underground'], 'true'], ['==', ['get', 'extrude'], 'true']],
    paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], buildingHeightExpression, 0, '#38bdf8', 12, '#4ade80', 32, '#f59e0b', 70, '#f43f5e'],
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.25, buildingHeightExpression],
      'fill-extrusion-base': buildingBaseExpression,
      'fill-extrusion-opacity': 0.86
    }
  } as LayerSpecification)

  targetMap.addLayer({
    id: BUILDING_HEIGHT_LABEL_LAYER_ID,
    type: 'symbol',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'building',
    minzoom: 16,
    filter: ['all', ['!=', ['get', 'underground'], 'true'], ['==', ['get', 'extrude'], 'true']],
    layout: {
      'text-field': ['concat', ['to-number', ['round', buildingHeightExpression]], ' м'],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': 11,
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'symbol-placement': 'point'
    },
    paint: { 'text-color': '#f8fafc', 'text-halo-color': '#020617', 'text-halo-width': 1.5, 'text-halo-blur': 0.25 }
  } as LayerSpecification)
}

const createHeightPopupContent = (feature: MapGeoJSONFeature) => {
  const height = Number(feature?.properties?.height)
  const rounded = Number.isFinite(height) ? Math.round(height * 10) / 10 : null
  const buildingType = typeof feature?.properties?.type === 'string' ? feature.properties.type : 'building'
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'display:grid;gap:0.25rem'
  const t = document.createElement('strong'); t.textContent = 'Барилгын өндөр'
  const h = document.createElement('span'); h.textContent = rounded === null ? 'Өндрийн мэдээлэл алга' : `${rounded} м`
  const s = document.createElement('small'); s.style.color = '#94a3b8'; s.textContent = `Төрөл: ${buildingType}`
  wrapper.append(t, h, s)
  return wrapper
}

const MapComponent = forwardRef<MapHandle, MapComponentProps>(({
  reports = [],
  currentLocation = null,
  selectedReportId = null,
  onReportSelect,
  communityMembers = [],
  selectedCommunityMemberId = null,
  onCommunityMemberSelect,
  events = [],
}, ref) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const reportMarkers = useRef<maplibregl.Marker[]>([])
  const communityMarkers = useRef<maplibregl.Marker[]>([])
  const eventMarkers = useRef<Map<string, maplibregl.Marker>>(new Map())
  const currentLocationMarker = useRef<maplibregl.Marker | null>(null)
  const onReportSelectRef = useRef(onReportSelect)
  const onCommunityMemberSelectRef = useRef(onCommunityMemberSelect)
  const [ready, setReady] = useState(false)
  const [buildingsReady, setBuildingsReady] = useState(false)
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d')
  const [showControls, setShowControls] = useState(false)
  const [activeEvent, setActiveEvent] = useState<{ eventId: string; x: number; y: number } | null>(null)

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng) => {
      map.current?.flyTo({ center: [lng, lat], zoom: 17, pitch: 60, duration: 1200 })
    },
  }))

  const CAMERA_CENTER_LNG = 106.9176
  const CAMERA_CENTER_LAT = 47.9189
  const UB_STADIUM_LNG = 106.9155
  const UB_STADIUM_LAT = 47.9014

  useEffect(() => {
    onReportSelectRef.current = onReportSelect
    onCommunityMemberSelectRef.current = onCommunityMemberSelect
  }, [onReportSelect, onCommunityMemberSelect])

  useEffect(() => {
    const handleToggle = () => setShowControls(prev => !prev)
    window.addEventListener('toggle-map-controls', handleToggle)
    return () => window.removeEventListener('toggle-map-controls', handleToggle)
  }, [])

  useEffect(() => {
    if (map.current || !mapContainer.current) return
    const mainMap = new maplibregl.Map({
      container: mapContainer.current,
      style: createBaseMapStyle(),
      center: [CAMERA_CENTER_LNG, CAMERA_CENTER_LAT],
      zoom: 16,
      pitch: 54,
      bearing: -18,
      canvasContextAttributes: { antialias: true }
    })
    map.current = mainMap
    mainMap.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    mainMap.on('load', () => {
      setReady(true)
      
      add3DBuildings(mainMap)
      mainMap.on('click', BUILDING_LAYER_ID, (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature) return
        new maplibregl.Popup({ offset: 14 }).setLngLat(event.lngLat).setDOMContent(createHeightPopupContent(feature)).addTo(mainMap)
      })
      mainMap.on('mouseenter', BUILDING_LAYER_ID, () => { mainMap.getCanvas().style.cursor = 'pointer' })
      mainMap.on('mouseleave', BUILDING_LAYER_ID, () => { mainMap.getCanvas().style.cursor = '' })
      setBuildingsReady(true)

      try {
        if (mainMap.dragRotate) mainMap.dragRotate.enable()
        if (mainMap.touchZoomRotate) mainMap.touchZoomRotate.enableRotation()
        if (mainMap.doubleClickZoom) mainMap.doubleClickZoom.enable()
      } catch { /* ignore */ }
    })

    return () => {
      mainMap.remove()
      map.current = null
    }
  }, [])

  const switchMapMode = () => {
    if (!map.current) return
    const nextMode = mapMode === '3d' ? '2d' : '3d'
    setMapMode(nextMode)
    map.current.easeTo({ pitch: nextMode === '3d' ? 54 : 0, bearing: nextMode === '3d' ? -18 : 0, duration: 650 })
  }

  useEffect(() => {
    if (!ready || !map.current) return
    reportMarkers.current.forEach(m => m.remove())
    reportMarkers.current = reports.map(report => {
      const el = document.createElement('button')
      el.style.cssText = `width:${selectedReportId === report.id ? '26px' : '21px'};height:${selectedReportId === report.id ? '26px' : '21px'};border-radius:50%;border:2px solid white;background:${statusColor[report.status] || categoryColor[report.category]};cursor:pointer;padding:0`
      el.onclick = () => onReportSelectRef.current?.(report.id)
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([report.coordinates.lng, report.coordinates.lat]).addTo(map.current!)
    })
  }, [ready, reports, selectedReportId])

  useEffect(() => {
    if (!ready || !map.current) return
    communityMarkers.current.forEach(m => m.remove())
    communityMarkers.current = communityMembers.map(member => {
      const el = document.createElement('button')
      el.textContent = member.name.slice(0, 1).toUpperCase()
      el.style.cssText = `width:${selectedCommunityMemberId === member.id ? '31px' : '25px'};height:${selectedCommunityMemberId === member.id ? '31px' : '25px'};border-radius:50%;border:2px solid white;background:${communityStatusColor[member.status]};color:#06111a;cursor:pointer;padding:0;font-weight:800;font-size:0.78rem`
      el.onclick = () => onCommunityMemberSelectRef.current?.(member.id)
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([member.coordinates.lng, member.coordinates.lat]).addTo(map.current!)
    })
  }, [communityMembers, ready, selectedCommunityMemberId])

  useEffect(() => {
    if (!ready || !map.current) return
    const ctrlGroup = document.querySelector('.maplibregl-ctrl-top-right .maplibregl-ctrl-group')
    if (!ctrlGroup) return

    const btn = document.createElement('button')
    btn.className = 'maplibregl-ctrl-icon custom-ctrl-settings'
    btn.type = 'button'
    btn.title = 'Map Controls'
    btn.style.cssText = `display:flex;align-items:center;justify-content:center;width:29px;height:29px;border-top:1px solid #ddd;outline:none;background:none;border-left:none;border-right:none;border-bottom:none;cursor:pointer`
    
    // SVG for Settings icon
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`
    
    btn.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      window.dispatchEvent(new CustomEvent('toggle-map-controls'))
    }

    ctrlGroup.appendChild(btn)

    return () => {
      btn.remove()
    }
  }, [ready])

  useEffect(() => {
    if (!ready || !map.current) return
    currentLocationMarker.current?.remove()
    if (!currentLocation) return
    const el = document.createElement('div')
    el.style.cssText = `width:20px;height:20px;border-radius:50%;background:rgba(74,222,128,0.9);border:2px solid white;box-shadow:0 0 0 8px rgba(74,222,128,0.16)`
    currentLocationMarker.current = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([currentLocation.lng, currentLocation.lat]).addTo(map.current)
  }, [ready, currentLocation])

  // Sync Events (Dots)
  useEffect(() => {
    if (!ready || !map.current) return

    // Clean old
    eventMarkers.current.forEach(m => m.remove())
    eventMarkers.current.clear()

    // Add new
    events.forEach(ev => {
      const color = getEventDotColor(ev.type)
      const el = document.createElement('div')
      
      // Fixed drift style: focus on shadow only, no transform transitions
      el.style.cssText = `
        width: 14px;
        height: 14px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px ${color}99;
        cursor: pointer;
        transition: box-shadow 0.2s ease;
      `
      
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = `0 0 20px ${color}, 0 0 35px ${color}66`
      })
      
      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = `0 0 10px ${color}99`
      })
      
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        if (!map.current) return
        const p = map.current.project([ev.lng, ev.lat])
        setActiveEvent({ eventId: ev.id, x: p.x, y: p.y })
      })

      const marker = new maplibregl.Marker({ 
        element: el, 
        anchor: 'center',
        pitchAlignment: 'map',
        rotationAlignment: 'map'
      })
        .setLngLat([ev.lng, ev.lat])
        .addTo(map.current!)
      
      eventMarkers.current.set(ev.id, marker)
    })
  }, [ready, events])

  // Keep active event card synced with map movement
  useEffect(() => {
    if (!ready || !map.current || !activeEvent) return
    const update = () => {
      const marker = eventMarkers.current.get(activeEvent.eventId)
      if (marker && map.current) {
        const p = map.current.project(marker.getLngLat())
        setActiveEvent(prev => prev ? { ...prev, x: p.x, y: p.y } : null)
      }
    }
    map.current.on('move', update)
    return () => { map.current?.off('move', update) }
  }, [ready, activeEvent])

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />
      
      {activeEvent && (
        <EventCard
          eventId={activeEvent.eventId}
          x={activeEvent.x}
          y={activeEvent.y}
          onClose={() => setActiveEvent(null)}
          onThreeDotClick={(id) => { console.log('Action for event:', id); setActiveEvent(null); }}
        />
      )}

      {showControls && (
        <div className="glass-panel overlay-panel animate-fade-in" style={{ top: '5.25rem', right: '3.75rem', width: 220, padding: '0.85rem', display: 'grid', gap: '0.6rem', zIndex: 10 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Map View</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: buildingsReady ? 'var(--primary)' : 'var(--text-muted)' }}>
            {mapMode === '3d' ? '3D Харагдац' : '2D Харагдац'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button className="glass-button active" type="button" onClick={switchMapMode} style={{ justifyContent: 'center', padding: '0.5rem', fontSize: '0.75rem' }}>
              {mapMode === '3d' ? '2D' : '3D'}
            </button>
            <button 
              className="glass-button" 
              type="button" 
              onClick={() => {
                if (!navigator.geolocation) return
                navigator.geolocation.getCurrentPosition((pos) => {
                  window.dispatchEvent(new CustomEvent('update-location', { 
                    detail: { lat: pos.coords.latitude, lng: pos.coords.longitude } 
                  }))
                })
              }} 
              style={{ justifyContent: 'center', padding: '0.5rem', fontSize: '0.75rem' }}
            >
              GPS
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            <span style={{ width: 12, height: 4, borderRadius: 999, background: '#ef4444' }} />
            <span>Замын ачаалал</span>
          </div>
        </div>
      )}
    </>
  )
})

export default MapComponent
