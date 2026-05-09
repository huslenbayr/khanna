import type { ReactNode } from 'react'
import Link from 'next/link'
import { Map, AlertTriangle, Users, Camera, Activity, BookOpen, Globe2 } from 'lucide-react'
import heroImg from '../assets/hero.png'

const Home = () => {
  return (
    <div className="home-page">
      <section className="home-hero glass-panel">
        <div className="hero-left">
          <h1>
            KhannaWay — <span className="neon">Ulaanbaatar City Ops</span>
          </h1>
          <p className="hero-desc">
            Улаанбаатарын зам, үйлчилгээ, багийн зохион байгуулалт, хотын видео мэдээлэл, аюулгүй байдлын хяналтыг нэг 3D map дээр нэгтгэнэ.
          </p>

          <div className="hero-ctas">
            <Link href="/city"><button className="cta-primary">Хотын мэдээлэл харах</button></Link>
            <Link href="/dashboard"><button className="cta-ghost">Dashboard нээх</button></Link>
          </div>

          <div className="feature-inline">
            <div><Globe2 size={18} /> MN + EN guide</div>
            <div><Map size={18} /> 3D map</div>
            <div><Users size={18} /> Team tracker</div>
          </div>
        </div>

        <div className="hero-right">
          <div className="mock-device glass-panel">
            <img src={heroImg.src} alt="hero" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
          </div>
        </div>
      </section>

      <section className="home-features">
        <h2>Улаанбаатар хотын үндсэн боломжууд</h2>
        <div className="features-grid">
          <Card icon={<BookOpen />} title="UB City Guide">Монгол/Англи тайлбар, үйлчилгээний зөвлөмж, дүүргийн мэдээллийг category-аар оруулна.</Card>
          <Card icon={<Map />} title="3D Map & POIs">Улаанбаатарын дүүрэг, тусламжийн цэг, эрсдэлтэй бүсүүдийг газрын зураг дээр харуулна.</Card>
          <Card icon={<AlertTriangle />} title="Incident Reports">Дэд бүтэц, crowd control, аюулгүй байдлын тайланг urgency level-ээр ангилна.</Card>
          <Card icon={<Users />} title="Team Tracker">Хариуцсан баг, ахлагч, утас, байршил, төлөвийг хурдан нэмнэ.</Card>
          <Card icon={<Camera />} title="Citizen Media Reports">Иргэд зураг/бичлэг хавсаргаж байршилтай report үүсгэнэ.</Card>
          <Card icon={<Activity />} title="Hot Zones">Зочдын бөөгнөрөл, эрсдэлтэй хэсгийг real-time хянахад бэлэн.</Card>
        </div>
      </section>

      <footer style={{ padding: '2rem 3rem', color: 'var(--text-muted)' }}>
        Built for Ulaanbaatar city operations • Монгол + English • Live command center
      </footer>
    </div>
  )
}

type CardProps = {
  icon: ReactNode
  title: string
  children: ReactNode
}

const Card = ({ icon, title, children }: CardProps) => (
  <div className="feature-card glass-panel">
    <div className="card-icon">{icon}</div>
    <div>
      <div className="card-title">{title}</div>
      <div className="card-desc">{children}</div>
    </div>
  </div>
)

export default Home
