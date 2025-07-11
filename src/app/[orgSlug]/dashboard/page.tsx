// src/app/[orgSlug]/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MetricCard } from '@/components/layout/MetricCard'
import { InsightsList } from '@/components/dashboard/InsightsList'
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  BarChart3,
  Eye,
  Zap
} from 'lucide-react'

interface MetricData {
  current: number
  previous: number
  change: number
  trend: 'up' | 'down' | 'neutral'
}

interface DashboardData {
  metrics: {
    revenue: MetricData
    orders: MetricData
    sessions: MetricData
    customers: MetricData
    conversion: MetricData
    aov: MetricData
  }
  charts: {
    revenue_trend: Array<{ date: string; total_revenue: number }>
    traffic_sources: Array<{ source: string; sessions: number }>
  }
  insights: Array<{
    id: string
    type: string
    title: string
    description: string
    impactScore: number
    isRead: boolean
    createdAt: string
  }>
  integrations: Array<{
    id: string
    platform: string
    status: string
    lastSyncAt: string | null
  }>
  hasRealData: boolean
  message?: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function DashboardPage() {
  const params = useParams()
  const orgSlug = params.orgSlug as string
  
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshingInsights, setRefreshingInsights] = useState(false)

  useEffect(() => {
    if (orgSlug) {
      fetchOrganizationAndData()
    }
  }, [orgSlug])

  const fetchOrganizationAndData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First, get organization by slug
      const orgResponse = await fetch(`/api/organizations/by-slug/${orgSlug}`)
      if (!orgResponse.ok) {
        if (orgResponse.status === 404) {
          throw new Error('Organization not found')
        }
        if (orgResponse.status === 403) {
          throw new Error('You do not have access to this organization')
        }
        throw new Error('Failed to fetch organization')
      }
      
      const orgData = await orgResponse.json()
      setOrganization(orgData.organization)
      
