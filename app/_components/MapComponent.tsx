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
import RoadSegmentCard from './RoadSegmentCard'
import type { CitizenReport, ReportCategory, ReportCoordinates, ReportStatus } from '../_types/citizenReport'
import type { CommunityMember, CommunityStatus } from '../_types/community'
import { fetchReportsForSegment } from '@/lib/road-api'

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
const HERE_API_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY
const CARTO_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const MAPBOX_STREETS_SOURCE_ID = 'mapbox-streets'
const BUILDING_LAYER_ID = '3d-buildings'
const BUILDING_HEIGHT_LABEL_LAYER_ID = 'building-height-labels'
const HOTZONE_COLOR = '#f43f5e'
const ROAD_QUERY_LAYER = 'roads-query-layer'
const ROAD_GLOW_LAYER = 'roads-glow-layer'
const FALLBACK_ROAD_SOURCE = 'fallback-roads-source'
const ROUTE_SOURCE_ID = 'active-route'
const ROUTE_LAYER_ID = 'active-route-layer'

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

// Fallback mock roads for UB (guaranteed clickable)
const createFallbackRoads = (): FeatureCollection => {
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { name: 'Энхтайваны өргөн чөлөө', type: 'primary', id: 'road_peace' }, geometry: { type: 'LineString', coordinates: [[106.890, 47.910], [106.900, 47.912], [106.910, 47.915], [106.920, 47.918], [106.930, 47.920], [106.940, 47.922]] } },
      { type: 'Feature', properties: { name: 'Чингисийн өргөн чөлөө', type: 'primary', id: 'road_chinggis' }, geometry: { type: 'LineString', coordinates: [[106.895, 47.900], [106.905, 47.905], [106.915, 47.915], [106.925, 47.925], [106.935, 47.935]] } },
      { type: 'Feature', properties: { name: 'Сүхбаатарын гудамж', type: 'secondary', id: 'road_sukhbaatar' }, geometry: { type: 'LineString', coordinates: [[106.910, 47.918], [106.912, 47.915], [106.915, 47.912], [106.918, 47.910], [106.921, 47.908]] } },
      { type: 'Feature', properties: { name: 'Олимпийн гудамж', type: 'secondary', id: 'road_olympic' }, geometry: { type: 'LineString', coordinates: [[106.900, 47.920], [106.905, 47.916], [106.910, 47.912], [106.915, 47.908], [106.920, 47.904]] } },
      { type: 'Feature', properties: { name: 'Жендэний гудамж', type: 'tertiary', id: 'road_genden' }, geometry: { type: 'LineString', coordinates: [[106.915, 47.920], [106.918, 47.918], [106.921, 47.916], [106.924, 47.914]] } },
    ]
  }
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

