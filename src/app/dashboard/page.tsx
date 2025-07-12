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
  Calendar,
  Filter,
  Plus,
  Info,
  Download,
  Maximize2,
  PieChart,
  Activity,
  MapPin,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts'

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
    revenue_trend: Array<{ date: string; revenue: number; orders: number; sessions: number }>
    traffic_sources: Array<{ source: string; sessions: number; percentage: number }>
    sales_by_hour: Array<{ hour: number; sales: number; orders: number }>
    top_products: Array<{ name: string; revenue: number; quantity: number }>
    conversion_funnel: Array<{ stage: string; count: number; percentage: number }>
    geographic_sales: Array<{ region: string; sales: number; customers: number }>
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

// Chart color schemes
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshingInsights, setRefreshingInsights] = useState(false)
  
  // Filter and view states
  const [dateRange, setDateRange] = useState('30d')
  const [showFilters, setShowFilters] = useState(false)
  const [metricFilter, setMetricFilter] = useState('all')
  const [insightFilter, setInsightFilter] = useState('all')
  const [chartView, setChartView] = useState('revenue') // revenue, traffic, products, geographic
  const [expandedChart, setExpandedChart] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      window.location.href = '/auth/signin'
      return
    }
    
    fetchOrganizationAndDashboard()
  }, [status, dateRange])

  const fetchOrganizationAndDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const orgResponse = await fetch('/api/organizations/me')
      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization')
      }
      
      const orgData = await orgResponse.json()
      const defaultOrg = orgData.organizations?.[0]
      
      if (!defaultOrg) {
        setData(createSampleDashboardData())
        setError(null)
        return
      }
      
      setOrganization(defaultOrg)
      await fetchDashboardData(defaultOrg.id)
      
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setData(createSampleDashboardData())
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async (orgId: string) => {
    try {
      const response = await fetch(`/api/organizations/${orgId}/dashboard?range=${dateRange}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.status}`)
      }
      
      const fetchedData = await response.json()
      setData(fetchedData)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setData(createSampleDashboardData())
    }
  }

  const createSampleDashboardData = (): DashboardData => {
    // Generate sample data for the last 30 days
    const generateDateSeries = (days: number) => {
      const data = []
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        data.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 3000) + 1000,
          orders: Math.floor(Math.random() * 50) + 10,
          sessions: Math.floor(Math.random() * 500) + 200
        })
      }
      return data
    }

    const generateHourlySales = () => {
      return Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        sales: Math.floor(Math.random() * 200) + 50,
        orders: Math.floor(Math.random() * 10) + 2
      }))
    }

    return {
      metrics: {
        revenue: { current: 45000, previous: 38000, change: 18.4, trend: 'up' },
        orders: { current: 342, previous: 298, change: 14.8, trend: 'up' },
        sessions: { current: 8542, previous: 7890, change: 8.3, trend: 'up' },
        customers: { current: 156, previous: 142, change: 9.9, trend: 'up' },
        conversion: { current: 4.0, previous: 3.8, change: 5.3, trend: 'up' },
        aov: { current: 131.58, previous: 127.52, change: 3.2, trend: 'up' }
      },
      charts: {
        revenue_trend: generateDateSeries(30),
        traffic_sources: [
          { source: 'Organic Search', sessions: 3200, percentage: 42 },
          { source: 'Direct', sessions: 2100, percentage: 28 },
          { source: 'Social Media', sessions: 1800, percentage: 24 },
          { source: 'Email', sessions: 500, percentage: 6 }
        ],
        sales_by_hour: generateHourlySales(),
        top_products: [
          { name: 'Premium Headphones', revenue: 12500, quantity: 45 },
          { name: 'Smart Watch', revenue: 9800, quantity: 62 },
          { name: 'Laptop Stand', revenue: 7200, quantity: 120 },
          { name: 'Wireless Charger', revenue: 5600, quantity: 85 },
          { name: 'Phone Case', revenue: 4200, quantity: 210 }
        ],
        conversion_funnel: [
          { stage: 'Visitors', count: 8542, percentage: 100 },
          { stage: 'Product Views', count: 3421, percentage: 40 },
          { stage: 'Add to Cart', count: 1368, percentage: 16 },
          { stage: 'Checkout', count: 547, percentage: 6.4 },
          { stage: 'Purchase', count: 342, percentage: 4.0 }
        ],
        geographic_sales: [
          { region: 'United States', sales: 18500, customers: 89 },
          { region: 'Canada', sales: 12200, customers: 45 },
          { region: 'United Kingdom', sales: 8900, customers: 38 },
          { region: 'Australia', sales: 5400, customers: 22 }
        ]
      },
      insights: [
        {
          id: 'sample-1',
          type: 'opportunity',
          title: 'Peak sales time identified',
          description: 'Your sales peak between 2-4 PM. Consider running targeted campaigns during this window.',
          impactScore: 8.5,
          isRead: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'sample-2',
          type: 'alert',
          title: 'Mobile conversion down 12%',
          description: 'Mobile users are converting less this week. Check your mobile checkout flow.',
          impactScore: 7.2,
          isRead: false,
          createdAt: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      integrations: [],
      hasRealData: false,
      message: organization ? 
        'Connect integrations to see real data' : 
        'Sample dashboard data'
    }
  }

  const handleRefreshInsights = async () => {
    if (!organization) return
    
    try {
      setRefreshingInsights(true)
      
      const response = await fetch(`/api/organizations/${organization.id}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      })
      
      if (response.ok) {
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

  const getFilteredInsights = () => {
    if (!data) return []
    
    let filtered = data.insights
    
    if (insightFilter === 'unread') {
      filtered = filtered.filter(insight => !insight.isRead)
    } else if (insightFilter === 'high-impact') {
      filtered = filtered.filter(insight => insight.impactScore >= 7)
    } else if (insightFilter !== 'all') {
      filtered = filtered.filter(insight => insight.type === insightFilter)
    }
    
    return filtered
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM'
    if (hour === 12) return '12 PM'
    if (hour < 12) return `${hour} AM`
    return `${hour - 12} PM`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-medium text-slate-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('Revenue') || entry.name.includes('Sales') ? formatCurrency(entry.value) : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading || status === 'loading') {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/4"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg border border-slate-200">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600">
              {organization ? `Overview for ${organization.name}` : 'Business overview'}
              {data?.message && ` • ${data.message}`}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md transition-colors",
                showFilters 
                  ? "text-blue-700 bg-blue-50 border-blue-200" 
                  : "text-slate-700 bg-white border-slate-300 hover:bg-slate-50"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </button>

            {organization && (
              <button
                onClick={handleRefreshInsights}
                disabled={refreshingInsights}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
              >
                <Zap className={cn("h-4 w-4 mr-2", refreshingInsights && "animate-pulse")} />
                {refreshingInsights ? 'Generating...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
            <h3 className="text-sm font-medium text-slate-900">Filter Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Metric View</label>
                <select 
                  value={metricFilter} 
                  onChange={(e) => setMetricFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Metrics</option>
                  <option value="revenue">Revenue Focus</option>
                  <option value="traffic">Traffic Focus</option>
                  <option value="conversion">Conversion Focus</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Chart View</label>
                <select 
                  value={chartView} 
                  onChange={(e) => setChartView(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="revenue">Revenue & Orders</option>
                  <option value="traffic">Traffic Sources</option>
                  <option value="products">Top Products</option>
                  <option value="geographic">Geographic Sales</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Insights</label>
                <select 
                  value={insightFilter} 
                  onChange={(e) => setInsightFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Insights</option>
                  <option value="unread">Unread Only</option>
                  <option value="high-impact">High Impact</option>
                  <option value="opportunity">Opportunities</option>
                  <option value="alert">Alerts</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Data Source</label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="all">All Sources</option>
                  <option value="shopify">Shopify Only</option>
                  <option value="stripe">Stripe Only</option>
                  <option value="analytics">Analytics Only</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Data Quality Notice */}
        {data && !data.hasRealData && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Sample Data Display
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    You're viewing sample data. 
                    <a href="/dashboard/integrations" className="font-medium underline hover:text-blue-600 ml-1">
                      Connect integrations
                    </a> to see your real business metrics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        {data && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {(metricFilter === 'all' || metricFilter === 'revenue') && (
              <>
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
                  title="AOV"
                  value={data.metrics.aov.current}
                  change={data.metrics.aov.change}
                  trend={data.metrics.aov.trend}
                  format="currency"
                  icon={BarChart3}
                />
              </>
            )}

            {(metricFilter === 'all' || metricFilter === 'traffic') && (
              <>
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
              </>
            )}

            {(metricFilter === 'all' || metricFilter === 'conversion') && (
              <MetricCard
                title="Conversion"
                value={data.metrics.conversion.current}
                change={data.metrics.conversion.change}
                trend={data.metrics.conversion.trend}
                format="percentage"
                icon={TrendingUp}
              />
            )}
          </div>
        )}

        {/* Charts Section */}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trend Chart */}
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Revenue Trend</h3>
                  <p className="text-sm text-slate-600">Revenue and orders over time</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setExpandedChart(expandedChart === 'revenue' ? null : 'revenue')}
                    className="p-2 text-slate-400 hover:text-slate-600"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-slate-600">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className={cn("transition-all duration-300", expandedChart === 'revenue' ? "h-96" : "h-64")}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.charts?.revenue_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Revenue" />
                    <Bar yAxisId="right" dataKey="orders" fill="#10b981" name="Orders" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Traffic Sources</h3>
                  <p className="text-sm text-slate-600">Where your visitors come from</p>
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-600">
                  <Download className="h-4 w-4" />
                </button>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={data.charts?.traffic_sources || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="sessions"
                      label={({ source, percentage }) => `${source} (${percentage}%)`}
                    >
                      {(data.charts?.traffic_sources || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales by Hour Heatmap */}
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Sales by Hour</h3>
                  <p className="text-sm text-slate-600">Peak sales times throughout the day</p>
                </div>
                <Clock className="h-5 w-5 text-slate-400" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts?.sales_by_hour || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#64748b"
                      fontSize={12}
                      tickFormatter={formatHour}
                    />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sales" fill="#8b5cf6" name="Sales" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white p-6 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Top Products</h3>
                  <p className="text-sm text-slate-600">Best performing products by revenue</p>
                </div>
                <PieChart className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {(data.charts?.top_products || []).slice(0, 5).map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full mr-3" style={{ backgroundColor: COLORS[index] }}></div>
                      <span className="text-sm font-medium text-slate-900 truncate">{product.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">{formatCurrency(product.revenue)}</div>
                      <div className="text-xs text-slate-500">{product.quantity} sold</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conversion Funnel */}
        {data && (
          <div className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Conversion Funnel</h3>
                <p className="text-sm text-slate-600">Customer journey from visit to purchase</p>
              </div>
              <Activity className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              {(data.charts?.conversion_funnel || []).map((stage, index) => (
                <div key={stage.stage} className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">{stage.stage}</span>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-slate-900">{stage.count.toLocaleString()}</span>
                      <span className="text-xs text-slate-500 ml-1">({stage.percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${stage.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insights Section */}
        {data && getFilteredInsights().length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">AI Insights</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500">
                  {getFilteredInsights().filter(i => !i.isRead).length} new
                </span>
                {insightFilter !== 'all' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {insightFilter}
                  </span>
                )}
              </div>
            </div>
            <InsightsList 
              insights={getFilteredInsights()}
              onMarkAsRead={handleMarkInsightAsRead}
            />
          </div>
        )}

        {/* Connect Integrations CTA */}
        {data && !data.hasRealData && (
          <div className="text-center py-8 bg-white rounded-lg border border-slate-200">
            <div className="max-w-md mx-auto">
              <Plus className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">
                Connect Your Business Tools
              </h3>
              <p className="text-slate-600 mb-4">
                Connect your business tools to see real analytics and AI-powered insights.
              </p>
              <a
                href="/dashboard/integrations"
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Integrations
              </a>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}