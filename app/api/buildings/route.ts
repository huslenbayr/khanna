import { NextRequest, NextResponse } from 'next/server'

type Bbox = {
  south: number
  west: number
  north: number
  east: number
}

type OverpassGeometryPoint = {
  lat: number
  lon: number
}

type OverpassElement = {
  id: number
  type: 'way'
  tags?: Record<string, string>
  geometry?: OverpassGeometryPoint[]
}

type BuildingFeature = {
  type: 'Feature'
  id: string
  properties: {
    id: number
    height: number
    min_height: number
    type: string
    name: string | null
  }
  geometry: {
    type: 'Polygon'
    coordinates: number[][][]
  }
}

const MAX_BBOX_SPAN_DEGREES = 0.08
const DEFAULT_BUILDING_HEIGHT_METERS = 8
const METERS_PER_LEVEL = 3

const parseNumber = (value: string | undefined) => {
  if (!value) return null
  const match = value.replace(',', '.').match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

const parseBbox = (value: string | null): Bbox | null => {
  if (!value) return null
  const [south, west, north, east] = value.split(',').map(Number)
  if (![south, west, north, east].every(Number.isFinite)) return null
  if (north <= south || east <= west) return null
  if (north - south > MAX_BBOX_SPAN_DEGREES || east - west > MAX_BBOX_SPAN_DEGREES) return null
  if (south < -90 || north > 90 || west < -180 || east > 180) return null
  return { south, west, north, east }
}

const getBuildingHeight = (tags: Record<string, string>) => {
  const explicitHeight = parseNumber(tags.height)
  if (explicitHeight !== null && explicitHeight > 0) return explicitHeight

  const levels = parseNumber(tags['building:levels'])
  if (levels !== null && levels > 0) return levels * METERS_PER_LEVEL

  return DEFAULT_BUILDING_HEIGHT_METERS
}

const getBuildingBase = (tags: Record<string, string>) => {
  const explicitMinHeight = parseNumber(tags.min_height)
  if (explicitMinHeight !== null && explicitMinHeight >= 0) return explicitMinHeight

  const minLevel = parseNumber(tags['building:min_level'])
  if (minLevel !== null && minLevel > 0) return minLevel * METERS_PER_LEVEL

  return 0
}

const toFeature = (element: OverpassElement): BuildingFeature | null => {
  const geometry = element.geometry
  if (!geometry || geometry.length < 3) return null

  const ring = geometry.map(point => [point.lon, point.lat])
  const first = ring[0]
  const last = ring[ring.length - 1]
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first)
  }

  const tags = element.tags ?? {}
  return {
    type: 'Feature',
    id: String(element.id),
    properties: {
      id: element.id,
      height: getBuildingHeight(tags),
      min_height: getBuildingBase(tags),
      type: tags.building ?? 'building',
      name: tags.name ?? null,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [ring],
    },
  }
}

export async function GET(request: NextRequest) {
  const bbox = parseBbox(request.nextUrl.searchParams.get('bbox'))
  if (!bbox) {
    return NextResponse.json({ type: 'FeatureCollection', features: [] }, { status: 400 })
  }

  const query = `
    [out:json][timeout:12];
    way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
    out body geom tags;
  `

  try {
    const overpassResponse = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'user-agent': 'KhannaWay/1.0 (building-height-map)',
      },
      body: new URLSearchParams({ data: query }),
      next: { revalidate: 300 },
    })

    if (!overpassResponse.ok) {
      return NextResponse.json({ type: 'FeatureCollection', features: [] }, { status: 502 })
    }

    const data = await overpassResponse.json() as { elements?: OverpassElement[] }
    const features = (data.elements ?? [])
      .filter(element => element.type === 'way')
      .map(toFeature)
      .filter((feature): feature is BuildingFeature => feature !== null)

    return NextResponse.json(
      { type: 'FeatureCollection', features },
      {
        headers: {
          'cache-control': 'public, s-maxage=300, stale-while-revalidate=86400',
        },
      },
    )
  } catch {
    return NextResponse.json({ type: 'FeatureCollection', features: [] }, { status: 502 })
  }
}