      // Then fetch dashboard data using the organization ID
      await fetchDashboardData(orgData.organization.id)
      
    } catch (error) {
      console.error('Failed to fetch organization and dashboard data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/dashboard`)
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied to this organization')
        }
        throw new Error(`Failed to fetch dashboard data: ${response.status}`)
      }
      
      const fetchedData = await response.json()
      setData(fetchedData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      
      // Fallback to sample data on error
      const sampleData: DashboardData = {
        metrics: {
          revenue: { current: 45000, previous: 38000, change: 18.4, trend: 'up' },
          orders: { current: 342, previous: 298, change: 14.8, trend: 'up' },
          sessions: { current: 8542, previous: 7890, change: 8.3, trend: 'up' },
          customers: { current: 156, previous: 142, change: 9.9, trend: 'up' },
          conversion: { current: 4.0, previous: 3.8, change: 5.3, trend: 'up' },
          aov: { current: 131.58, previous: 127.52, change: 3.2, trend: 'up' }
        },
        charts: { revenue_trend: [], traffic_sources: [] },
        insights: [],
        integrations: [],
        hasRealData: false,
        message: 'Using sample data due to connection error'
      }
      setData(sampleData)
    }
  }

  const handleRefreshInsights = async () => {
    if (!organization || !data) return
    
    try {
      setRefreshingInsights(true)
      
      // Trigger insights generation
      const response = await fetch(`/api/organizations/${organization.id}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      })
      
      if (response.ok) {
        // Refresh dashboard data to get new insights
        await fetchDashboardData(organization.id)
      }
    } catch (error) {
      console.error('Failed to refresh insights:', error)
    } finally {
      setRefreshingInsights(false)
    }
  }

  const handleMarkInsightAsRead = async (insightId: string) => {
    if (!organization) return
    
    try {
      await fetch(`/api/organizations/${organization.id}/insights/${insightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      })
      
      // Update local state
      if (data) {
        setData({
          ...data,
          insights: data.insights.map(insight =>
            insight.id === insightId ? { ...insight, isRead: true } : insight
          )
        })
      }
    } catch (error) {
      console.error('Failed to mark insight as read:', error)
    }
  }

  const handleRefreshData = () => {
    if (organization) {
      fetchDashboardData(organization.id)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 sm:space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
                <div className="h-8 bg-slate-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={fetchOrganizationAndData}
                  className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-slate-500">No dashboard data available</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        
        {/* Page Header */}
        <div className="border-b border-slate-200 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Overview of your business performance and key metrics
                {organization && (
                  <span className="ml-2 text-slate-400">• {organization.name}</span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <select className="rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Last 90 days</option>
              </select>
              
              <button
                onClick={handleRefreshData}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Data Source Indicator */}
        <div className={`rounded-lg border p-4 mb-6 ${
          data.hasRealData ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`h-2 w-2 rounded-full ${
              data.hasRealData ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <div>
              <p className={`text-sm font-medium ${
                data.hasRealData ? 'text-green-800' : 'text-blue-800'
              }`}>
                {data.hasRealData ? 'Live Data Connected' : 'Sample Data Mode'}
              </p>
              <p className={`text-xs ${
                data.hasRealData ? 'text-green-600' : 'text-blue-600'
              }`}>
                {data.message || (data.hasRealData 
                  ? `Data from ${data.integrations.length} connected integration${data.integrations.length !== 1 ? 's' : ''}`
                  : 'Connect Shopify, Stripe, or Google Analytics to see your real business data'
                )}
              </p>
            </div>
            {!data.hasRealData && organization && (
              <button
                onClick={() => window.location.href = `/${organization.slug}/integrations`}
                className="ml-auto px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-md hover:bg-blue-200"
              >
                Connect Integration
              </button>
            )}
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            title="Total Revenue"
            value={`$${data.metrics.revenue.current.toLocaleString()}`}
            change={data.metrics.revenue.change}
            trend={data.metrics.revenue.trend}
            icon={DollarSign}
            description="vs previous period"
          />
          
          <MetricCard
            title="Orders"
            value={data.metrics.orders.current.toLocaleString()}
            change={data.metrics.orders.change}
            trend={data.metrics.orders.trend}
            icon={ShoppingCart}
            description="total orders"
          />
          
          <MetricCard
            title="Sessions"
            value={data.metrics.sessions.current.toLocaleString()}
            change={data.metrics.sessions.change}
            trend={data.metrics.sessions.trend}
            icon={Eye}
            description="website visits"
          />
          
          <MetricCard
            title="Customers"
            value={data.metrics.customers.current.toLocaleString()}
            change={data.metrics.customers.change}
            trend={data.metrics.customers.trend}
            icon={Users}
            description="total customers"
          />
          
          <MetricCard
            title="Conversion Rate"
            value={`${data.metrics.conversion.current}%`}
            change={data.metrics.conversion.change}
            trend={data.metrics.conversion.trend}
            icon={Zap}
            description="session to order"
          />
          
          <MetricCard
            title="Avg Order Value"
            value={`$${data.metrics.aov.current.toFixed(2)}`}
            change={data.metrics.aov.change}
            trend={data.metrics.aov.trend}
            icon={TrendingUp}
            description="per order"
          />
        </div>

        {/* Insights Section */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">AI Insights</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Automated analysis of your business data
                </p>
              </div>
              <button
                onClick={handleRefreshInsights}
                disabled={refreshingInsights}
                className="inline-flex items-center px-3 py-2 border border-slate-300 shadow-sm text-sm leading-4 font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <Zap className={`mr-2 h-4 w-4 ${refreshingInsights ? 'animate-spin' : ''}`} />
                {refreshingInsights ? 'Generating...' : 'Generate Insights'}
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <InsightsList 
              insights={data.insights}
              onMarkAsRead={handleMarkInsightAsRead}
              emptyMessage="No insights available. Click 'Generate Insights' to analyze your data."
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}