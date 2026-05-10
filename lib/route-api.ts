// lib/route-api.ts
const HERE_API_KEY = process.env.NEXT_PUBLIC_HERE_API_KEY

export interface RoutePreferences {
  avoidAccidents: boolean
  avoidRoadwork: boolean
  avoidHeavyTraffic: boolean
  avoidTollRoads?: boolean
  avoidHighways?: boolean
  enableTraffic?: boolean
}

export interface RouteResult {
  coordinates: [number, number][]
  duration: number
  distance: number
  polyline: string
}

export const calculateSmartRoute = async (
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  preferences: RoutePreferences,
  reportsToAvoid?: Array<{ lat: number; lng: number; type: string; severity: string; roadId?: string }>
): Promise<RouteResult | null> => {
  if (!HERE_API_KEY) {
    console.error('HERE_API_KEY missing')
    return null
  }

  // Build URL with HERE Routing API v8
  let url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${start.lat},${start.lng}&destination=${end.lat},${end.lng}&return=summary,polyline&apikey=${HERE_API_KEY}`

  // Add traffic awareness
  if (preferences.enableTraffic) {
    url += `&traffic[enabled]=true`
  }

  // Add avoid features
  const avoidFeatures = []
  if (preferences.avoidTollRoads) avoidFeatures.push('tollRoad')
  if (preferences.avoidHighways) avoidFeatures.push('controlledAccessHighway')
  
  if (avoidFeatures.length > 0) {
    url += `&avoid[features]=${avoidFeatures.join(',')}`
  }

  // Add avoid areas from reports
  if (reportsToAvoid && reportsToAvoid.length > 0) {
    const polygon = createAvoidPolygon(reportsToAvoid)
    url += `&avoid[areas]=${polygon}`
  }

  console.log('🚗 Fetching route:', url)
  
  try {
    const response = await fetch(url)
    const data = await response.json()
    
    if (data.routes && data.routes[0]) {
      const route = data.routes[0]
      const polyline = route.polyline
      
      // Decode polyline to coordinates
      const coordinates = decodePolyline(polyline)
      
      return {
        coordinates,
        duration: route.summary.duration,
        distance: route.summary.length,
        polyline
      }
    }
    return null
  } catch (error) {
    console.error('Route calculation failed:', error)
    return null
  }
}

// Simple polyline decoder (or use @mapbox/polyline)
const decodePolyline = (encoded: string): [number, number][] => {
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

const createAvoidPolygon = (reports: Array<{ lat: number; lng: number }>) => {
  // Create a bounding box around all reports
  const lats = reports.map(r => r.lat)
  const lngs = reports.map(r => r.lng)
  const west = Math.min(...lngs) - 0.005
  const south = Math.min(...lats) - 0.005
  const east = Math.max(...lngs) + 0.005
  const north = Math.max(...lats) + 0.005
  
  return `bbox:${west},${south},${east},${north}`
}
