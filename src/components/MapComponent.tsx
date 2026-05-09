'use client'

import { useEffect, useRef, useState } from 'react'
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
import type { CitizenReport, ReportCategory, ReportCoordinates, ReportStatus } from '../types/citizenReport'
import type { CommunityMember, CommunityStatus } from '../types/community'

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

const trafficDemoData: FeatureCollection<LineString, { level: 'low' | 'medium' | 'high' }> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { level: 'high' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [106.889, 47.914],
          [106.903, 47.916],
          [106.918, 47.918],
          [106.935, 47.920],
          [106.951, 47.923],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { level: 'medium' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [106.910, 47.930],
          [106.918, 47.922],
          [106.927, 47.913],
          [106.938, 47.903],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { level: 'low' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [106.857, 47.914],
          [106.875, 47.914],
          [106.894, 47.915],
          [106.908, 47.916],
        ],
      },
    },
  ],
}

const createBaseMapStyle = (): string | StyleSpecification => {
  if (!MAPBOX_ACCESS_TOKEN) {
    return CARTO_DARK_STYLE
  }

  return {
    version: 8,
    glyphs: `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${MAPBOX_ACCESS_TOKEN}`,
    sources: {
      mapbox: {
        type: 'raster',
        tiles: [
          `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`
        ],
        tileSize: 256,
        attribution: '© Mapbox © OpenStreetMap'
      },
      [MAPBOX_STREETS_SOURCE_ID]: {
        type: 'vector',
        tiles: [
          `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.mvt?access_token=${MAPBOX_ACCESS_TOKEN}`
        ],
        minzoom: 0,
        maxzoom: 16
      }
    },
    layers: [
      {
        id: 'mapbox',
        type: 'raster',
        source: 'mapbox'
      }
    ]
  } as StyleSpecification
}

const add3DBuildings = (targetMap: maplibregl.Map) => {
  if (!MAPBOX_ACCESS_TOKEN || targetMap.getLayer(BUILDING_LAYER_ID)) {
    return false
  }

  targetMap.addLayer({
    id: BUILDING_LAYER_ID,
    type: 'fill-extrusion',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'building',
    minzoom: 14,
    filter: ['all', ['!=', ['get', 'underground'], 'true'], ['==', ['get', 'extrude'], 'true']],
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        buildingHeightExpression,
        0,
        '#38bdf8',
        12,
        '#4ade80',
        32,
        '#f59e0b',
        70,
        '#f43f5e'
      ],
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14,
        0,
        15.25,
        buildingHeightExpression
      ],
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
      'text-field': ['concat', ['to-string', ['round', buildingHeightExpression]], ' м'],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': 11,
      'text-anchor': 'center',
      'text-allow-overlap': false,
      'symbol-placement': 'point'
    },
    paint: {
      'text-color': '#f8fafc',
      'text-halo-color': '#020617',
      'text-halo-width': 1.5,
      'text-halo-blur': 0.25
    }
  } as LayerSpecification)

  return true
}

const getRoundedHeight = (feature: MapGeoJSONFeature) => {
  const height = Number(feature?.properties?.height)
  return Number.isFinite(height) ? Math.round(height * 10) / 10 : null
}

const createHeightPopupContent = (feature: MapGeoJSONFeature) => {
  const height = getRoundedHeight(feature)
  const buildingType = typeof feature?.properties?.type === 'string' ? feature.properties.type : 'building'
  const wrapper = document.createElement('div')
  wrapper.style.display = 'grid'
  wrapper.style.gap = '0.25rem'

  const title = document.createElement('strong')
  title.textContent = 'Барилгын өндөр'

  const heightLine = document.createElement('span')
  heightLine.textContent = height === null ? 'Өндрийн мэдээлэл алга' : `${height} м`

  const typeLine = document.createElement('small')
  typeLine.style.color = '#94a3b8'
  typeLine.textContent = `Төрөл: ${buildingType}`

  wrapper.append(title, heightLine, typeLine)
  return wrapper
}

