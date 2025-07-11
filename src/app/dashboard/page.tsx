// src/app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
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
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Plus,
  ArrowRight
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
  const { data: session, status } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshingInsights, setRefreshingInsights] = useState(false)

  useEffect(() => {
    if (status === 'loading') return // Still loading session
    if (status === 'unauthenticated') {
      // Redirect to login or show login form
      window.location.href = '/auth/signin'
      return
    }
    
    fetchDashboardData()
  }, [status])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Use temporary organization ID for development
      const orgId = 'temp-org-id'
      const response = await fetch(`/api/organizations/${orgId}/dashboard`)
      
      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - redirect to login
          window.location.href = '/auth/signin'
          return
        }
        if (response.status === 403) {
          setError('Access denied. Please check your permissions.')
          return
        }
        throw new Error(`Failed to fetch dashboard data: ${response.status}`)
      }
      
      const fetchedData = await response.json()
      setData(fetchedData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshInsights = async () => {
    setRefreshingInsights(true)
    // Simulate API call to refresh insights
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await fetchDashboardData()
    } catch (error) {
      console.error('Failed to refresh insights:', error)
    } finally {
      setRefreshingInsights(false)
    }
  }

  const handleInsightClick = (insight: any) => {
    console.log('Insight clicked:', insight)
    // In a real app, you might open a modal or navigate to details page
  }

  const handleMarkAsRead = (insightId: string) => {
    if (data) {
      setData({
        ...data,
        insights: data.insights.map(insight =>
          insight.id === insightId 
            ? { ...insight, isRead: true } 
            : insight
        )
      })
    }
  }

  const handleRefreshData = () => {
    fetchDashboardData()
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 sm:space-y-8">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleRefreshData}
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

  const connectedIntegrations = data.integrations.filter(i => i.status === 'connected').length
  const totalIntegrations = data.integrations.length

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
                {data.message || 'Overview of your business performance'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleRefreshData}
                disabled={loading}
                className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Data Source Status */}
        {!data.hasRealData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-blue-900">
                  Demo Mode
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  You're viewing sample data. Connect your business tools to see real analytics.
                </p>
                <div className="mt-3">
                  <a
                    href="/dashboard/integrations"
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 border border-transparent rounded-md hover:bg-blue-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Integrations
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            title="Revenue"
            value={data.metrics.revenue.current}
            change={data.metrics.revenue.change}
            trend={data.metrics.revenue.trend}
            format="currency"
            icon={DollarSign}
          />
          <MetricCard
            title="Orders"
            value={data.metrics.orders.current}
            change={data.metrics.orders.change}
            trend={data.metrics.orders.trend}
            format="number"
            icon={ShoppingCart}
          />
          <MetricCard
            title="Sessions"
            value={data.metrics.sessions.current}
            change={data.metrics.sessions.change}
            trend={data.metrics.sessions.trend}
            format="number"
            icon={Eye}
          />
          <MetricCard
            title="Customers"
            value={data.metrics.customers.current}
            change={data.metrics.customers.change}
            trend={data.metrics.customers.trend}
            format="number"
            icon={Users}
          />
          <MetricCard
            title="Conversion"
            value={data.metrics.conversion.current}
            change={data.metrics.conversion.change}
            trend={data.metrics.conversion.trend}
            format="percentage"
            icon={TrendingUp}
          />
          <MetricCard
            title="AOV"
            value={data.metrics.aov.current}
            change={data.metrics.aov.change}
            trend={data.metrics.aov.trend}
            format="currency"
            icon={BarChart3}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Insights */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium text-slate-900">
                  Latest Insights
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRefreshInsights}
                    disabled={refreshingInsights}
                    className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshingInsights ? 'animate-spin' : ''}`} />
                  </button>
                  <a
                    href="/dashboard/insights"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    View all
                  </a>
                </div>
              </div>
              <InsightsList
                insights={data.insights}
                onInsightClick={handleInsightClick}
                onMarkAsRead={handleMarkAsRead}
                isLoading={refreshingInsights}
                maxItems={5}
              />
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="space-y-6">
            
            {/* Integrations Status */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Data Sources
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Connected</span>
                  <span className="text-sm font-medium text-slate-900">
                    {connectedIntegrations} of {totalIntegrations}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(connectedIntegrations / totalIntegrations) * 100}%` }}
                  ></div>
                </div>
                <div className="pt-2">
                  <a
                    href="/dashboard/integrations"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
                  >
                    Manage integrations
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <a
                  href="/dashboard/analytics"
                  className="flex items-center p-3 text-sm text-slate-700 rounded-md hover:bg-slate-50"
                >
                  <BarChart3 className="h-5 w-5 mr-3 text-slate-400" />
                  View detailed analytics
                </a>
                <a
                  href="/dashboard/reports"
                  className="flex items-center p-3 text-sm text-slate-700 rounded-md hover:bg-slate-50"
                >
                  <CheckCircle className="h-5 w-5 mr-3 text-slate-400" />
                  Generate report
                </a>
                <a
                  href="/dashboard/integrations"
                  className="flex items-center p-3 text-sm text-slate-700 rounded-md hover:bg-slate-50"
                >
                  <Plus className="h-5 w-5 mr-3 text-slate-400" />
                  Add integration
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}