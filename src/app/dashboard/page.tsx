// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshingInsights, setRefreshingInsights] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use temporary organization ID - in real app this would come from route params
      const orgId = 'temp-org-id'
      const response = await fetch(`/api/organizations/${orgId}/dashboard`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const fetchedData = await response.json()
      setData(fetchedData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setError('Failed to load dashboard data')
      
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
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshInsights = async () => {
    if (!data) return
    
    try {
      setRefreshingInsights(true)
      const orgId = 'temp-org-id'
      
      // Trigger insights generation
      const response = await fetch(`/api/organizations/${orgId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      })
      
      if (response.ok) {
        // Refresh dashboard data to get new insights
        await fetchDashboardData()
      }
    } catch (error) {
      console.error('Failed to refresh insights:', error)
    } finally {
      setRefreshingInsights(false)
    }
  }

  const handleMarkInsightAsRead = async (insightId: string) => {
    try {
      const orgId = 'temp-org-id'
      await fetch(`/api/organizations/${orgId}/insights/${insightId}`, {
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
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <select className="rounded-lg border-slate-300 text-sm focus:border-blue-500 focus:ring-blue-500">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Last 90 days</option>
              </select>
              
              <button
                onClick={fetchDashboardData}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Data Source Indicator */}
        {!loading && data && (
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
              {!data.hasRealData && (
                <button
                  onClick={() => window.location.href = '/dashboard/integrations'}
                  className="ml-auto px-3 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-md hover:bg-blue-200"
                >
                  Connect Integration
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
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
                    onClick={fetchDashboardData}
                    className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            title="Total Revenue"
            value={data?.metrics.revenue.current || 0}
            change={data?.metrics.revenue.change}
            trend={data?.metrics.revenue.trend}
            format="currency"
            period="vs last 30 days"
            isLoading={loading}
            icon={<DollarSign className="h-5 w-5" />}
            description="Total revenue generated"
          />
          
          <MetricCard
            title="Orders"
            value={data?.metrics.orders.current || 0}
            change={data?.metrics.orders.change}
            trend={data?.metrics.orders.trend}
            period="vs last 30 days"
            isLoading={loading}
            icon={<ShoppingCart className="h-5 w-5" />}
            description="Total orders received"
          />
          
          <MetricCard
            title="Website Sessions"
            value={data?.metrics.sessions.current || 0}
            change={data?.metrics.sessions.change}
            trend={data?.metrics.sessions.trend}
            period="vs last 30 days"
            isLoading={loading}
            icon={<Eye className="h-5 w-5" />}
            description="Unique website visitors"
          />
          
          <MetricCard
            title="Customers"
            value={data?.metrics.customers.current || 0}
            change={data?.metrics.customers.change}
            trend={data?.metrics.customers.trend}
            period="vs last 30 days"
            isLoading={loading}
            icon={<Users className="h-5 w-5" />}
            description="Total unique customers"
          />
          
          <MetricCard
            title="Avg Order Value"
            value={data?.metrics.aov.current || 0}
            change={data?.metrics.aov.change}
            trend={data?.metrics.aov.trend}
            format="currency"
            period="vs last 30 days"
            isLoading={loading}
            icon={<TrendingUp className="h-5 w-5" />}
            description="Average value per order"
          />
        </div>

        {/* AI Insights */}
        {!loading && data?.insights && (
          <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  AI Insights
                </h2>
                <Zap className="h-5 w-5 text-yellow-500" />
                {data.insights.filter(i => !i.isRead).length > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {data.insights.filter(i => !i.isRead).length} new
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {data.hasRealData && (
                  <button
                    onClick={handleRefreshInsights}
                    disabled={refreshingInsights}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                  >
                    {refreshingInsights ? 'Generating...' : 'Refresh Insights'}
                  </button>
                )}
              </div>
            </div>
            
            <InsightsList
              insights={data.insights}
              onMarkAsRead={handleMarkInsightAsRead}
              limit={3}
              showActions={true}
            />
            
            {data.insights.length > 3 && (
              <div className="mt-4 text-center">
                <button 
                  onClick={() => window.location.href = '/dashboard/insights'}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all insights →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Coming Soon - Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Revenue Trend
            </h3>
            <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Charts coming in next phase</p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Traffic Sources
            </h3>
            <div className="flex items-center justify-center h-64 bg-slate-50 rounded-lg">
              <div className="text-center">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Charts coming in next phase</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}