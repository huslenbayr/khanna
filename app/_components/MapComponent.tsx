'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type {
  FillExtrusionLayerSpecification,
  GeoJSONSource,
  MapLayerMouseEvent,
  StyleSpecification,
  MapGeoJSONFeature,
} from 'maplibre-gl'
import { Locate, Wrench } from 'lucide-react'
import { type Post, TYPE_META } from './PostCard'
import type { CitizenReport, ReportCategory, ReportCoordinates, ReportStatus } from '../_types/citizenReport'
import type { CommunityMember, CommunityStatus } from '../_types/community'

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
const MAPBOX_BASEMAP_SETTING = process.env.NEXT_PUBLIC_USE_MAPBOX_BASEMAP
const USE_MAPBOX_BASEMAP = MAPBOX_BASEMAP_SETTING === 'true'
  || (process.env.NODE_ENV === 'development' && MAPBOX_BASEMAP_SETTING !== 'false')
const MAPBOX_STREETS_SOURCE_ID = 'mapbox-streets'
const OSM_BUILDINGS_SOURCE_ID = 'osm-buildings'
const BUILDING_LAYER_ID = '3d-buildings'
const MAX_FALLBACK_BUILDING_BBOX_SPAN = 0.08
const FALLBACK_BUILDING_MIN_ZOOM = 15

type FillExtrusionPaint = NonNullable<FillExtrusionLayerSpecification['paint']>

const buildingHeightExpression = ['case', ['has', 'height'], ['to-number', ['get', 'height']], 8] as unknown as FillExtrusionPaint['fill-extrusion-height']
const buildingBaseExpression = ['case', ['has', 'min_height'], ['to-number', ['get', 'min_height']], 0] as unknown as FillExtrusionPaint['fill-extrusion-base']

type BuildingFeatureCollection = {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    properties: Record<string, unknown>
    geometry: {
      type: 'Polygon'
      coordinates: number[][][]
    }
  }>
}

const EMPTY_BUILDINGS_GEOJSON: BuildingFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
}

type MapComponentProps = {
  reports?: CitizenReport[]
  currentLocation?: ReportCoordinates | null
  selectedReportId?: string | null
  onReportSelect?: (reportId: string) => void
  communityMembers?: CommunityMember[]
  selectedCommunityMemberId?: number | null
  onCommunityMemberSelect?: (memberId: number) => void
  feedDesktopOpen?: boolean
  mapPosts?: Post[]
  onLongPress?: (lat: number, lng: number) => void
  onPostSelect?: (postId: string) => void | Promise<void>
  onRoadSelect?: (roadId: string, roadName: string, lat: number, lng: number) => void
}

export type MapHandle = {
  flyTo: (lat: number, lng: number) => void
  clearSelection: () => void
  calculateRoute: (destLat: number, destLng: number) => Promise<void>
  clearRoute: () => void
}

const POST_TYPE_EMOJI: Record<string, string> = {
  info: '📍', issue: '⚠️', landmark: '🏛️', event: '🎉', show: '🎭', safety: '🚨',
}

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

const createCartoDarkStyle = (): StyleSpecification => ({
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    },
  },
  layers: [{ id: 'carto-dark', type: 'raster', source: 'carto' }],
})

const canUseMapboxBasemap = () => Boolean(MAPBOX_ACCESS_TOKEN && USE_MAPBOX_BASEMAP)

const createBaseMapStyle = (): StyleSpecification => {
  if (!canUseMapboxBasemap()) {
    return createCartoDarkStyle()
  }
  
  // Хэрэв токен байгаа ч ажиллахгүй байвал Mapbox-ийн dashboard дээр
  // domain restriction тохиргоог шалгана уу.
  return {
    version: 8,
    glyphs: `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${MAPBOX_ACCESS_TOKEN}`,
    sources: {
      mapbox: { type: 'raster', tiles: [`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`], tileSize: 256, attribution: '© Mapbox © OpenStreetMap' },
      [MAPBOX_STREETS_SOURCE_ID]: { type: 'vector', tiles: [`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.mvt?access_token=${MAPBOX_ACCESS_TOKEN}`], minzoom: 0, maxzoom: 16 }
    },
    layers: [{ id: 'mapbox', type: 'raster', source: 'mapbox' }]
  }
}

