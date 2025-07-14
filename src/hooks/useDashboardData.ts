// src/hooks/useDashboardData.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'

export interface DashboardMetrics {
  revenue: {
    current: number
    previous: number
    change: number
    changePercent: number
    trend: 'up' | 'down' | 'neutral'
  }
  orders: {
    current: number
    previous: number
    change: number
    changePercent: number
    trend: 'up' | 'down' | 'neutral'
  }
  customers: {
    current: number
    previous: number
    change: number
    changePercent: number
    trend: 'up' | 'down' | 'neutral'
  }
  conversionRate: {
    current: number
    previous: number
    change: number
    changePercent: number
    trend: 'up' | 'down' | 'neutral'
  }
  averageOrderValue: {
    current: number
    previous: number
    change: number
    changePercent: number
    trend: 'up' | 'down' | 'neutral'
  }
  sessions: {
    current: number
    previous: number
    change: number
    changePercent: number
    trend: 'up' | 'down' | 'neutral'
  }
}

export interface DashboardIntegration {
  id: string
  platform: string
  platformAccountId: string | null
  status: 'active' | 'inactive' | 'error' | 'syncing'
  lastSyncAt: string | null
  dataPointsCount: number
}

export interface DashboardInsight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation'
  title: string
  description: string
  impactScore: number
  isRead: boolean
  createdAt: string
  metadata: Record<string, any>
}

export interface DashboardData {
  metrics: DashboardMetrics
  integrations: DashboardIntegration[]
  insights: DashboardInsight[]
  hasRealData: boolean
  message: string
  lastUpdated: string
}

interface UseDashboardDataReturn {
  data: DashboardData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  markInsightAsRead: (insightId: string) => Promise<void>
}

const SAMPLE_DATA: DashboardData = {
  metrics: {
    revenue: {
      current: 45670.89,
      previous: 38920.45,
      change: 6750.44,
      changePercent: 17.3,
      trend: 'up'
    },
    orders: {
      current: 342,
      previous: 289,
      change: 53,
      changePercent: 18.3,
      trend: 'up'
    },
    customers: {
      current: 234,
      previous: 198,
      change: 36,
      changePercent: 18.2,
      trend: 'up'
    },
    conversionRate: {
      current: 3.42,
      previous: 3.18,
      change: 0.24,
      changePercent: 7.5,
      trend: 'up'
    },
    averageOrderValue: {
      current: 133.45,
      previous: 134.71,
      change: -1.26,
      changePercent: -0.9,
      trend: 'down'
    },
    sessions: {
      current: 9998,
      previous: 9087,
      change: 911,
      changePercent: 10.0,
      trend: 'up'
    }
  },
  integrations: [
    {
      id: 'sample-shopify',
      platform: 'shopify',
      platformAccountId: 'demo-store.myshopify.com',
      status: 'active',
      lastSyncAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      dataPointsCount: 1250
    },
    {
      id: 'sample-stripe',
      platform: 'stripe',
      platformAccountId: 'acct_demo123',
      status: 'active',
      lastSyncAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      dataPointsCount: 890
    }
  ],
  insights: [
    {
      id: 'insight-1',
      type: 'trend',
      title: 'Revenue growth accelerating',
      description: 'Your revenue has increased by 17.3% compared to last month, outpacing your average growth rate of 12%.',
      impactScore: 8,
      isRead: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      metadata: { category: 'revenue', period: '30d' }
    },
    {
      id: 'insight-2',
      type: 'recommendation',
      title: 'Optimize average order value',
      description: 'Consider implementing bundle recommendations. Stores similar to yours see 15% AOV increase with product bundling.',
      impactScore: 6,
      isRead: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      metadata: { category: 'optimization', type: 'bundling' }
    },
    {
      id: 'insight-3',
      type: 'anomaly',
      title: 'Unusual spike in mobile traffic',
      description: 'Mobile sessions increased 34% yesterday, significantly higher than typical patterns. Investigation recommended.',
      impactScore: 5,
      isRead: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: { category: 'traffic', source: 'mobile' }
    }
  ],
  hasRealData: false,
  message: 'Connect your first integration to see real data',
  lastUpdated: new Date().toISOString()
}

export function useDashboardData(organizationId?: string): UseDashboardDataReturn {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (!session?.user?.id || !organizationId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/dashboard/${organizationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          // Organization not found or no access
          throw new Error('Organization not found or access denied')
        }
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`)
      }

      const dashboardData = await response.json()
      
      // Check if we have real data or should show sample data
      const hasIntegrations = dashboardData.integrations?.length > 0
      const hasDataPoints = dashboardData.integrations?.some((integration: DashboardIntegration) => 
        integration.dataPointsCount > 0
      )

      if (hasIntegrations && hasDataPoints) {
        // Use real data
        setData(dashboardData)
      } else if (hasIntegrations) {
        // Has integrations but no data yet
        setData({
          ...SAMPLE_DATA,
          integrations: dashboardData.integrations,
          hasRealData: false,
          message: 'Integrations connected. Data will appear within 24 hours.',
          insights: []
        })
      } else {
        // No integrations, show sample data
        setData({
          ...SAMPLE_DATA,
          hasRealData: false,
          message: 'Connect your first integration to see real data'
        })
      }

    } catch (err) {
      console.error('Dashboard data fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      
      // Show sample data on error for demo purposes
      setData({
        ...SAMPLE_DATA,
        hasRealData: false,
        message: 'Unable to connect to live data. Showing sample data.'
      })
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, organizationId])

  const markInsightAsRead = useCallback(async (insightId: string) => {
    if (!session?.user?.id || !organizationId) return

    try {
      const response = await fetch(`/api/insights/${insightId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Update local state optimistically
        setData(prevData => {
          if (!prevData) return prevData
          
          return {
            ...prevData,
            insights: prevData.insights.map(insight =>
              insight.id === insightId 
                ? { ...insight, isRead: true }
                : insight
            )
          }
        })
      }
    } catch (error) {
      console.error('Failed to mark insight as read:', error)
    }
  }, [session?.user?.id, organizationId])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return {
    data,
    loading,
    error,
    refetch: fetchDashboardData,
    markInsightAsRead
  }
}