const MapComponent = ({
  reports = [],
  currentLocation = null,
  selectedReportId = null,
  onReportSelect,
  communityMembers = [],
  selectedCommunityMemberId = null,
  onCommunityMemberSelect,
}: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const reportMarkers = useRef<maplibregl.Marker[]>([])
  const communityMarkers = useRef<maplibregl.Marker[]>([])
  const currentLocationMarker = useRef<maplibregl.Marker | null>(null)
  const onReportSelectRef = useRef(onReportSelect)
  const onCommunityMemberSelectRef = useRef(onCommunityMemberSelect)
  const [ready, setReady] = useState(false)
  const [buildingsReady, setBuildingsReady] = useState(false)
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d')

  const UB_CENTER_LNG = 106.9177
  const UB_CENTER_LAT = 47.9186
  const CAMERA_CENTER_LNG = 106.9177
  const CAMERA_CENTER_LAT = 47.9186
  const HEIGHT_MARKER_LNG = 106.9187
  const HEIGHT_MARKER_LAT = 47.9123
  const HEIGHT_MARKER_METERS = 37.2

  useEffect(() => {
    onReportSelectRef.current = onReportSelect
  }, [onReportSelect])

  useEffect(() => {
    onCommunityMemberSelectRef.current = onCommunityMemberSelect
  }, [onCommunityMemberSelect])

  useEffect(() => {
    if (map.current) return // already initialized
    const mainMapElement = mapContainer.current
    if (!mainMapElement) return

    const mainMap = new maplibregl.Map({
      container: mainMapElement,
      style: createBaseMapStyle(),
      center: [CAMERA_CENTER_LNG, CAMERA_CENTER_LAT],
      zoom: 12.7,
      pitch: 54,
      bearing: -18,
      canvasContextAttributes: { antialias: true }
    })
    map.current = mainMap

    // Add default navigation controls (zoom/rotate)
    mainMap.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

      mainMap.on('load', () => {
      setReady(true)

      // City center marker
      const el = document.createElement('div')
      el.className = 'city-center-marker'
      el.style.backgroundColor = 'var(--primary)'
      el.style.width = '20px'
      el.style.height = '20px'
      el.style.borderRadius = '50%'
      el.style.boxShadow = '0 0 12px var(--primary)'
      el.style.border = '2px solid white'

      new maplibregl.Marker({ element: el })
        .setLngLat([UB_CENTER_LNG, UB_CENTER_LAT])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setText('Улаанбаатар хотын төв'))
        .addTo(mainMap)

      // Hotzone source + fill
      if (!mainMap.getSource('hotzone')) {
        mainMap.addSource('hotzone', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [106.914, 47.902],
                  [106.954, 47.924],
                  [106.938, 47.890],
                  [106.890, 47.895],
                  [106.914, 47.902]
                ]
              ]
            }
          }
        } as GeoJSONSourceSpecification)

        mainMap.addLayer({
          id: 'hotzone-layer',
          type: 'fill',
          source: 'hotzone',
          paint: {
            'fill-color': HOTZONE_COLOR,
            'fill-opacity': 0.28
          }
        })
      }

      if (!mainMap.getSource(TRAFFIC_SOURCE_ID)) {
        mainMap.addSource(TRAFFIC_SOURCE_ID, {
          type: 'geojson',
          data: trafficDemoData,
        } as GeoJSONSourceSpecification)

        mainMap.addLayer({
          id: TRAFFIC_LAYER_ID,
          type: 'line',
          source: TRAFFIC_SOURCE_ID,
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': [
              'match',
              ['get', 'level'],
              'high',
              '#ef4444',
              'medium',
              '#f59e0b',
              'low',
              '#22c55e',
              '#94a3b8',
            ],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10,
              3,
              14,
              8,
              16,
              13,
            ],
            'line-opacity': 0.86,
          },
        } as LayerSpecification)
      }

      if (add3DBuildings(mainMap)) {
        mainMap.on('click', BUILDING_LAYER_ID, (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0]
          if (!feature) return

          new maplibregl.Popup({ offset: 14 })
            .setLngLat(event.lngLat)
            .setDOMContent(createHeightPopupContent(feature))
            .addTo(mainMap)
        })

        mainMap.on('mouseenter', BUILDING_LAYER_ID, () => {
          mainMap.getCanvas().style.cursor = 'pointer'
        })

        mainMap.on('mouseleave', BUILDING_LAYER_ID, () => {
          mainMap.getCanvas().style.cursor = ''
        })

        setBuildingsReady(true)
      }

      const heightTag = document.createElement('div')
      heightTag.textContent = `${HEIGHT_MARKER_METERS} м`
      heightTag.style.padding = '0.35rem 0.55rem'
      heightTag.style.borderRadius = '999px'
      heightTag.style.background = 'rgba(15, 23, 42, 0.92)'
      heightTag.style.border = '1px solid #4ade80'
      heightTag.style.boxShadow = '0 0 16px rgba(74, 222, 128, 0.36)'
      heightTag.style.color = '#f8fafc'
      heightTag.style.fontSize = '0.78rem'
      heightTag.style.fontWeight = '700'
      heightTag.style.whiteSpace = 'nowrap'

      new maplibregl.Marker({ element: heightTag, anchor: 'bottom', offset: [0, -10] })
        .setLngLat([HEIGHT_MARKER_LNG, HEIGHT_MARKER_LAT])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText(`Барилгын өндөр: ${HEIGHT_MARKER_METERS} метр`))
        .addTo(mainMap)

      // Enable more interactive controls for 'GeoGuessr'-like free movement
      try {
        if (mainMap.dragRotate) mainMap.dragRotate.enable()
        if (mainMap.touchZoomRotate) mainMap.touchZoomRotate.enableRotation()
        if (mainMap.doubleClickZoom) mainMap.doubleClickZoom.enable()
      } catch (e) {
        // silently ignore if API not present in this build
        console.warn('Map interaction enhancement not fully supported:', e)
      }
    })

    // cleanup on unmount
    return () => {
      reportMarkers.current.forEach(marker => marker.remove())
      communityMarkers.current.forEach(marker => marker.remove())
      currentLocationMarker.current?.remove()
      mainMap.remove()
      map.current = null
    }
  }, [])

  const switchMapMode = () => {
    if (!map.current) return

    const nextMode = mapMode === '3d' ? '2d' : '3d'
    setMapMode(nextMode)
    map.current.easeTo({
      pitch: nextMode === '3d' ? 54 : 0,
      bearing: nextMode === '3d' ? -18 : 0,
      duration: 650,
    })
  }

  useEffect(() => {
    if (!ready || !map.current) return

    reportMarkers.current.forEach(marker => marker.remove())
    reportMarkers.current = reports.map(report => {
      const markerElement = document.createElement('button')
      markerElement.type = 'button'
      markerElement.setAttribute('aria-label', `${report.category} report marker`)
      markerElement.style.width = selectedReportId === report.id ? '26px' : '21px'
      markerElement.style.height = selectedReportId === report.id ? '26px' : '21px'
      markerElement.style.borderRadius = '50%'
      markerElement.style.border = selectedReportId === report.id ? '3px solid white' : '2px solid white'
      markerElement.style.background = statusColor[report.status] || categoryColor[report.category]
      markerElement.style.boxShadow = selectedReportId === report.id
        ? '0 0 0 6px rgba(74, 222, 128, 0.22), 0 0 18px rgba(74, 222, 128, 0.54)'
        : '0 0 14px rgba(15, 23, 42, 0.45)'
      markerElement.style.cursor = 'pointer'
      markerElement.style.padding = '0'

      markerElement.addEventListener('click', event => {
        event.stopPropagation()
        onReportSelectRef.current?.(report.id)
      })

      return new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([report.coordinates.lng, report.coordinates.lat])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText(`${report.category} • ${report.locationText}`))
        .addTo(map.current as maplibregl.Map)
    })
  }, [ready, reports, selectedReportId])

  useEffect(() => {
    if (!ready || !map.current) return

    communityMarkers.current.forEach(marker => marker.remove())
    communityMarkers.current = communityMembers.map(member => {
      const markerElement = document.createElement('button')
      markerElement.type = 'button'
      markerElement.setAttribute('aria-label', `${member.name} location marker`)
      markerElement.textContent = member.name.slice(0, 1).toUpperCase()
      markerElement.style.width = selectedCommunityMemberId === member.id ? '31px' : '25px'
      markerElement.style.height = selectedCommunityMemberId === member.id ? '31px' : '25px'
      markerElement.style.borderRadius = '50%'
      markerElement.style.border = selectedCommunityMemberId === member.id ? '3px solid white' : '2px solid white'
      markerElement.style.background = communityStatusColor[member.status]
      markerElement.style.boxShadow = selectedCommunityMemberId === member.id
        ? '0 0 0 7px rgba(59, 130, 246, 0.2), 0 0 18px rgba(59, 130, 246, 0.54)'
        : '0 0 14px rgba(15, 23, 42, 0.45)'
      markerElement.style.color = '#06111a'
      markerElement.style.cursor = 'pointer'
      markerElement.style.padding = '0'
      markerElement.style.fontWeight = '800'
      markerElement.style.fontSize = '0.78rem'

      markerElement.addEventListener('click', event => {
        event.stopPropagation()
        onCommunityMemberSelectRef.current?.(member.id)
      })

      return new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([member.coordinates.lng, member.coordinates.lat])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText(`${member.name} • ${member.location}`))
        .addTo(map.current as maplibregl.Map)
    })
  }, [communityMembers, ready, selectedCommunityMemberId])

  useEffect(() => {
    if (!ready || !map.current) return

    currentLocationMarker.current?.remove()
    if (!currentLocation) return

    const pointElement = document.createElement('div')
    pointElement.style.width = '20px'
    pointElement.style.height = '20px'
    pointElement.style.borderRadius = '50%'
    pointElement.style.background = 'rgba(74, 222, 128, 0.9)'
    pointElement.style.border = '2px solid white'
    pointElement.style.boxShadow = '0 0 0 8px rgba(74, 222, 128, 0.16)'

    currentLocationMarker.current = new maplibregl.Marker({ element: pointElement, anchor: 'center' })
      .setLngLat([currentLocation.lng, currentLocation.lat])
      .addTo(map.current)
  }, [ready, currentLocation])

  return (
    <>
      <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      <div className="glass-panel overlay-panel animate-fade-in" style={{ top: '5.75rem', right: '2rem', width: 260, padding: '1rem', display: 'grid', gap: '0.6rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Улаанбаатар map view</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: buildingsReady ? 'var(--primary)' : 'var(--text-muted)' }}>
          {mapMode === '3d' ? '3D харагдац' : '2D харагдац'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {buildingsReady ? 'Барилга дээр дарж өндрийг метрээр харна.' : ready ? 'Газрын зураг идэвхтэй.' : 'Газрын зураг ачаалж байна.'}
        </div>
        <button className="glass-button active" type="button" onClick={switchMapMode} style={{ justifyContent: 'center', padding: '0.62rem 0.75rem' }}>
          {mapMode === '3d' ? '2D болгох' : '3D болгох'}
        </button>
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          <span style={{ width: 18, height: 4, borderRadius: 999, background: '#ef4444' }} />
          <span>Замын ачаалал demo</span>
        </div>
      </div>
    </>
  )
}

export default MapComponent
