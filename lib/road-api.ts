// lib/road-api.ts
// Road segment report API - mock first, real backend later

export interface RoadReport {
  id: string
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  type: 'accident' | 'roadwork' | 'traffic_jam' | 'hazard' | 'other'
  timestamp: Date
  reportedBy?: string
}

export interface RoadSegmentData {
  segmentId: string
  roadName: string
  coordinates: [number, number][] // lng, lat pairs
  lengthMeters: number
  reports: RoadReport[]
}

// Mock reports database
const mockReports: Record<string, RoadReport[]> = {
  // Peace Avenue segments
  'road_peace_47.918_106.917': [
    {
      id: 'rep_1',
      title: 'Хүнд замын түгжрэл',
      description: 'Өглөөний ажил хэрэгчдийн цагт хүнд түгжрэл үүсэж байна. 15-20 минут хоцрох боломжтой.',
      severity: 'high',
      type: 'traffic_jam',
      timestamp: new Date(),
      reportedBy: 'Хэрэглэгч #1234'
    },
    {
      id: 'rep_2',
      title: 'Замын нүх',
      description: 'Баруун эгнээнд том нүх үүссэн. Жолооч нар болгоомжтой явахыг анхааруулж байна.',
      severity: 'medium',
      type: 'hazard',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      reportedBy: 'Хэрэглэгч #5678'
    },
    {
      id: 'rep_3',
      title: 'Гэрлийн дохио ажиллахгүй байна',
      description: 'Уулзвар дээрх гэрлийн дохио засвартай байна. Цагдаагийн ажилтан зорчих хөдөлгөөнийг зохицуулж байна.',
      severity: 'medium',
      type: 'other',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
      reportedBy: 'Хэрэглэгч #9012'
    }
  ],
  'road_chinggis_47.915_106.910': [
    {
      id: 'rep_4',
      title: 'Зам засвар',
      description: 'Баруун эгнээ хаалттай. Зүүн эгнээгээр зорчих боломжтой. Урсгал удаашралтай.',
      severity: 'medium',
      type: 'roadwork',
      timestamp: new Date(),
      reportedBy: 'НИТХ'
    },
    {
      id: 'rep_5',
      title: 'Осол',
      description: 'Хоёр машин мөргөлдсөн. Хүнд гэмтэлгүй. Цагдаа дээр гарсан.',
      severity: 'high',
      type: 'accident',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      reportedBy: 'Хэрэглэгч #3456'
    },
    {
      id: 'rep_6',
      title: 'Гэрэлтүүлэггүй хэсэг',
      description: 'Оройн цагаар гэрэлтүүлэг ажиллахгүй байна. Жолооч нар болгоомжтой явахыг анхааруулж байна.',
      severity: 'low',
      type: 'hazard',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000)
    }
  ],
  'road_sukhbaatar_47.920_106.915': [
    {
      id: 'rep_7',
      title: 'Замын түгжрэл',
      description: 'Их дэлгүүр орчмоор хүнд түгжрэл үүсч байна. Зайлсхийхыг зөвлөж байна.',
      severity: 'high',
      type: 'traffic_jam',
      timestamp: new Date(),
      reportedBy: 'Хэрэглэгч #7890'
    },
    {
      id: 'rep_8',
      title: 'Мөсөн хучилт',
      description: 'Замын гадаргуу халтиргаатай. Өвлийн дугуйтай байхыг зөвлөж байна.',
      severity: 'medium',
      type: 'hazard',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000)
    }
  ],
  'road_olympic_47.905_106.912': [
    {
      id: 'rep_9',
      title: 'Хүнд түгжрэл',
      description: 'Төв цэнгэлдэх хүрээлэнгийн чиглэлд замын ачаалал их байна. Бусад чиглэлээр явахыг зөвлөж байна.',
      severity: 'high',
      type: 'traffic_jam',
      timestamp: new Date(),
      reportedBy: 'Хэрэглэгч #1112'
    }
  ]
}

// Generate segment ID from click position and road
const generateSegmentId = (roadId: string, lat: number, lng: number): string => {
  const latKey = Math.floor(lat * 1000)
  const lngKey = Math.floor(lng * 1000)
  return `${roadId}_${latKey}_${lngKey}`
}

// Get road name from feature properties
const getRoadName = (feature: any): string => {
  const props = feature.properties
  if (props.name) return props.name
  if (props.name_en) return props.name_en
  if (props.ref) return `${props.ref} зам`
  return 'Нэргүй зам'
}

// Fetch reports for a road segment
export const fetchReportsForSegment = async (
  roadId: string,
  lat: number,
  lng: number,
  roadName?: string
): Promise<RoadSegmentData> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300))
  
  const segmentId = generateSegmentId(roadId, lat, lng)
  const reports = mockReports[segmentId] || mockReports[Object.keys(mockReports)[0]] || []
  
  // Limit to 3 reports
  const limitedReports = reports.slice(0, 3)
  
  return {
    segmentId,
    roadName: roadName || getRoadName({ properties: { name: roadName } }),
    coordinates: [],
    lengthMeters: 500, // Default length
    reports: limitedReports
  }
}

// TODO: Replace with real API call when backend is ready
// export const fetchReportsForSegment = async (segmentId: string): Promise<RoadSegmentData> => {
//   const response = await fetch(`/api/road-segments/${segmentId}`)
//   return response.json()
// }

import type { Post } from '../app/_components/PostCard'

export const convertRoadReportsToPosts = (reports: RoadReport[], lat: number, lng: number, roadName: string): Post[] => {
  return reports.map(report => {
    let post_type = 'info'
    if (report.type === 'accident') post_type = 'safety'
    if (report.type === 'roadwork' || report.type === 'hazard') post_type = 'issue'
    
    return {
      id: report.id,
      user_id: null,
      title: report.title,
      caption: report.description,
      media_url: '',
      media_type: 'photo',
      lat: report.lat || lat,
      lng: report.lng || lng,
      location_name: roadName,
      post_type,
      created_at: report.timestamp.toISOString(),
      author: report.reportedBy ? { name: report.reportedBy, phone: null, avatar_url: null, verified: true } : null,
      comment_count: 0,
      like_count: 0,
      is_liked: false,
    } as Post
  })
}
