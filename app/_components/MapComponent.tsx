'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type {
  ExpressionSpecification,
  GeoJSONSourceSpecification,
  LayerSpecification,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
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
  if (!MAPBOX_ACCESS_TOKEN) return CARTO_DARK_STYLE
  return {
    version: 8,
    glyphs: `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${MAPBOX_ACCESS_TOKEN}`,
    sources: {
      mapbox: {
        type: 'raster',
        tiles: [`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${MAPBOX_ACCESS_TOKEN}`],
        tileSize: 256,
        attribution: '© Mapbox © OpenStreetMap',
      },
      [MAPBOX_STREETS_SOURCE_ID]: {
        type: 'vector',
        tiles: [`https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.mvt?access_token=${MAPBOX_ACCESS_TOKEN}`],
        minzoom: 0,
        maxzoom: 16,
      },
    },
    layers: [{ id: 'mapbox', type: 'raster', source: 'mapbox' }],
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
      'fill-extrusion-opacity': 0.86,
    },
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
      'symbol-placement': 'point',
    },
    paint: {
      'text-color': '#f8fafc',
      'text-halo-color': '#020617',
      'text-halo-width': 1.5,
      'text-halo-blur': 0.25,
    },
  } as LayerSpecification)
}

const createHeightPopupContent = (feature: MapGeoJSONFeature) => {
  const height = Number(feature?.properties?.height)
  const rounded = Number.isFinite(height) ? Math.round(height * 10) / 10 : null
  const buildingType = typeof feature?.properties?.type === 'string' ? feature.properties.type : 'building'
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'display:grid;gap:0.25rem'
  const t = document.createElement('strong')
  t.textContent = 'Барилгын өндөр'
  const h = document.createElement('span')
  h.textContent = rounded === null ? 'Өндрийн мэдээлэл алга' : `${rounded} м`
  const s = document.createElement('small')
  s.style.color = '#94a3b8'
  s.textContent = `Төрөл: ${buildingType}`
  wrapper.append(t, h, s)
  return wrapper
}

export type MapHandle = { flyTo: (lat: number, lng: number) => void }

const MapComponent = forwardRef<MapHandle>(function MapComponent(_, ref) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<maplibregl.Map | null>(null)

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng) => {
      map.current?.flyTo({ center: [lng, lat], zoom: 17, pitch: 60, duration: 1200 })
    },
  }))

  const UB_STADIUM_LNG = 106.9155
  const UB_STADIUM_LAT = 47.9014
  const CAMERA_CENTER_LNG = 106.9168
  const CAMERA_CENTER_LAT = 47.9001
  const HEIGHT_MARKER_LNG = 106.91762
  const HEIGHT_MARKER_LAT = 47.89899
  const HEIGHT_MARKER_METERS = 37.2

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    const mainMap = new maplibregl.Map({
      container: mapContainer.current,
      style: createBaseMapStyle(),
      center: [CAMERA_CENTER_LNG, CAMERA_CENTER_LAT],
      zoom: 17.1,
      pitch: 68,
      bearing: -25,
      canvasContextAttributes: { antialias: true },
    })
    map.current = mainMap

    mainMap.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left')

    mainMap.on('load', () => {
      // Stadium marker
      const el = document.createElement('div')
      el.style.cssText = `width:20px;height:20px;border-radius:50%;background:var(--primary);box-shadow:0 0 12px var(--primary);border:2px solid white`
      new maplibregl.Marker({ element: el })
        .setLngLat([UB_STADIUM_LNG, UB_STADIUM_LAT])
        .setPopup(new maplibregl.Popup({ offset: 25 }).setText('Үндэсний спортын цэнгэлдэх хүрээлэн'))
        .addTo(mainMap)

      // Hotzone
      if (!mainMap.getSource('hotzone')) {
        mainMap.addSource('hotzone', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [[[106.914, 47.902], [106.917, 47.902], [106.917, 47.900], [106.914, 47.900], [106.914, 47.902]]],
            },
          },
        } as GeoJSONSourceSpecification)
        mainMap.addLayer({ id: 'hotzone-layer', type: 'fill', source: 'hotzone', paint: { 'fill-color': HOTZONE_COLOR, 'fill-opacity': 0.28 } })
      }

      add3DBuildings(mainMap)

      mainMap.on('click', BUILDING_LAYER_ID, (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        if (!feature) return
        new maplibregl.Popup({ offset: 14 })
          .setLngLat(event.lngLat)
          .setDOMContent(createHeightPopupContent(feature))
          .addTo(mainMap)
      })
      mainMap.on('mouseenter', BUILDING_LAYER_ID, () => { mainMap.getCanvas().style.cursor = 'pointer' })
      mainMap.on('mouseleave', BUILDING_LAYER_ID, () => { mainMap.getCanvas().style.cursor = '' })

      // Height tag marker
      const heightTag = document.createElement('div')
      heightTag.textContent = `${HEIGHT_MARKER_METERS} м`
      heightTag.style.cssText = `padding:0.35rem 0.55rem;border-radius:999px;background:rgba(15,23,42,0.92);border:1px solid #4ade80;box-shadow:0 0 16px rgba(74,222,128,0.36);color:#f8fafc;font-size:0.78rem;font-weight:700;white-space:nowrap`
      new maplibregl.Marker({ element: heightTag, anchor: 'bottom', offset: [0, -10] })
        .setLngLat([HEIGHT_MARKER_LNG, HEIGHT_MARKER_LAT])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText(`Барилгын өндөр: ${HEIGHT_MARKER_METERS} метр`))
        .addTo(mainMap)

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

  return <div ref={mapContainer} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }} />
})

export default MapComponent
