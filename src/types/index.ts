// types/index.ts
export interface User {
  id: string
  email: string
  name?: string
  image?: string
}

export interface Organization {
  id: string
  name: string
  slug: string
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise'
  members: OrganizationMember[]
  integrations: Integration[]
}

export interface OrganizationMember {
  id: string
  userId: string
  organizationId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  user: User
}

export interface Integration {
  id: string
  organizationId: string
  platform: string
  status: 'active' | 'error' | 'pending'
  lastSyncAt?: Date
  createdAt: Date
}

export interface MetricData {
  current: number
  previous: number
  change: number
  trend: 'up' | 'down' | 'neutral'
}

export interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

export interface Insight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation'
  title: string
  description: string
  impactScore: number
  isRead: boolean
  createdAt: Date
}

export interface DashboardData {
  metrics: {
    revenue: MetricData
    orders: MetricData
    sessions: MetricData
    conversion: MetricData
    aov: MetricData
  }
  charts: {
    revenue_trend: ChartDataPoint[]
    traffic_sources: { source: string; sessions: number }[]
  }
  insights: Insight[]
}