const add3DBuildings = (targetMap: maplibregl.Map) => {
  if (!canUseMapboxBasemap() || !targetMap.getSource(MAPBOX_STREETS_SOURCE_ID)) return false
  if (targetMap.getLayer(BUILDING_LAYER_ID)) return true

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
  } as FillExtrusionLayerSpecification)

  return true
}

const addFallback3DBuildings = (targetMap: maplibregl.Map) => {
  if (targetMap.getLayer(BUILDING_LAYER_ID)) return true

  if (!targetMap.getSource(OSM_BUILDINGS_SOURCE_ID)) {
    targetMap.addSource(OSM_BUILDINGS_SOURCE_ID, {
      type: 'geojson',
      data: EMPTY_BUILDINGS_GEOJSON,
    })
  }

  targetMap.addLayer({
    id: BUILDING_LAYER_ID,
    type: 'fill-extrusion',
    source: OSM_BUILDINGS_SOURCE_ID,
    minzoom: 14,
    paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], buildingHeightExpression, 0, '#38bdf8', 12, '#4ade80', 32, '#f59e0b', 70, '#f43f5e'],
      'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 14, 0, 15.25, buildingHeightExpression],
      'fill-extrusion-base': buildingBaseExpression,
      'fill-extrusion-opacity': 0.72,
    },
  } as FillExtrusionLayerSpecification)

  return true
}

const addRoadLayers = (targetMap: maplibregl.Map) => {
  if (!canUseMapboxBasemap() || !targetMap.getSource(MAPBOX_STREETS_SOURCE_ID) || targetMap.getLayer('roads-primary')) return

  const beforeLayerId = targetMap.getLayer(BUILDING_LAYER_ID) ? BUILDING_LAYER_ID : undefined

  // Замын үндсэн шугам (Subtle blue stroke)
  targetMap.addLayer({
    id: 'roads-primary',
    type: 'line',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'road',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['interpolate', ['linear'], ['zoom'], 14, 'rgba(56, 189, 248, 0.1)', 16, 'rgba(56, 189, 248, 0.25)'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 16, 2],
    }
  }, beforeLayerId)

  // Гол замуудын гэрэлтэх эффект (Neon glow for major roads)
  targetMap.addLayer({
    id: 'roads-glow',
    type: 'line',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'road',
    filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary'], true, false],
    paint: {
      'line-color': 'rgba(56, 189, 248, 0.15)',
      'line-width': ['interpolate', ['linear'], ['zoom'], 12, 1.5, 16, 5],
      'line-blur': ['interpolate', ['linear'], ['zoom'], 14, 0, 16, 3]
    }
  }, 'roads-primary')

  // Inspect layers
  targetMap.addLayer({
    id: 'roads-inspect-glow',
    type: 'line',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'road',
    filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
    paint: {
      'line-color': '#22c55e',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 6, 14, 10, 18, 14],
      'line-opacity': 0,
      'line-blur': 3
    }
  })
  targetMap.addLayer({
    id: 'roads-inspect-query',
    type: 'line',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'road',
    filter: ['match', ['get', 'class'], ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'], true, false],
    paint: {
      'line-color': '#22c55e',
      'line-width': ['interpolate', ['linear'], ['zoom'], 10, 2, 14, 4, 18, 6],
      'line-opacity': 0,
      'line-blur': 0.5
    }
  })
}

const isMapboxRequestError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('api.mapbox.com') || message.includes('mapbox')
}

const getFallbackBuildingSource = (targetMap: maplibregl.Map) => (
  targetMap.getSource(OSM_BUILDINGS_SOURCE_ID) as GeoJSONSource | undefined
)

