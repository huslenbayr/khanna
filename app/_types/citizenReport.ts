export type ReportCategory =
  | 'Мөстсөн / халтиргаатай хэсэг'
  | 'Замын нүх'
  | 'Эвдэрсэн гэрэл'
  | 'Хог / бохирдол'
  | 'Аюултай явган зам'
  | 'Замын хөдөлгөөний асуудал'
  | 'Бусад'

export type ReportStatus = 'Received' | 'Verified' | 'In Progress' | 'Resolved'

export type ReportCoordinates = {
  lat: number
  lng: number
}

export type ReportMedia = {
  type: 'image' | 'video'
  url: string
  fileName: string
}

export type CitizenReport = {
  id: string
  category: ReportCategory
  description: string
  district: string
  locationText: string
  coordinates: ReportCoordinates
  media: ReportMedia[]
  comments: string
  status: ReportStatus
  createdAt: string
  createdBy: string
}

export const reportCategories: ReportCategory[] = [
  'Мөстсөн / халтиргаатай хэсэг',
  'Замын нүх',
  'Эвдэрсэн гэрэл',
  'Хог / бохирдол',
  'Аюултай явган зам',
  'Замын хөдөлгөөний асуудал',
  'Бусад',
]

export const reportStatuses: ReportStatus[] = ['Received', 'Verified', 'In Progress', 'Resolved']
