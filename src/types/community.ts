export type CommunityStatus = 'Онлайн' | 'Офлайн' | 'Хамт байна'

export type CommunityRole = 'Гэр бүлийн гишүүн' | 'Найз' | 'Хөрш' | 'Хамт яваа'

export type CommunityMember = {
  id: number
  name: string
  role: CommunityRole
  phone: string
  location: string
  coordinates: {
    lat: number
    lng: number
  }
  status: CommunityStatus
  updatedAt: string
}