const decodePolyline = (encoded: string): [number, number][] => {
  if (!encoded || typeof encoded !== 'string') {
    console.warn('Invalid polyline:', encoded)
    return []
  }
  const points: [number, number][] = []
  let index = 0, lat = 0, lng = 0
  
  while (index < encoded.length) {
    let b, shift = 0, result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lat += dlat
    
    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1))
    lng += dlng
    
    points.push([lng / 1e5, lat / 1e5])
  }
  return points
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
  
  // ==================== ROAD CONDITIONS STATE ====================
  const [roadConditionsActive, setRoadConditionsActive] = useState(false)
  const [activeRoadSegment, setActiveRoadSegment] = useState<{ 
    segmentId: string
    roadName: string
    lat: number
    lng: number
    x: number
    y: number
  } | null>(null)
  
  // ==================== ROUTE STATE ====================
  const [routeModalOpen, setRouteModalOpen] = useState(false)
  const [pendingRoute, setPendingRoute] = useState<{
    destLat: number
    destLng: number
    eventName: string
    eventId: string
  } | null>(null)
  const [routePreferences, setRoutePreferences] = useState({
    avoidAccidents: true,
    avoidRoadwork: false,
    avoidHeavyTraffic: true,
    avoidTollRoads: false,
    avoidHighways: false
  })
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  
  // Track which road source is being used
  const [roadSourceType, setRoadSourceType] = useState<string | null>(null)

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng) => {
      map.current?.flyTo({ center: [lng, lat], zoom: 17, pitch: 60, duration: 1200 })
    },
  }))

  const CAMERA_CENTER_LNG = 106.9176
  const CAMERA_CENTER_LAT = 47.9189
  const UB_STADIUM_LNG = 106.9155
  const UB_STADIUM_LAT = 47.9014

  // ==================== ROUTE FUNCTIONS ====================
  
  const clearRoute = () => {
    if (map.current) {
      if (map.current.getLayer(ROUTE_LAYER_ID)) {
        map.current.removeLayer(ROUTE_LAYER_ID)
      }
      if (map.current.getSource(ROUTE_SOURCE_ID)) {
        map.current.removeSource(ROUTE_SOURCE_ID)
      }
    }
  }


  const calculateRoute = async () => {
    if (!pendingRoute || !currentLocation || !MAPBOX_ACCESS_TOKEN) {
      alert(!currentLocation ? 'Please enable GPS first' : 'Mapbox API not configured')
      return
    }
    
    setIsCalculatingRoute(true)
    
    // COMPLETELY clear any existing route first
    if (map.current) {
      try {
        if (map.current.getLayer(ROUTE_LAYER_ID)) {
          map.current.removeLayer(ROUTE_LAYER_ID)
        }
        if (map.current.getSource(ROUTE_SOURCE_ID)) {
          map.current.removeSource(ROUTE_SOURCE_ID)
        }
      } catch (e) {
        console.warn('Error clearing route:', e)
      }
    }
    
    try {
      // Use Mapbox Directions API - returns GeoJSON directly
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLocation.lng},${currentLocation.lat};${pendingRoute.destLng},${pendingRoute.destLat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
      
      console.log('🚗 Calculating route to:', pendingRoute.eventName, 'at', pendingRoute.destLat, pendingRoute.destLng)
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.code === 'Ok' && data.routes && data.routes[0]) {
        const route = data.routes[0]
        const coordinates = route.geometry.coordinates
        const duration = Math.round(route.duration / 60)
        const distance = (route.distance / 1000).toFixed(1)
        
        console.log(`✅ Route found: ${distance}km, ${duration}min`)
        console.log(`📍 Destination: ${pendingRoute.destLat}, ${pendingRoute.destLng}`)
        console.log(`📍 First coordinate: ${coordinates[0]}`)
        console.log(`📍 Last coordinate: ${coordinates[coordinates.length - 1]}`)
        
        // Draw route on map

        // Draw route on map - FORCE COMPLETE REFRESH
        if (map.current && coordinates.length > 0) {
          // COMPLETELY remove all route-related layers and sources
          const allLayers = map.current.getStyle().layers || []
          allLayers.forEach(layer => {
            if (layer.id.includes('active-route') || layer.id.includes(ROUTE_LAYER_ID)) {
              try { 
                if (map.current.getLayer(layer.id)) {
                  map.current.removeLayer(layer.id)
                }
              } catch (e) { console.warn('Error removing layer:', e) }
            }
          })
          
          const allSources = map.current.getStyle().sources || {}
          Object.keys(allSources).forEach(sourceId => {
            if (sourceId.includes('active-route') || sourceId.includes(ROUTE_SOURCE_ID)) {
              try { 
                if (map.current.getSource(sourceId)) {
                  map.current.removeSource(sourceId)
                }
              } catch (e) { console.warn('Error removing source:', e) }
            }
          })
          
          // Add fresh source
          map.current.addSource(ROUTE_SOURCE_ID, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: coordinates
              }
            }
          })
          
          // Add fresh layer
          map.current.addLayer({
            id: ROUTE_LAYER_ID,
            type: 'line',
            source: ROUTE_SOURCE_ID,
            paint: {
              'line-color': '#22c55e',
              'line-width': 5,
              'line-opacity': 0.9,
              'line-blur': 0.5
            }
          })
          
          // Fit map to route bounds
          const bounds = new maplibregl.LngLatBounds()
          coordinates.forEach(coord => {
            bounds.extend([coord[0], coord[1]])
          })
          map.current.fitBounds(bounds, { padding: 50, duration: 1000 })
          
          alert(`Route to ${pendingRoute.eventName}! ${distance}km, approximately ${duration} minutes`)
        }
        
        setRouteModalOpen(false)
        setPendingRoute(null)
      } else {
        console.error('No route found:', data)
        alert('No route found between these locations')
      }
    } catch (error) {
      console.error('Route calculation failed:', error)
      alert('Failed to calculate route. Please try again.')
    } finally {
      setIsCalculatingRoute(false)
    }
  }



 
  const openRouteModal = (eventId: string, lat: number, lng: number, eventName: string) => {
    if (!currentLocation) {
      alert('Please enable GPS first to get your current location')
      return
    }
    setPendingRoute({ destLat: lat, destLng: lng, eventName, eventId })
    setRouteModalOpen(true)
  }

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
      
      // ==================== ATTEMPT 1: HERE VECTOR TILES ====================
      let roadSourceAdded = false
      
      if (HERE_API_KEY) {
        try {
          mainMap.addSource('here-roads', {
            type: 'vector',
            tiles: [`https://vector.hereapi.com/v2/vectortiles/base/mc/{z}/{x}/{y}/omv?apikey=${HERE_API_KEY}`],
            minzoom: 0,
            maxzoom: 14
          })
          
          // Outer glow layer
          mainMap.addLayer({
            id: ROAD_GLOW_LAYER,
            type: 'line',
            source: 'here-roads',
            'source-layer': 'roads',
            paint: {
              'line-color': '#22c55e',
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 10, 18, 14],
              'line-opacity': roadConditionsActive ? 0.3 : 0,
              'line-blur': 3
            }
          })
          
          // Core road layer
          mainMap.addLayer({
            id: ROAD_QUERY_LAYER,
            type: 'line',
            source: 'here-roads',
            'source-layer': 'roads',
            paint: {
              'line-color': '#22c55e',
              'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4, 18, 6],
              'line-opacity': roadConditionsActive ? 0.75 : 0,
              'line-blur': 0.5
            }
          })
          
          roadSourceAdded = true
          setRoadSourceType('HERE')
        } catch (err) {
          console.warn('Failed to add HERE road layer:', err)
        }
      }
      
      // ==================== ATTEMPT 2: FALLBACK MOCK ROADS ====================
      if (!roadSourceAdded) {
        try {
          const fallbackRoads = createFallbackRoads()
          
          mainMap.addSource(FALLBACK_ROAD_SOURCE, {
            type: 'geojson',
            data: fallbackRoads
          })
          
          mainMap.addLayer({
            id: ROAD_GLOW_LAYER,
            type: 'line',
            source: FALLBACK_ROAD_SOURCE,
            paint: {
              'line-color': '#22c55e',
              'line-width': 8,
              'line-opacity': roadConditionsActive ? 0.3 : 0,
              'line-blur': 3
            }
          })
          
          mainMap.addLayer({
            id: ROAD_QUERY_LAYER,
            type: 'line',
            source: FALLBACK_ROAD_SOURCE,
            paint: {
              'line-color': '#22c55e',
              'line-width': 4,
              'line-opacity': roadConditionsActive ? 0.75 : 0,
              'line-blur': 0.5
            }
          })
          
          setRoadSourceType('FALLBACK')
        } catch (err) {
          console.warn('Failed to add fallback road layer:', err)
        }
      }
      
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

    eventMarkers.current.forEach(m => m.remove())
    eventMarkers.current.clear()

    events.forEach(ev => {
      const color = getEventDotColor(ev.type)
      const el = document.createElement('div')
      
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

  // ==================== ROAD CONDITIONS CLICK HANDLER ====================
  const toggleRoadConditions = () => {
    const newState = !roadConditionsActive
    setRoadConditionsActive(newState)
    
    if (map.current) {
      if (map.current.getLayer(ROAD_QUERY_LAYER)) {
        map.current.setPaintProperty(ROAD_QUERY_LAYER, 'line-opacity', newState ? 0.75 : 0)
      }
      if (map.current.getLayer(ROAD_GLOW_LAYER)) {
        map.current.setPaintProperty(ROAD_GLOW_LAYER, 'line-opacity', newState ? 0.3 : 0)
      }
    }
  }

  useEffect(() => {
    if (!ready || !map.current || !roadConditionsActive) return

    const handleRoadClick = async (e: MapLayerMouseEvent) => {
      const features = map.current?.queryRenderedFeatures(e.point, {
        layers: [ROAD_QUERY_LAYER]
      })
      
      const roadFeature = features?.[0]
      if (roadFeature?.properties) {
        const props = roadFeature.properties
        const roadName = props.name || props.road_name || 'Замын хэсэг'
        const { lng, lat } = e.lngLat
        const roadId = props.id || `road_${Math.floor(Math.random() * 10000)}`
        const segmentId = `${roadId}_${Math.floor(lat * 1000)}_${Math.floor(lng * 1000)}`
        
        setActiveRoadSegment({
          segmentId,
          roadName,
          lat,
          lng,
          x: e.point.x,
          y: e.point.y
        })
      }
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!map.current || !roadConditionsActive) return
      const rect = map.current.getCanvas().getBoundingClientRect()
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const features = map.current.queryRenderedFeatures(point, {
        layers: [ROAD_QUERY_LAYER]
      })
      map.current.getCanvas().style.cursor = features.length > 0 ? 'pointer' : ''
    }
    
    map.current.on('click', ROAD_QUERY_LAYER, handleRoadClick)
    map.current.on('mousemove', handleMouseMove)
    
    return () => {
      map.current?.off('click', ROAD_QUERY_LAYER, handleRoadClick)
      map.current?.off('mousemove', handleMouseMove)
      if (map.current) map.current.getCanvas().style.cursor = ''
    }
  }, [ready, roadConditionsActive])

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
          onGetMeThere={(eventId, lat, lng, eventName) => openRouteModal(eventId, lat, lng, eventName)}
        />
      )}

      {activeRoadSegment && (
        <RoadSegmentCard
          segmentId={activeRoadSegment.segmentId}
          roadName={activeRoadSegment.roadName}
          x={activeRoadSegment.x}
          y={activeRoadSegment.y}
          lat={activeRoadSegment.lat}
          lng={activeRoadSegment.lng}
          onClose={() => setActiveRoadSegment(null)}
          onThreeDotClick={(segmentId, lat, lng) => {
            console.log('⋮ Clicked for road segment:', segmentId, lat, lng)
            setActiveRoadSegment(null)
          }}
          fetchReportData={fetchReportsForSegment}
        />
      )}

      {/* Route Preferences Modal */}
      {routeModalOpen && pendingRoute && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setRouteModalOpen(false)}>
          <div className="bg-[#0a0c14] rounded-xl shadow-2xl border border-white/10 w-80 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold">🚗 Get Me There</h3>
              <p className="text-xs text-slate-400 mt-1">to {pendingRoute.eventName}</p>
            </div>
            
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-400 mb-2">What would you like to avoid?</p>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">🚗💥 Accidents</span>
                <input 
                  type="checkbox" 
                  checked={routePreferences.avoidAccidents}
                  onChange={(e) => setRoutePreferences({...routePreferences, avoidAccidents: e.target.checked})}
                  className="w-4 h-4 accent-green-500"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">🚧 Roadwork</span>
                <input 
                  type="checkbox" 
                  checked={routePreferences.avoidRoadwork}
                  onChange={(e) => setRoutePreferences({...routePreferences, avoidRoadwork: e.target.checked})}
                  className="w-4 h-4 accent-green-500"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">💰 Toll Roads</span>
                <input 
                  type="checkbox" 
                  checked={routePreferences.avoidTollRoads}
                  onChange={(e) => setRoutePreferences({...routePreferences, avoidTollRoads: e.target.checked})}
                  className="w-4 h-4 accent-green-500"
                />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">🛣️ Highways</span>
                <input 
                  type="checkbox" 
                  checked={routePreferences.avoidHighways}
                  onChange={(e) => setRoutePreferences({...routePreferences, avoidHighways: e.target.checked})}
                  className="w-4 h-4 accent-green-500"
                />
              </label>
            </div>
            
            <div className="p-4 flex gap-2 border-t border-white/10">
              <button 
                onClick={() => setRouteModalOpen(false)}
                className="flex-1 py-2 rounded-md text-sm bg-white/5 text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button 
                onClick={calculateRoute}
                disabled={isCalculatingRoute}
                className="flex-1 py-2 rounded-md text-sm bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculatingRoute ? 'Calculating...' : 'Calculate Route'}
              </button>
            </div>
          </div>
        </div>
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
          
          {/* Road Conditions Toggle Button */}
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
              <div 
                style={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  background: roadConditionsActive ? '#22c55e' : '#6b7280',
                  boxShadow: roadConditionsActive ? '0 0 8px #22c55e' : 'none'
                }} 
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Замын нөхцөл байдал</span>
            </div>
            <button 
              className="glass-button" 
              type="button" 
              onClick={toggleRoadConditions}
              style={{ 
                justifyContent: 'center', 
                padding: '0.25rem 0.6rem', 
                fontSize: '0.65rem',
                background: roadConditionsActive ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                borderColor: roadConditionsActive ? '#22c55e' : 'var(--border)',
                boxShadow: roadConditionsActive ? '0 0 8px rgba(34, 197, 94, 0.3)' : 'none'
              }}
            >
              {roadConditionsActive ? 'ИДЭВХТЭЙ' : 'ИДЭВХГҮЙ'}
            </button>
          </div>
        </div>
      )}
    </>
  )
})

export default MapComponent
