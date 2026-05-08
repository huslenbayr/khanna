'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  MapMouseEvent,
  StyleSpecification
} from 'maplibre-gl'

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
const CARTO_DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const MAPBOX_STREETS_SOURCE_ID = 'mapbox-streets'
const BUILDING_LAYER_ID = '3d-buildings'
const BUILDING_HEIGHT_LABEL_LAYER_ID = 'building-height-labels'
const HOTZONE_COLOR = '#f43f5e'

const buildingHeightExpression: ExpressionSpecification = ['case', ['has', 'height'], ['to-number', ['get', 'height']], 8]
const buildingBaseExpression: ExpressionSpecification = ['case', ['has', 'min_height'], ['to-number', ['get', 'min_height']], 0]

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

const MapComponent = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const miniContainer = useRef<HTMLDivElement | null>(null)
  const miniMap = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)
  const [buildingsReady, setBuildingsReady] = useState(false)

  // Naadam Stadium Coordinates (approximate Ulaanbaatar central stadium)
  const UB_STADIUM_LNG = 106.9155
  const UB_STADIUM_LAT = 47.9014
  const CAMERA_CENTER_LNG = 106.9168
  const CAMERA_CENTER_LAT = 47.9001
  const HEIGHT_MARKER_LNG = 106.91762
  const HEIGHT_MARKER_LAT = 47.89899
  const HEIGHT_MARKER_METERS = 37.2

  useEffect(() => {
    if (map.current) return // already initialized
    const mainMapElement = mapContainer.current
    const miniMapElement = miniContainer.current
    if (!mainMapElement || !miniMapElement) return

    const mainMap = new maplibregl.Map({
      container: mainMapElement,
      style: createBaseMapStyle(),
      center: [CAMERA_CENTER_LNG, CAMERA_CENTER_LAT],
      zoom: 17.1,
      pitch: 68,
      bearing: -25,
      canvasContextAttributes: { antialias: true }
    })
    map.current = mainMap

    // Add default navigation controls (zoom/rotate)
    mainMap.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right')

    mainMap.on('load', () => {
      setReady(true)

      // Stadium marker
      const el = document.createElement('div')
      el.className = 'stadium-marker'
      el.style.backgroundColor = 'var(--primary)'
      el.style.width = '20px'
      el.style.height = '20px'
      el.style.borderRadius = '50%'
      el.style.boxShadow = '0 0 12px var(--primary)'
      el.style.border = '2px solid white'

      new maplibregl.Marker({ element: el })
        .setLngLat([UB_STADIUM_LNG, UB_STADIUM_LAT])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setText('Үндэсний спортын цэнгэлдэх хүрээлэн'))
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
                  [106.917, 47.902],
                  [106.917, 47.900],
                  [106.914, 47.900],
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

      // Create mini 2D map after main map is ready
      const overviewMap = new maplibregl.Map({
        container: miniMapElement,
        style: createBaseMapStyle(),
        center: [CAMERA_CENTER_LNG, CAMERA_CENTER_LAT],
        zoom: 14,
        interactive: true // allow click to recenter; we'll disable heavy handlers below
      })
      miniMap.current = overviewMap

      // ensure the mini map has correct size immediately
      try { overviewMap.resize() } catch { /* ignore */ }

      // replicate stadium marker to mini map

      // Enable more interactive controls for 'GeoGuessr'-like free movement
      try {
        if (mainMap.dragRotate) mainMap.dragRotate.enable()
        if (mainMap.touchZoomRotate) mainMap.touchZoomRotate.enableRotation()
        if (mainMap.doubleClickZoom) mainMap.doubleClickZoom.enable()
      } catch (e) {
        // silently ignore if API not present in this build
        console.warn('Map interaction enhancement not fully supported:', e)
      }
      // create mini-map marker element
      const el2 = document.createElement('div')
      el2.style.width = '10px'
      el2.style.height = '10px'
      el2.style.borderRadius = '50%'
      el2.style.background = 'var(--primary)'
      el2.style.border = '1px solid white'
      new maplibregl.Marker({ element: el2 }).setLngLat([UB_STADIUM_LNG, UB_STADIUM_LAT]).addTo(overviewMap)

      // disable heavy interactions on mini map but keep click handling
      try {
        if (overviewMap.dragPan) overviewMap.dragPan.disable()
        if (overviewMap.scrollZoom) overviewMap.scrollZoom.disable()
        if (overviewMap.doubleClickZoom) overviewMap.doubleClickZoom.disable()
      } catch { /* ignore if not available */ }

      // sync view: when main map moves, update mini map center
      mainMap.on('move', () => {
        const center = mainMap.getCenter()
        overviewMap.setCenter(center)
      })

      // Allow clicking mini-map to re-center main map (small interaction)
      overviewMap.getCanvas().style.cursor = 'pointer'
      overviewMap.on('click', (e: MapMouseEvent) => {
        const lngLat = e.lngLat
        mainMap.flyTo({ center: [lngLat.lng, lngLat.lat], zoom: Math.max(15, mainMap.getZoom()) })
      })
    })

    // cleanup on unmount
    return () => {
      mainMap.remove()
      if (miniMap.current) miniMap.current.remove()
      map.current = null
      miniMap.current = null
    }
  }, [])

  return (
    <>
      <div ref={mapContainer} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />

      <div className="glass-panel overlay-panel animate-fade-in" style={{ top: '5.75rem', right: '2rem', width: 260, padding: '1rem', display: 'grid', gap: '0.6rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>3D өндрийн давхарга</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: buildingsReady ? 'var(--primary)' : 'var(--text-muted)' }}>
          {buildingsReady ? 'Барилгын өндөр идэвхтэй' : ready ? 'Өндрийн мэдээлэл ачаалсангүй' : 'Газрын зураг ачаалж байна'}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Барилга дээр дарж өндрийг метрээр харна.
        </div>
      </div>

      {/* Mini 2D map overlay */}
      <div className="glass-panel overlay-panel animate-fade-in" style={{ bottom: '2rem', right: '2rem', width: 220, height: 220, padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>2D жижиг газрын зураг</div>
        <div ref={miniContainer} style={{ flex: 1, borderRadius: 8, overflow: 'hidden' }} />
      </div>
    </>
  )
}

export default MapComponent
