// src/app/dashboard/analytics/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MetricCard } from '@/components/layout/MetricCard'
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download, 
  Filter, 
  RefreshCw,
  ArrowRight,
  ShoppingCart,
  Users,
  Globe,
  Percent,
  DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'

// Define data structure for analytics data
interface AnalyticsData {
  metrics: {
    currentPeriod: {
      revenue: number;
      orders: number;
      customers: number;
      sessions: number;
      conversion: number;
      aov: number;
    };
    previousPeriod: {
      revenue: number;
      orders: number;
      customers: number;
      sessions: number;
      conversion: number;
      aov: number;
    };
    changes: {
      revenue: number;
      orders: number;
      customers: number;
      sessions: number;
      conversion: number;
      aov: number;
    };
  };
  charts: {
    revenueOverTime: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
    trafficSources: Array<{
      source: string;
      sessions: number;
      percentage: number;
    }>;
    conversionByDevice: Array<{
      device: string;
      conversion: number;
      orders: number;
    }>;
    topProducts: Array<{
      name: string;
      revenue: number;
      orders: number;
    }>;
  };
}

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // In a real implementation, this would use the correct organization ID
      // For demo purposes, using a placeholder
      const orgId = 'temp-org-id'
      
      // Build query parameters
      const params = new URLSearchParams()
      params.append('period', dateRange)
      
      const response = await fetch(`/api/organizations/${orgId}/analytics?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const fetchedData = await response.json()
      setData(fetchedData)
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
      setError('Failed to load analytics data')
      
      // Set fallback sample data on error
      const sampleData: AnalyticsData = {
        metrics: {
          currentPeriod: {
            revenue: 45000,
            orders: 342,
            customers: 156,
            sessions: 8542,
            conversion: 4.0,
            aov: 131.58
          },
          previousPeriod: {
            revenue: 38000,
            orders: 298,
            customers: 142,
            sessions: 7890,
            conversion: 3.8,
            aov: 127.52
          },
          changes: {
            revenue: 18.4,
            orders: 14.8,
            customers: 9.9,
            sessions: 8.3,
            conversion: 5.3,
            aov: 3.2
          }
        },
        charts: {
          revenueOverTime: generateSampleRevenueData(),
          trafficSources: [
            { source: 'Google', sessions: 4200, percentage: 49.2 },
            { source: 'Direct', sessions: 1800, percentage: 21.1 },
            { source: 'Social', sessions: 1200, percentage: 14.0 },
            { source: 'Email', sessions: 800, percentage: 9.4 },
            { source: 'Referral', sessions: 542, percentage: 6.3 }
          ],
          conversionByDevice: [
            { device: 'Desktop', conversion: 4.8, orders: 185 },
            { device: 'Mobile', conversion: 3.2, orders: 120 },
            { device: 'Tablet', conversion: 4.1, orders: 37 }
          ],
          topProducts: [
            { name: 'Product A', revenue: 12500, orders: 85 },
            { name: 'Product B', revenue: 8900, orders: 65 },
            { name: 'Product C', revenue: 7600, orders: 52 },
            { name: 'Product D', revenue: 5200, orders: 41 },
            { name: 'Product E', revenue: 4800, orders: 38 }
          ]
        }
      }
      setData(sampleData)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to generate sample revenue data
  function generateSampleRevenueData() {
    const result = []
    const now = new Date()
    const daysToGenerate = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    
    for (let i = 0; i < daysToGenerate; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - (daysToGenerate - i))
      
      // Generate some random but somewhat realistic data
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      // Weekend factor (lower on weekends)
      const weekendFactor = isWeekend ? 0.7 : 1.0
      
      // Basic value with some randomness
      const baseRevenue = 1500 * weekendFactor
      const variance = baseRevenue * 0.3 // 30% variance
      
      const revenue = Math.round(baseRevenue + (Math.random() * variance * 2 - variance))
      const orders = Math.round(revenue / 130) // Average order value of ~$130
      
      result.push({
        date: date.toISOString().split('T')[0],
        revenue,
        orders
      })
    }
    
    return result
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Colors for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-500 mr-3" />
                Analytics
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Detailed metrics and insights about your business performance
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <select 
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="12m">Last 12 months</option>
              </select>
              
              <button 
                className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
              
              <button 
                onClick={fetchAnalyticsData} 
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <RefreshCw className={cn(
                  "h-4 w-4 mr-2",
                  loading && "animate-spin"
                )} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-4 -mb-px" aria-label="Tabs">
            {['overview', 'revenue', 'customers', 'traffic'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-3 px-4 text-sm font-medium border-b-2 capitalize",
                  activeTab === tab 
                    ? "border-blue-500 text-blue-600" 
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                )}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Key Metrics Summary */}
              {data && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MetricCard
                    title="Revenue"
                    value={data.metrics.currentPeriod.revenue}
                    change={data.metrics.changes.revenue}
                    trend={data.metrics.changes.revenue > 0 ? 'up' : data.metrics.changes.revenue < 0 ? 'down' : 'neutral'}
                    format="currency"
                    period={`vs previous ${dateRange}`}
                    isLoading={loading}
                    icon={<DollarSign className="h-5 w-5" />}
                  />
                  
                  <MetricCard
                    title="Orders"
                    value={data.metrics.currentPeriod.orders}
                    change={data.metrics.changes.orders}
                    trend={data.metrics.changes.orders > 0 ? 'up' : data.metrics.changes.orders < 0 ? 'down' : 'neutral'}
                    format="number"
                    period={`vs previous ${dateRange}`}
                    isLoading={loading}
                    icon={<ShoppingCart className="h-5 w-5" />}
                  />
                  
                  <MetricCard
                    title="Conversion Rate"
                    value={data.metrics.currentPeriod.conversion}
                    change={data.metrics.changes.conversion}
                    trend={data.metrics.changes.conversion > 0 ? 'up' : data.metrics.changes.conversion < 0 ? 'down' : 'neutral'}
                    format="percentage"
                    period={`vs previous ${dateRange}`}
                    isLoading={loading}
                    icon={<Percent className="h-5 w-5" />}
                  />
                </div>
              )}

              {/* Revenue Chart */}
              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Revenue Over Time</h3>
                    <p className="text-sm text-slate-500">Daily revenue for the selected time period</p>
                  </div>
                </div>
                <div className="mt-2">
                  {loading ? (
                    <div className="h-80 bg-slate-100 animate-pulse rounded-lg" />
                  ) : data ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart
                        data={data.charts.revenueOverTime}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return `${date.getMonth() + 1}/${date.getDate()}`
                          }}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${value}`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#3B82F6" 
                          activeDot={{ r: 8 }} 
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center p-6">
                      <p className="text-slate-500">No data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Traffic Sources and Top Products */}
              {data && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Traffic Sources */}
                  <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Traffic Sources</h3>
                        <p className="text-sm text-slate-500">Where your visitors are coming from</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      {loading ? (
                        <div className="h-64 bg-slate-100 animate-pulse rounded-lg" />
                      ) : (
                        <div className="flex flex-col md:flex-row items-center justify-between h-64">
                          <ResponsiveContainer width="50%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.charts.trafficSources}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="sessions"
                                label={({ source, percentage }) => `${source} (${percentage.toFixed(1)}%)`}
                                labelLine={false}
                              >
                                {data.charts.trafficSources.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, name, props) => [formatNumber(value), 'Sessions']} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="w-full md:w-1/2">
                            <table className="w-full text-sm">
                              <thead>
                                <tr>
                                  <th className="text-left pb-2">Source</th>
                                  <th className="text-right pb-2">Sessions</th>
                                  <th className="text-right pb-2">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.charts.trafficSources.map((source, index) => (
                                  <tr key={index} className="border-t border-slate-100">
                                    <td className="py-2">
                                      <div className="flex items-center">
                                        <div 
                                          className="h-3 w-3 rounded-full mr-2" 
                                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                        />
                                        {source.source}
                                      </div>
                                    </td>
                                    <td className="text-right py-2">{formatNumber(source.sessions)}</td>
                                    <td className="text-right py-2">{source.percentage.toFixed(1)}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Top Products */}
                  <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">Top Products</h3>
                        <p className="text-sm text-slate-500">Best selling products by revenue</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      {loading ? (
                        <div className="h-64 bg-slate-100 animate-pulse rounded-lg" />
                      ) : (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={data.charts.topProducts}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" domain={[0, 'dataMax']} tickFormatter={(value) => `$${value}`} />
                              <YAxis 
                                type="category" 
                                dataKey="name" 
                                tick={{ fontSize: 12 }} 
                                width={100}
                              />
                              <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                              <Bar dataKey="revenue" fill="#3B82F6" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {activeTab === 'revenue' && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Revenue Analytics</h3>
                  <p className="text-sm text-slate-500">Detailed breakdown of your revenue performance</p>
                </div>
              </div>
              <div className="text-center py-20">
                <p className="text-slate-500 mb-4">Revenue analytics content will be shown here</p>
                <p className="text-sm text-slate-400">This tab is under development</p>
              </div>
            </div>
          )}
          
          {activeTab === 'customers' && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Customer Analytics</h3>
                  <p className="text-sm text-slate-500">Detailed insights about your customer behavior</p>
                </div>
              </div>
              <div className="text-center py-20">
                <p className="text-slate-500 mb-4">Customer analytics content will be shown here</p>
                <p className="text-sm text-slate-400">This tab is under development</p>
              </div>
            </div>
          )}
          
          {activeTab === 'traffic' && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Traffic Analytics</h3>
                  <p className="text-sm text-slate-500">Detailed insights about your website traffic</p>
                </div>
              </div>
              <div className="text-center py-20">
                <p className="text-slate-500 mb-4">Traffic analytics content will be shown here</p>
                <p className="text-sm text-slate-400">This tab is under development</p>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need More Insights?</h3>
          <p className="text-blue-700 mb-4">
            Generate custom reports or schedule automated reports to be sent to your email.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
              <ArrowRight className="h-4 w-4 mr-2" />
              View Reports
            </button>
            <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}