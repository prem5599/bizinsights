// src/app/dashboard/insights/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { InsightsList } from '@/components/dashboard/InsightsList'
import { 
  Lightbulb, 
  Filter, 
  RefreshCw, 
  SlidersHorizontal, 
  BarChart, 
  AlertTriangle, 
  Target,
  Star,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Insight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation' | 'opportunity'
  title: string
  description: string
  impactScore: number
  isRead: boolean
  createdAt: string
  metadata?: {
    category?: string
    urgency?: 'low' | 'medium' | 'high'
    actionable?: boolean
  }
}

interface InsightSummary {
  total: number
  unread: number
  byType: Record<string, number>
  byUrgency: Record<string, number>
  avgImpactScore: number
  lastGenerated: string | null
}

export default function InsightsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [insights, setInsights] = useState<Insight[]>([])
  const [summary, setSummary] = useState<InsightSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInsights()
  }, [activeTab, urgencyFilter])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // In a real implementation, this would use the correct organization ID
      // For demo purposes, using a placeholder
      const orgId = 'temp-org-id'
      
      // Build query parameters
      const params = new URLSearchParams()
      if (activeTab !== 'all') params.append('type', activeTab)
      if (urgencyFilter !== 'all') params.append('urgency', urgencyFilter)
      
      const response = await fetch(`/api/organizations/${orgId}/insights?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }
      
      const data = await response.json()
      setInsights(data.insights || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Failed to fetch insights:', error)
      setError('Failed to load insights data')
      
      // Set fallback sample data on error
      const sampleData: Insight[] = [
        {
          id: '1',
          type: 'trend',
          title: 'Revenue increasing significantly',
          description: 'Your revenue has increased by 15.3% over the last 30 days compared to the previous period.',
          impactScore: 8,
          isRead: false,
          createdAt: new Date().toISOString(),
          metadata: {
            category: 'revenue',
            urgency: 'medium',
            actionable: true
          }
        },
        {
          id: '2',
          type: 'anomaly',
          title: 'Unusual spike in traffic',
          description: 'Traffic increased by 50% on Tuesday compared to your typical weekly pattern.',
          impactScore: 6,
          isRead: false,
          createdAt: new Date().toISOString(),
          metadata: {
            category: 'traffic',
            urgency: 'low',
            actionable: false
          }
        }
      ]
      setInsights(sampleData)
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = async () => {
    try {
      setGenerating(true)
      const orgId = 'temp-org-id'
      
      // Trigger insight generation
      const response = await fetch(`/api/organizations/${orgId}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' })
      })
      
      if (response.ok) {
        // Refresh insights after generation
        await fetchInsights()
      }
    } catch (error) {
      console.error('Failed to generate insights:', error)
      setError('Failed to generate new insights')
    } finally {
      setGenerating(false)
    }
  }

  const handleMarkAsRead = async (insightId: string) => {
    try {
      const orgId = 'temp-org-id'
      const insight = insights.find(i => i.id === insightId)
      
      if (!insight) return
      
      // Update locally first for better UX
      setInsights(insights.map(i => 
        i.id === insightId ? { ...i, isRead: !i.isRead } : i
      ))
      
      // Then update in backend
      await fetch(`/api/organizations/${orgId}/insights/${insightId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: !insight.isRead })
      })
    } catch (error) {
      console.error('Failed to update insight:', error)
      // Revert the local change if backend fails
      await fetchInsights()
    }
  }

  const handleDismissInsight = async (insightId: string) => {
    try {
      const orgId = 'temp-org-id'
      
      // Remove locally first for better UX
      setInsights(insights.filter(i => i.id !== insightId))
      
      // Then update in backend
      await fetch(`/api/organizations/${orgId}/insights/${insightId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
    } catch (error) {
      console.error('Failed to dismiss insight:', error)
      // Revert the local change if backend fails
      await fetchInsights()
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center">
                <Lightbulb className="h-8 w-8 text-yellow-500 mr-3" />
                AI Insights
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Machine learning powered analysis of your business data
              </p>
            </div>
            
            <button 
              onClick={generateInsights} 
              disabled={generating}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-2",
                generating && "animate-spin"
              )} />
              {generating ? 'Generating...' : 'Generate Insights'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center mr-3">
                  <Lightbulb className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Insights</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.total}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center mr-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Unread</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.unread}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center mr-3">
                  <BarChart className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Avg Impact Score</p>
                  <p className="text-2xl font-bold text-slate-900">{summary.avgImpactScore.toFixed(1)}/10</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center mr-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Last Generated</p>
                  <p className="text-lg font-medium text-slate-900">
                    {summary.lastGenerated 
                      ? new Date(summary.lastGenerated).toLocaleDateString() 
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="border-b border-slate-200 w-full sm:w-auto">
            <nav className="flex space-x-4 -mb-px" aria-label="Tabs">
              {[
                { id: 'all', label: 'All' },
                { id: 'trend', label: 'Trends', icon: <BarChart className="h-4 w-4 mr-1" /> },
                { id: 'anomaly', label: 'Anomalies', icon: <AlertTriangle className="h-4 w-4 mr-1" /> },
                { id: 'recommendation', label: 'Recommendations', icon: <Target className="h-4 w-4 mr-1" /> },
                { id: 'opportunity', label: 'Opportunities', icon: <Star className="h-4 w-4 mr-1" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "py-3 px-4 text-sm font-medium border-b-2 flex items-center",
                    activeTab === tab.id 
                      ? "border-blue-500 text-blue-600" 
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
            >
              <option value="all">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            
            <button 
              onClick={() => fetchInsights()}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </button>
          </div>
        </div>

        {/* Insights List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-lg"></div>
            ))}
          </div>
        ) : insights.length > 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <InsightsList 
              insights={insights}
              onMarkAsRead={handleMarkAsRead}
              onDismiss={handleDismissInsight}
              showActions={true}
            />
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Lightbulb className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No insights found
            </h3>
            <p className="text-slate-600 mb-6">
              {activeTab !== 'all' || urgencyFilter !== 'all' 
                ? 'Try changing your filters or generate new insights'
                : 'Connect your data sources or generate new insights to see AI-powered recommendations'}
            </p>
            <button 
              onClick={generateInsights} 
              disabled={generating}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <RefreshCw className={cn(
                "h-4 w-4 mr-2",
                generating && "animate-spin"
              )} />
              Generate Insights
            </button>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">How Insights Work</h3>
          <p className="text-blue-700 mb-4">
            Our AI analyzes your business data to discover patterns, anomalies, and opportunities that you might miss.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <BarChart className="h-6 w-6 text-blue-500 mb-2" />
              <h4 className="font-medium text-blue-900 mb-1">Trends</h4>
              <p className="text-sm text-blue-700">
                Identify patterns in your revenue, orders, and customer behavior
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <AlertTriangle className="h-6 w-6 text-orange-500 mb-2" />
              <h4 className="font-medium text-blue-900 mb-1">Anomalies</h4>
              <p className="text-sm text-blue-700">
                Detect unusual changes that require your attention
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-blue-100">
              <Target className="h-6 w-6 text-green-500 mb-2" />
              <h4 className="font-medium text-blue-900 mb-1">Recommendations</h4>
              <p className="text-sm text-blue-700">
                Get actionable suggestions to improve performance
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}