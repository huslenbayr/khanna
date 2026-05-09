import mongoose, { Schema, type Document, type Model } from 'mongoose'

/* ─────────────── TypeScript Interfaces ─────────────── */

/** GeoJSON Point — MongoDB-ийн 2dsphere index-д зориулсан */
export interface ILocation {
  type: 'Point'
  coordinates: [longitude: number, latitude: number]
}

/** Before/After зургийн URL */
export interface IReportImages {
  before: string
  after?: string
}

/** Report статусын утгууд */
export type ReportStatus = 'Pending' | 'In-Progress' | 'Fixed'

/** Иргэдийн баталгаажуулалтын нэг бичлэг */
export interface IVerification {
  userId: string
  verifiedAt: Date
}

/** Report document-ийн бүтэц */
export interface IReport extends Document {
  /** Мэдээллийн гарчиг */
  title: string
  /** Дэлгэрэнгүй тайлбар */
  description: string
  /** Ангилал — дэд бүтэц, аюулгүй байдал, засвар г.м. */
  category: string
  /** GeoJSON байршил (Long / Lat) */
  location: ILocation
  /** Before / After зургийн URL-ууд */
  images: IReportImages
  /** AI-аар тооцсон чухлын оноо (0–100) */
  careScore: number
  /** Мэдээллийн одоогийн төлөв */
  status: ReportStatus
  /** Иргэдийн баталгаажуулалтын жагсаалт */
  verifications: IVerification[]
  /** Нийт баталгаажуулалтын тоо (virtual) */
  verificationCount: number
  /** Мэдээллийг оруулсан хэрэглэгчийн ID */
  reportedBy: string
  /** Үүсгэсэн огноо */
  createdAt: Date
  /** Шинэчилсэн огноо */
  updatedAt: Date
}

/* ─────────────── Sub-schemas ─────────────── */

const LocationSchema = new Schema<ILocation>(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords: number[]) =>
          coords.length === 2 &&
          coords[0] >= -180 && coords[0] <= 180 &&
          coords[1] >= -90 && coords[1] <= 90,
        message: 'coordinates нь [longitude, latitude] байх ёстой.',
      },
    },
  },
  { _id: false }
)

const ImagesSchema = new Schema<IReportImages>(
  {
    before: {
      type: String,
      required: [true, 'Before зургийн URL заавал шаардлагатай.'],
    },
    after: {
      type: String,
      default: '',
    },
  },
  { _id: false }
)

const VerificationSchema = new Schema<IVerification>(
  {
    userId: {
      type: String,
      required: true,
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
)

/* ─────────────── Main Report Schema ─────────────── */

const ReportSchema = new Schema<IReport>(
  {
    title: {
      type: String,
      required: [true, 'Мэдээллийн гарчиг заавал шаардлагатай.'],
      trim: true,
      maxlength: [200, 'Гарчиг 200 тэмдэгтээс хэтрэх ёсгүй.'],
    },

    description: {
      type: String,
      required: [true, 'Тайлбар заавал шаардлагатай.'],
      trim: true,
      maxlength: [2000, 'Тайлбар 2000 тэмдэгтээс хэтрэх ёсгүй.'],
    },

    category: {
      type: String,
      required: true,
      trim: true,
      default: 'Ерөнхий',
    },

    location: {
      type: LocationSchema,
      required: [true, 'Байршил (location) заавал шаардлагатай.'],
    },

    images: {
      type: ImagesSchema,
      required: [true, 'Зургийн мэдээлэл заавал шаардлагатай.'],
    },

    careScore: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Care Score 0-ээс бага байж болохгүй.'],
      max: [100, 'Care Score 100-аас их байж болохгүй.'],
    },

    status: {
      type: String,
      enum: {
        values: ['Pending', 'In-Progress', 'Fixed'],
        message: 'Статус нь Pending, In-Progress, Fixed-ийн аль нэг байх ёстой.',
      },
      default: 'Pending',
    },

    verifications: {
      type: [VerificationSchema],
      default: [],
    },

    reportedBy: {
      type: String,
      required: [true, 'Мэдээлэл оруулсан хэрэглэгчийн ID заавал шаардлагатай.'],
    },
  },
  {
    timestamps: true,
  }
)

/* ─────────────── Indexes ─────────────── */

/** Газарзүйн хайлт — ойролцоох мэдээллүүдийг хурдан олох */
ReportSchema.index({ location: '2dsphere' })

/** Статус + careScore-аар эрэмбэлж, dashboard-д хурдан харуулах */
ReportSchema.index({ status: 1, careScore: -1 })

/** Хэрэглэгчийн мэдээллийг хурдан татах */
ReportSchema.index({ reportedBy: 1, createdAt: -1 })

/* ─────────────── Virtual: verificationCount ─────────────── */

ReportSchema.virtual('verificationCount').get(function (this: IReport) {
  return this.verifications.length
})

/** JSON / Object руу хөрвүүлэхэд virtual талбарууд орно */
ReportSchema.set('toJSON', { virtuals: true })
ReportSchema.set('toObject', { virtuals: true })

/* ─────────────── Export Model ─────────────── */

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema)

export default Report
