// src/components/dashboard/InsightsList.tsx
'use client'

import { useState } from 'react'
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Eye, 
  EyeOff, 
  X, 
  Clock,
  Zap 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Insight {
  id: string
  type: string // trend, anomaly, recommendation
  title: string
  description: string
  impactScore: number // 1-10
  isRead: boolean
  createdAt: string
  metadata?: Record<string, any>
}

interface InsightsListProps {
  insights: Insight[]
  isLoading?: boolean
  onMarkAsRead?: (insightId: string, isRead: boolean) => void
  onDismiss?: (insightId: string) => void
  className?: string
}

export function InsightsList({ 
  insights, 
  isLoading = false,
  onMarkAsRead,
  onDismiss,
  className 
}: InsightsListProps) {
  const [localInsights, setLocalInsights] = useState(insights)

  // Get icon based on insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return TrendingUp
      case 'anomaly':
        return AlertTriangle
      case 'recommendation':
        return Lightbulb
      default:
        return Zap
    }
  }

  // Get color based on insight type
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'trend':
        return 'text-blue-500 bg-blue-50'
      case 'anomaly':
        return 'text-orange-500 bg-orange-50'
      case 'recommendation':
        return 'text-green-500 bg-green-50'
      default:
        return 'text-purple-500 bg-purple-50'
    }
  }

  // Get impact score color
  const getImpactScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-100'
    if (score >= 60) return 'text-orange-600 bg-orange-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString()
  }

  // Handle mark as read/unread
  const handleToggleRead = async (insightId: string, currentIsRead: boolean) => {
    const newIsRead = !currentIsRead
    
    // Optimistic update
    setLocalInsights(prev => 
      prev.map(insight => 
        insight.id === insightId 
          ? { ...insight, isRead: newIsRead }
          : insight
      )
    )

    try {
      await onMarkAsRead?.(insightId, newIsRead)
    } catch (error) {
      // Revert on error
      setLocalInsights(prev => 
        prev.map(insight => 
          insight.id === insightId 
            ? { ...insight, isRead: currentIsRead }
            : insight
        )
      )
    }
  }

  // Handle dismiss
  const handleDismiss = async (insightId: string) => {
    // Optimistic update
    setLocalInsights(prev => prev.filter(insight => insight.id !== insightId))

    try {
      await onDismiss?.(insightId)
    } catch (error) {
      // Revert on error - in a real app you'd want better error handling
      console.error('Failed to dismiss insight:', error)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
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

  if (!localInsights || localInsights.length === 0) {
    return (
      <div className={cn(
        "bg-slate-50 rounded-lg p-8 text-center",
        className
      )}>
        <Lightbulb className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <div className="text-slate-600">
          <div className="font-medium mb-1">No insights available</div>
          <div className="text-sm">Connect your integrations to start generating insights</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {localInsights.map((insight) => {
        const Icon = getInsightIcon(insight.type)
        const iconColorClass = getInsightColor(insight.type)
        const impactColorClass = getImpactScoreColor(insight.impactScore)

        return (
          <div
            key={insight.id}
            className={cn(
              "bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow",
              !insight.isRead && "border-l-4 border-l-blue-500"
            )}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className={cn("p-2 rounded-lg", iconColorClass)}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-2">
                  <h4 className={cn(
                    "text-sm font-medium text-slate-900",
                    !insight.isRead && "font-semibold"
                  )}>
                    {insight.title}
                  </h4>
                  
                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-2">
                    {/* Impact Score */}
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      impactColorClass
                    )}>
                      {insight.impactScore}
                    </span>

                    {/* Read/Unread Toggle */}
                    <button
                      onClick={() => handleToggleRead(insight.id, insight.isRead)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title={insight.isRead ? 'Mark as unread' : 'Mark as read'}
                    >
                      {insight.isRead ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>

                    {/* Dismiss */}
                    <button
                      onClick={() => handleDismiss(insight.id)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Dismiss insight"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                  {insight.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center text-slate-500">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatRelativeTime(insight.createdAt)}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 capitalize">
                      {insight.type}
                    </span>
                    {!insight.isRead && (
                      <span className="inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {/* Summary */}
      {localInsights.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4 text-center">
          <div className="text-sm text-slate-600">
            Showing {localInsights.length} insight{localInsights.length !== 1 ? 's' : ''}
            {localInsights.filter(i => !i.isRead).length > 0 && (
              <span className="ml-2">
                • {localInsights.filter(i => !i.isRead).length} unread
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}