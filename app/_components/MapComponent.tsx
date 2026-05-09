'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  StyleSpecification
} from 'maplibre-gl'
import EventCard from './EventCard'

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
const CARTO_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const MAPBOX_STREETS_SOURCE_ID = 'mapbox-streets'
const BUILDING_LAYER_ID = '3d-buildings'
const BUILDING_HEIGHT_LABEL_LAYER_ID = 'building-height-labels'
const HOTZONE_COLOR = '#f43f5e'

// ==================== STYLE EXPRESSIONS ====================

const buildingHeightExpression: ExpressionSpecification = [
  'case',
  ['has', 'height'],
  ['to-number', ['get', 'height']],
  8
]

const buildingBaseExpression: ExpressionSpecification = [
  'case',
  ['has', 'min_height'],
  ['to-number', ['get', 'min_height']],
  0
]

// ==================== MAP STYLE ====================

const createBaseMapStyle = (): string | StyleSpecification => {
  if (!MAPBOX_ACCESS_TOKEN) return CARTO_DARK_STYLE

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
    layers: [{ id: 'mapbox', type: 'raster', source: 'mapbox' }]
  } as StyleSpecification
}

// ==================== 3D BUILDINGS ====================

const add3DBuildings = (map: maplibregl.Map) => {
  if (!MAPBOX_ACCESS_TOKEN || map.getLayer(BUILDING_LAYER_ID)) return

  map.addLayer({
    id: BUILDING_LAYER_ID,
    type: 'fill-extrusion',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'building',
    minzoom: 14,
    filter: [
      'all',
      ['!=', ['get', 'underground'], 'true'],
      ['==', ['get', 'extrude'], 'true']
    ],
    paint: {
      'fill-extrusion-color': [
        'interpolate',
        ['linear'],
        buildingHeightExpression,
        0, '#38bdf8',
        12, '#4ade80',
        32, '#f59e0b',
        70, '#f43f5e'
      ],
      'fill-extrusion-height': [
        'interpolate',
        ['linear'],
        ['zoom'],
        14, 0,
        15.25, buildingHeightExpression
      ],
      'fill-extrusion-base': buildingBaseExpression,
      'fill-extrusion-opacity': 0.86
    }
  } as LayerSpecification)

  map.addLayer({
    id: BUILDING_HEIGHT_LABEL_LAYER_ID,
    type: 'symbol',
    source: MAPBOX_STREETS_SOURCE_ID,
    'source-layer': 'building',
    minzoom: 16,
    filter: [
      'all',
      ['!=', ['get', 'underground'], 'true'],
      ['==', ['get', 'extrude'], 'true']
    ],
    layout: {
      'text-field': ['concat', ['to-string', ['round', buildingHeightExpression]], ' м'],
      'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
      'text-size': 11,
      'text-anchor': 'center',
      'symbol-placement': 'point'
    },
    paint: {
      'text-color': '#f8fafc',
      'text-halo-color': '#020617',
      'text-halo-width': 1.5,
      'text-halo-blur': 0.25
    }
  } as LayerSpecification)
}

// ==================== POPUP ====================

const createHeightPopupContent = (feature: MapGeoJSONFeature) => {
  const height = Number(feature?.properties?.height)
  const rounded = Number.isFinite(height)
    ? Math.round(height * 10) / 10
    : null

  const type = typeof feature?.properties?.type === 'string'
    ? feature.properties.type
    : 'building'

  const el = document.createElement('div')
  el.style.cssText = 'display:grid;gap:0.25rem'

  const title = document.createElement('strong')
  title.textContent = 'Барилгын өндөр'

  const value = document.createElement('span')
  value.textContent = rounded === null ? 'Өндрийн мэдээлэл алга' : `${rounded} м`

  const meta = document.createElement('small')
  meta.style.color = '#94a3b8'
  meta.textContent = `Төрөл: ${type}`

  el.append(title, value, meta)
  return el
}

// ==================== TYPES ====================

export interface EventData {
  id: string
  name: string
  dateTime: string
  description: string
  type?: 'music' | 'tech' | 'art' | 'sports' | 'default'
}

export type GetEventDataFunction = (eventId: string) => Promise<EventData>

interface EventMarker {
  id: string
  lat: number
  lng: number
  type?: string
  marker: maplibregl.Marker
}

interface MapComponentProps {
  events?: Array<{ id: string; lat: number; lng: number; type?: string }>
}

// ==================== COLORS ====================

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

const getShadow = (type?: string) => {
  const c = getEventDotColor(type)
  return c + '99'
}

// ==================== MOCK DATA ====================

const mockGetEventData: GetEventDataFunction = async (id) => {
  await new Promise(r => setTimeout(r, 200))

  return {
    id,
    name: 'Event',
    dateTime: 'TBD',
    description: 'No description available',
    type: 'default'
  }
}

