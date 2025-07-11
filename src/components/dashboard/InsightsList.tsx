// src/components/dashboard/InsightsList.tsx
'use client'

import { useState } from 'react'
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Eye,
  EyeOff,
  RefreshCw,
  Clock
} from 'lucide-react'
import { cn, getRelativeTime } from '@/lib/utils'

interface Insight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation' | 'alert'
  title: string
  description: string
  impactScore: number
  isRead: boolean
  createdAt: string
  data?: {
    metric?: string
    change?: number
    threshold?: number
    recommendation?: string
  }
}

interface InsightsListProps {
  insights: Insight[]
  onInsightClick?: (insight: Insight) => void
  onMarkAsRead?: (insightId: string) => void
  isLoading?: boolean
  showUnreadOnly?: boolean
  maxItems?: number
  className?: string
}

export function InsightsList({
  insights = [],
  onInsightClick,
  onMarkAsRead,
  isLoading = false,
  showUnreadOnly = false,
  maxItems,
  className
}: InsightsListProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return TrendingUp
      case 'anomaly':
        return AlertTriangle
      case 'recommendation':
        return Lightbulb
      case 'alert':
        return Info
      default:
        return Info
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'trend':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'anomaly':
        return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'recommendation':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'alert':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const getImpactBadge = (score: number) => {
    if (score >= 80) {
      return { label: 'High', color: 'bg-red-100 text-red-800' }
    } else if (score >= 50) {
      return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' }
    } else {
      return { label: 'Low', color: 'bg-green-100 text-green-800' }
    }
  }

  const filteredInsights = insights
    .filter(insight => showUnreadOnly || filter === 'all' ? true : !insight.isRead)
    .slice(0, maxItems)

  const handleInsightClick = (insight: Insight) => {
    if (onInsightClick) {
      onInsightClick(insight)
    }
    if (onMarkAsRead && !insight.isRead) {
      onMarkAsRead(insight.id)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (filteredInsights.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Lightbulb className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-sm font-medium text-slate-900 mb-2">
          {showUnreadOnly || filter === 'unread' ? 'No unread insights' : 'No insights yet'}
        </h3>
        <p className="text-sm text-slate-500">
          {showUnreadOnly || filter === 'unread' 
            ? 'All insights have been read' 
            : 'Connect your data sources to start getting AI-powered insights'
          }
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter tabs */}
      {!showUnreadOnly && (
        <div className="flex items-center justify-between">
          <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                filter === 'all'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                filter === 'unread'
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Unread ({insights.filter(i => !i.isRead).length})
            </button>
          </div>
        </div>
      )}

      {/* Insights list */}
      <div className="space-y-3">
        {filteredInsights.map((insight) => {
          const Icon = getInsightIcon(insight.type)
          const impactBadge = getImpactBadge(insight.impactScore)

          return (
            <div
              key={insight.id}
              className={cn(
                "bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer",
                !insight.isRead && "ring-2 ring-blue-100 border-blue-200"
              )}
              onClick={() => handleInsightClick(insight)}
            >
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border",
                  getInsightColor(insight.type)
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h4 className="text-sm font-medium text-slate-900 mb-1">
                      {insight.title}
                    </h4>
                    <div className="flex items-center space-x-2 ml-2">
                      {/* Impact badge */}
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                        impactBadge.color
                      )}>
                        {impactBadge.label}
                      </span>
                      {/* Read status */}
                      {insight.isRead ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 mb-2">
                    {insight.description}
                  </p>

                  {/* Additional data */}
                  {insight.data && (
                    <div className="text-xs text-slate-500 space-y-1">
                      {insight.data.metric && (
                        <div>Metric: {insight.data.metric}</div>
                      )}
                      {insight.data.change && (
                        <div>Change: {insight.data.change > 0 ? '+' : ''}{insight.data.change}%</div>
                      )}
                      {insight.data.recommendation && (
                        <div className="font-medium text-slate-600">
                          💡 {insight.data.recommendation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center mt-3 text-xs text-slate-400">
                    <Clock className="h-3 w-3 mr-1" />
                    {getRelativeTime(insight.createdAt)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* View more link */}
      {maxItems && insights.length > maxItems && (
        <div className="text-center pt-4">
          <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
            View all insights ({insights.length})
          </button>
        </div>
      )}
    </div>
  )
}