const createHeightPopupContent = (feature: MapGeoJSONFeature) => {
  const height = Number(feature.properties ? feature.properties.height : 0)
  const rounded = Number.isFinite(height) ? Math.round(height * 10) / 10 : null
  const buildingType = feature.properties ? feature.properties.type || 'building' : 'building'
  
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'display:grid;gap:0.25rem'
  wrapper.innerHTML = `
    <strong>Барилгын өндөр</strong>
    <span>${rounded === null ? 'Мэдээлэл алга' : rounded + ' м'}</span>
    <small style="color:#94a3b8">Төрөл: ${buildingType}</small>
  `
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
  feedDesktopOpen = false,
  mapPosts = [],
  onLongPress,
  onPostSelect,
  onRoadSelect,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const reportMarkers = useRef<maplibregl.Marker[]>([])
  const communityMarkers = useRef<maplibregl.Marker[]>([])
  const currentLocationMarker = useRef<maplibregl.Marker | null>(null)
  const onReportSelectRef = useRef(onReportSelect)
  const onCommunityMemberSelectRef = useRef(onCommunityMemberSelect)
  const onLongPressRef = useRef(onLongPress)
  const onPostSelectRef = useRef(onPostSelect)
  const onRoadSelectRef = useRef(onRoadSelect)
  const postMarkers = useRef<maplibregl.Marker[]>([])
  const selectionMarker = useRef<maplibregl.Marker | null>(null)
  const [ready, setReady] = useState(false)
  const [buildingsReady, setBuildingsReady] = useState(false)
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d')
  const [roadConditionsActive, setRoadConditionsActive] = useState(false)

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng) => map.current?.flyTo({ center: [lng, lat], zoom: 17, pitch: 60, duration: 1200 }),
    clearSelection: () => { selectionMarker.current?.remove(); selectionMarker.current = null },
    calculateRoute: async (destLat: number, destLng: number) => {
      if (!currentLocation || !MAPBOX_ACCESS_TOKEN || !map.current) {
        alert(!currentLocation ? 'Та эхлээд байршлаа идэвхжүүлнэ үү (GPS)' : 'Mapbox тохиргоо дутуу байна')
        return
      }
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${currentLocation.lng},${currentLocation.lat};${destLng},${destLat}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
        const response = await fetch(url)
        const data = await response.json()
        
        if (data.code === 'Ok' && data.routes && data.routes[0]) {
          const coordinates = data.routes[0].geometry.coordinates
          const ROUTE_SOURCE_ID = 'active-route'
          const ROUTE_LAYER_ID = 'active-route-layer'
          
          if (map.current.getLayer(ROUTE_LAYER_ID)) map.current.removeLayer(ROUTE_LAYER_ID)
          if (map.current.getSource(ROUTE_SOURCE_ID)) map.current.removeSource(ROUTE_SOURCE_ID)
          
          map.current.addSource(ROUTE_SOURCE_ID, {
            type: 'geojson',
            data: { type: 'Feature', geometry: { type: 'LineString', coordinates } }
          })
          
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
          
          const bounds = new maplibregl.LngLatBounds()
          coordinates.forEach((coord: [number, number]) => bounds.extend(coord))
          map.current.fitBounds(bounds, { padding: 50, duration: 1000 })
        }
      } catch (err) {
        console.error('Route calculation failed:', err)
      }
    },
    clearRoute: () => {
      const ROUTE_SOURCE_ID = 'active-route'
      const ROUTE_LAYER_ID = 'active-route-layer'
      if (map.current?.getLayer(ROUTE_LAYER_ID)) map.current.removeLayer(ROUTE_LAYER_ID)
      if (map.current?.getSource(ROUTE_SOURCE_ID)) map.current.removeSource(ROUTE_SOURCE_ID)
    }
  }))

  useEffect(() => {
    onReportSelectRef.current = onReportSelect
    onCommunityMemberSelectRef.current = onCommunityMemberSelect
    onLongPressRef.current = onLongPress
    onPostSelectRef.current = onPostSelect
    onRoadSelectRef.current = onRoadSelect
  }, [onReportSelect, onCommunityMemberSelect, onLongPress, onPostSelect, onRoadSelect])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const updateLayout = () => {
      if (mediaQuery.matches) {
        document.documentElement.style.setProperty('--ctrl-right', feedDesktopOpen ? '400px' : '1.5rem')
      } else {
        document.documentElement.style.removeProperty('--ctrl-right')
      }
    }
    
    updateLayout()
    mediaQuery.addEventListener('change', updateLayout)
    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [feedDesktopOpen, ready])

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const mainMap = new maplibregl.Map({
      container: mapContainer.current,
      style: createBaseMapStyle(),
      center: [106.9176, 47.9189],
      zoom: 16,
      pitch: 54,
      bearing: -18,
      canvasContextAttributes: { antialias: true }
    })
    map.current = mainMap
    mainMap.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    // Long-press to place a post
    let longPressTimer: ReturnType<typeof setTimeout> | null = null
    const clearLP = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
    }
    const fireLP = (ll: maplibregl.LngLat) => {
      if (!mainMap) return
      selectionMarker.current?.remove()
      const el = document.createElement('div'); el.className = 'map-selection-marker'
      el.style.cssText = 'width:24px;height:24px;border:3px solid var(--primary);border-radius:50%;background:rgba(74,222,128,0.3);box-shadow:0 0 15px var(--primary);pointer-events:none'
      selectionMarker.current = new maplibregl.Marker({ element: el }).setLngLat(ll).addTo(mainMap)
      onLongPressRef.current?.(ll.lat, ll.lng)
    }

    const handleMouseDown = (e: maplibregl.MapMouseEvent) => { clearLP(); longPressTimer = setTimeout(() => fireLP(e.lngLat), 600) }
    const handleTouchStart = (e: maplibregl.MapTouchEvent) => { 
      clearLP(); if (e.originalEvent.touches.length === 1) longPressTimer = setTimeout(() => fireLP(e.lngLat), 600) 
    }
    const handleMapClick = () => {}

    mainMap.on('mousedown', handleMouseDown)
    mainMap.on('mouseup', clearLP)
    mainMap.on('mousemove', clearLP)
    mainMap.on('dragstart', clearLP)
    mainMap.on('touchstart', handleTouchStart)
    mainMap.on('touchend', clearLP)
    mainMap.on('touchmove', clearLP)
    mainMap.on('click', handleMapClick)

    const handleBuildingClick = (event: MapLayerMouseEvent) => {
      const feature = (event.features && event.features[0]) ? event.features[0] : null
      if (feature) {
        event.preventDefault() // Stop handleMapClick from closing active posts
        new maplibregl.Popup({ offset: 14 }).setLngLat(event.lngLat).setDOMContent(createHeightPopupContent(feature)).addTo(mainMap)
      }
    }
    const handleBuildingEnter = () => { mainMap.getCanvas().style.cursor = 'pointer' }
    const handleBuildingLeave = () => { mainMap.getCanvas().style.cursor = '' }

    let usingFallbackStyle = false
    let buildingInteractionsBound = false
    let fallbackBuildingsEnabled = false
    let lastFallbackBuildingBbox = ''
    let fallbackBuildingController: AbortController | null = null

    const bindBuildingInteractions = () => {
      if (buildingInteractionsBound || !mainMap.getLayer(BUILDING_LAYER_ID)) return
      mainMap.on('click', BUILDING_LAYER_ID, handleBuildingClick)
      mainMap.on('mouseenter', BUILDING_LAYER_ID, handleBuildingEnter)
      mainMap.on('mouseleave', BUILDING_LAYER_ID, handleBuildingLeave)
      buildingInteractionsBound = true
    }

    const unbindBuildingInteractions = () => {
      if (!buildingInteractionsBound) return
      mainMap.off('click', BUILDING_LAYER_ID, handleBuildingClick)
      mainMap.off('mouseenter', BUILDING_LAYER_ID, handleBuildingEnter)
      mainMap.off('mouseleave', BUILDING_LAYER_ID, handleBuildingLeave)
      buildingInteractionsBound = false
    }

    const getFallbackBuildingBbox = () => {
      const bounds = mainMap.getBounds()
      const south = Math.max(-90, bounds.getSouth())
      const west = Math.max(-180, bounds.getWest())
      const north = Math.min(90, bounds.getNorth())
      const east = Math.min(180, bounds.getEast())

      if (north - south > MAX_FALLBACK_BUILDING_BBOX_SPAN || east - west > MAX_FALLBACK_BUILDING_BBOX_SPAN) {
        return null
      }

      return [south, west, north, east].map(value => value.toFixed(6)).join(',')
    }

    const loadFallbackBuildings = async () => {
      if (!fallbackBuildingsEnabled) return

      const source = getFallbackBuildingSource(mainMap)
      if (!source) return

      if (mainMap.getZoom() < FALLBACK_BUILDING_MIN_ZOOM) {
        source.setData(EMPTY_BUILDINGS_GEOJSON)
        return
      }

      const bbox = getFallbackBuildingBbox()
      if (!bbox) {
        source.setData(EMPTY_BUILDINGS_GEOJSON)
        return
      }

      if (bbox === lastFallbackBuildingBbox) return
      lastFallbackBuildingBbox = bbox

      fallbackBuildingController?.abort()
      const controller = new AbortController()
      fallbackBuildingController = controller

      try {
        const response = await fetch(`/api/buildings?bbox=${bbox}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Building request failed: ${response.status}`)
        const data = await response.json() as BuildingFeatureCollection
        if (!controller.signal.aborted) {
          getFallbackBuildingSource(mainMap)?.setData(data)
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.warn('Unable to load fallback 3D buildings', error)
        }
      }
    }

    const enableFallbackBuildings = () => {
      const hasFallbackBuildings = addFallback3DBuildings(mainMap)
      fallbackBuildingsEnabled = hasFallbackBuildings
      bindBuildingInteractions()
      setBuildingsReady(hasFallbackBuildings)
      void loadFallbackBuildings()
    }

    const handleMapError = (event: { error?: unknown }) => {
      if (usingFallbackStyle || !isMapboxRequestError(event.error)) return
      usingFallbackStyle = true
      fallbackBuildingsEnabled = false
      fallbackBuildingController?.abort()
      unbindBuildingInteractions()
      setBuildingsReady(false)
      mainMap.setStyle(createCartoDarkStyle())
      mainMap.once('style.load', enableFallbackBuildings)
    }

    mainMap.on('error', handleMapError)
    mainMap.on('moveend', loadFallbackBuildings)

    mainMap.on('load', () => {
      setReady(true)
      const hasBuildings = add3DBuildings(mainMap)
      addRoadLayers(mainMap)
      if (hasBuildings) {
        bindBuildingInteractions()
        setBuildingsReady(true)
      } else {
        enableFallbackBuildings()
      }
      
      try {
        if (mainMap.dragRotate) mainMap.dragRotate.enable()
        if (mainMap.touchZoomRotate) mainMap.touchZoomRotate.enableRotation()
        if (mainMap.doubleClickZoom) mainMap.doubleClickZoom.enable()
      } catch { /* ignore */ }
    })

    return () => {
      clearLP()
      fallbackBuildingController?.abort()
      mainMap.off('error', handleMapError)
      mainMap.off('moveend', loadFallbackBuildings)
      mainMap.off('style.load', enableFallbackBuildings)
      unbindBuildingInteractions()
      mainMap.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!ready || !map.current) return
    const opacityQuery = roadConditionsActive ? 0.75 : 0
    const opacityGlow = roadConditionsActive ? 0.3 : 0
    if (map.current.getLayer('roads-inspect-query')) map.current.setPaintProperty('roads-inspect-query', 'line-opacity', opacityQuery)
    if (map.current.getLayer('roads-inspect-glow')) map.current.setPaintProperty('roads-inspect-glow', 'line-opacity', opacityGlow)
  }, [roadConditionsActive, ready])

  useEffect(() => {
    if (!ready || !map.current || !roadConditionsActive) return

    const handleRoadClick = (e: MapLayerMouseEvent) => {
      const features = map.current?.queryRenderedFeatures(e.point, { layers: ['roads-inspect-query'] })
      const roadFeature = features?.[0]
      if (roadFeature?.properties) {
        const props = roadFeature.properties
        const roadName = props.name || props.name_en || 'Нэргүй зам'
        const roadId = props.id || `road_${Math.floor(Math.random() * 10000)}`
        onRoadSelectRef.current?.(roadId, roadName, e.lngLat.lat, e.lngLat.lng)
      }
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!map.current || !roadConditionsActive) return
      const rect = map.current.getCanvas().getBoundingClientRect()
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const features = map.current.queryRenderedFeatures(point, { layers: ['roads-inspect-query'] })
      map.current.getCanvas().style.cursor = features.length > 0 ? 'pointer' : ''
    }
    
    map.current.on('click', 'roads-inspect-query', handleRoadClick)
    map.current.on('mousemove', handleMouseMove)
    
    return () => {
      map.current?.off('click', 'roads-inspect-query', handleRoadClick)
      map.current?.off('mousemove', handleMouseMove)
      if (map.current) map.current.getCanvas().style.cursor = ''
    }
  }, [ready, roadConditionsActive])

  const switchMapMode = () => {
    if (!map.current) return
    const nextMode = mapMode === '3d' ? '2d' : '3d'
    setMapMode(nextMode)
    map.current.easeTo({ pitch: nextMode === '3d' ? 54 : 0, bearing: nextMode === '3d' ? -18 : 0, duration: 650 })
  }


  // Report markers
  useEffect(() => {
    const currentMap = map.current
    if (!ready || !currentMap) return
    reportMarkers.current.forEach(m => m.remove())
    reportMarkers.current = reports.map(r => {
      const el = document.createElement('button'); const s = selectedReportId === r.id ? '26px' : '21px'
      el.style.cssText = `width:${s};height:${s};border-radius:50%;border:2px solid white;background:${statusColor[r.status] || categoryColor[r.category]};cursor:pointer`
      el.onclick = () => onReportSelectRef.current?.(r.id)
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([r.coordinates.lng, r.coordinates.lat]).addTo(currentMap)
    })
    return () => reportMarkers.current.forEach(m => m?.remove())
  }, [ready, reports, selectedReportId])

  // Community markers
  useEffect(() => {
    const currentMap = map.current
    if (!ready || !currentMap) return
    communityMarkers.current.forEach(m => m.remove())
    communityMarkers.current = communityMembers.map(m => {
      const el = document.createElement('button'); const s = selectedCommunityMemberId === m.id ? '31px' : '25px'
      el.textContent = m.name[0].toUpperCase(); el.style.cssText = `width:${s};height:${s};border-radius:50%;border:2px solid white;background:${communityStatusColor[m.status]};color:#06111a;cursor:pointer;font-weight:800;font-size:0.78rem`
      el.onclick = () => onCommunityMemberSelectRef.current?.(m.id)
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([m.coordinates.lng, m.coordinates.lat]).addTo(currentMap)
    })
    return () => communityMarkers.current.forEach(m => m?.remove())
  }, [communityMembers, ready, selectedCommunityMemberId])

  // Current location marker
  useEffect(() => {
    const currentMap = map.current
    if (!ready || !currentMap) return
    currentLocationMarker.current?.remove()
    if (!currentLocation) {
      currentLocationMarker.current = null
      return
    }
    const el = document.createElement('div'); el.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#4ade80;border:2px solid white;box-shadow:0 0 0 8px rgba(74,222,128,0.2)'
    currentLocationMarker.current = new maplibregl.Marker({ element: el }).setLngLat([currentLocation.lng, currentLocation.lat]).addTo(currentMap)
    return () => { currentLocationMarker.current?.remove() }
  }, [ready, currentLocation])

  useEffect(() => {
    const currentMap = map.current
    if (!ready || !currentMap) return
    postMarkers.current.forEach(m => m.remove())
    postMarkers.current = mapPosts.map(post => {
      const emoji = POST_TYPE_EMOJI[post.post_type ?? 'info'] ?? '📍'
      const color = TYPE_META[post.post_type ?? 'info']?.color ?? '#38bdf8'
      // Outer el: MapLibre controls its transform for positioning — do NOT touch el.style.transform
      const el = document.createElement('div')
      el.style.cssText = `width:40px;height:40px;cursor:pointer;pointer-events:auto;display:flex;align-items:center;justify-content:center;`
      // Inner badge: safe to animate without conflicting with MapLibre's translate
      const badge = document.createElement('div')
      badge.style.cssText = `font-size:1.3rem;line-height:1;background:rgba(10,12,18,0.85);border:1.5px solid ${color}66;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;user-select:none;transition:transform 0.15s,box-shadow 0.15s;box-shadow:0 2px 10px rgba(0,0,0,0.5)`
      badge.textContent = emoji
      badge.title = post.title ?? ''
      el.appendChild(badge)
      el.addEventListener('mouseenter', () => { badge.style.transform = 'scale(1.22)'; badge.style.boxShadow = `0 0 0 5px ${color}33,0 4px 18px rgba(0,0,0,0.6)` })
      el.addEventListener('mouseleave', () => { badge.style.transform = 'scale(1)'; badge.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)' })
      el.addEventListener('click', e => {
        e.stopPropagation()
        onPostSelectRef.current?.(post.id)
      })
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([post.lng, post.lat]).addTo(currentMap)
    })
    return () => { postMarkers.current.forEach(m => m.remove()); postMarkers.current = [] }
  }, [ready, mapPosts])

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />

      {/* Permanent bottom-right controls: 2D/3D toggle + GPS */}
      <div className="map-bottom-controls">
        <button
          type="button"
          className="glass-button"
          onClick={() => setRoadConditionsActive(!roadConditionsActive)}
          title={roadConditionsActive ? 'Замын мэдээлэл хаах' : 'Замын мэдээлэл харах'}
          style={{ 
            opacity: 1, 
            background: roadConditionsActive ? 'rgba(34, 197, 94, 0.2)' : undefined,
            borderColor: roadConditionsActive ? 'var(--primary)' : undefined,
            color: roadConditionsActive ? 'var(--primary)' : undefined,
            boxShadow: roadConditionsActive ? '0 0 10px rgba(34, 197, 94, 0.4)' : undefined
          }}
        >
          <Wrench size={16} />
        </button>
        <button
          type="button"
          className="glass-button"
          onClick={switchMapMode}
          title={mapMode === '3d' ? '2D болгох' : '3D болгох'}
          style={{ opacity: buildingsReady ? 1 : 0.5 }}
        >
          {mapMode === '3d' ? '2D' : '3D'}
        </button>
        <button
          type="button"
          className="glass-button"
          title="GPS байршил"
          onClick={() => {
            if (!navigator.geolocation) return
            navigator.geolocation.getCurrentPosition(pos => {
              const updateEvent = new CustomEvent('update-location', { 
                detail: { lat: pos.coords.latitude, lng: pos.coords.longitude } 
              });
              window.dispatchEvent(updateEvent)
            })
          }}
        >
          <Locate size={16} />
        </button>
      </div>
    </>
  )
})

MapComponent.displayName = 'MapComponent'

export default MapComponent