// ==================== COMPONENT ====================

const MapComponent = forwardRef(function MapComponent(
  { events = [] }: MapComponentProps,
  ref
) {

  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<maplibregl.Map | null>(null)

  const markers = useRef<Map<string, EventMarker>>(new Map())
  const getEventDataFn = useRef<GetEventDataFunction>(mockGetEventData)

  const [activeEvent, setActiveEvent] =
    useState<{ eventId: string; x: number; y: number } | null>(null)

  const UB = { lng: 106.9155, lat: 47.9014 }
  const CENTER = { lng: 106.9168, lat: 47.9001 }

  // ==================== SAFE MARKERS (FIXED DRIFT) ====================

  const createEventMarkers = (
    list: Array<{ id: string; lat: number; lng: number; type?: string }>,
    mapInstance: maplibregl.Map
  ) => {

    markers.current.forEach(m => m.marker.remove())
    markers.current.clear()

    list.forEach(ev => {

      const color = getEventDotColor(ev.type)
      const shadow = getShadow(ev.type)

      const el = document.createElement('div')

      // ❗ FIX: NO transform animations (this caused drift illusion)
      el.style.cssText = `
        width: 14px;
        height: 14px;
        background: ${color};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 10px ${shadow};
        cursor: pointer;
        transition: box-shadow 0.2s ease;
        will-change: transform;
      `

      // SAFE hover (no scaling = no drift)
      el.addEventListener('mouseenter', () => {
        el.style.boxShadow = `0 0 18px ${shadow}`
      })

      el.addEventListener('mouseleave', () => {
        el.style.boxShadow = `0 0 10px ${shadow}`
      })

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        pitchAlignment: 'map',
        rotationAlignment: 'map'
      })
        .setLngLat([ev.lng, ev.lat])
        .addTo(mapInstance)

      el.addEventListener('click', (e) => {
        e.stopPropagation()

        const p = mapInstance.project([ev.lng, ev.lat])

        setActiveEvent({
          eventId: ev.id,
          x: p.x,
          y: p.y
        })
      })

      markers.current.set(ev.id, {
        id: ev.id,
        lat: ev.lat,
        lng: ev.lng,
        type: ev.type,
        marker
      })
    })
  }

  const updateEvents = (e: typeof events) => {
    if (map.current?.loaded()) {
      createEventMarkers(e, map.current)
    }
  }

  const setGetEventDataFunction = (fn: GetEventDataFunction) => {
    getEventDataFn.current = fn
  }

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng) => {
      map.current?.flyTo({
        center: [lng, lat],
        zoom: 17,
        pitch: 60,
        duration: 1200
      })
      setActiveEvent(null)
    },
    updateEvents,
    setGetEventDataFunction
  }))

  // ==================== INIT MAP ====================

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: createBaseMapStyle(),
      center: [CENTER.lng, CENTER.lat],
      zoom: 17,
      pitch: 68,
      bearing: -25,
      pitchWithRotate: true
    })

    map.current = m

    m.addControl(new maplibregl.NavigationControl(), 'top-left')

    m.on('load', () => {
      add3DBuildings(m)

      const el = document.createElement('div')
      el.style.cssText = `
        width:20px;
        height:20px;
        border-radius:50%;
        background:#f43f5e;
        border:2px solid white;
        box-shadow:0 0 12px rgba(244,63,94,0.6);
      `

      new maplibregl.Marker({ element: el })
        .setLngLat([UB.lng, UB.lat])
        .setPopup(new maplibregl.Popup().setText('Үндэсний спортын цэнгэлдэх хүрээлэн'))
        .addTo(m)

      if (events.length) createEventMarkers(events, m)
    })

    return () => {
      markers.current.forEach(m => m.marker.remove())
      markers.current.clear()
      m.remove()
      map.current = null
    }
  }, [])

  // update events
  useEffect(() => {
    if (map.current?.loaded()) {
      createEventMarkers(events, map.current)
    }
  }, [events])

  // keep card synced
  useEffect(() => {
    const m = map.current
    if (!m) return

    const update = () => {
      if (!activeEvent) return
      const marker = markers.current.get(activeEvent.eventId)
      if (!marker) return

      const p = m.project([marker.lng, marker.lat])
      setActiveEvent(v => v ? { ...v, x: p.x, y: p.y } : null)
    }

    m.on('move', update)
    return () => m.off('move', update)
  }, [activeEvent])

  return (
    <>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      {activeEvent && (
        <EventCard
          eventId={activeEvent.eventId}
          x={activeEvent.x}
          y={activeEvent.y}
          onClose={() => setActiveEvent(null)}
          onThreeDotClick={(id) => {
            console.log(id)
            setActiveEvent(null)
          }}
        />
      )}
    </>
  )
})

export default MapComponent
