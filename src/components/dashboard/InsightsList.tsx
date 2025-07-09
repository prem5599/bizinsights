// components/dashboard/InsightsList.tsx
'use client'

import { useState } from 'react'
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Star,
  Eye,
  EyeOff,
  X,
  ChevronRight,
  Zap
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

interface InsightsListProps {
  insights: Insight[]
  onInsightClick?: (insight: Insight) => void
  onMarkAsRead?: (insightId: string) => void
  onDismiss?: (insightId: string) => void
  showActions?: boolean
  limit?: number
}

export function InsightsList({
  insights,
  onInsightClick,
  onMarkAsRead,
  onDismiss,
  showActions = true,
  limit
}: InsightsListProps) {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  
  const displayInsights = limit ? insights.slice(0, limit) : insights

  if (displayInsights.length === 0) {
    return (
      <div className="text-center py-8">
        <Lightbulb className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          No insights yet
        </h3>
        <p className="text-slate-600">
          Connect your integrations and we'll analyze your data to provide AI-powered insights
        </p>
      </div>
    )
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend':
        return <TrendingUp className="h-5 w-5" />
      case 'anomaly':
        return <AlertTriangle className="h-5 w-5" />
      case 'recommendation':
        return <Target className="h-5 w-5" />
      case 'opportunity':
        return <Star className="h-5 w-5" />
      default:
        return <Lightbulb className="h-5 w-5" />
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
      case 'opportunity':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200'
    }
  }

  const getUrgencyIndicator = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return <div className="h-2 w-2 rounded-full bg-red-500" />
      case 'medium':
        return <div className="h-2 w-2 rounded-full bg-yellow-500" />
      case 'low':
        return <div className="h-2 w-2 rounded-full bg-green-500" />
      default:
        return null
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString()
  }

  const handleInsightClick = (insight: Insight) => {
    if (!insight.isRead && onMarkAsRead) {
      onMarkAsRead(insight.id)
    }
    
    setExpandedInsight(expandedInsight === insight.id ? null : insight.id)
    onInsightClick?.(insight)
  }

  return (
    <div className="space-y-3">
      {displayInsights.map((insight) => (
        <div
          key={insight.id}
          className={cn(
            "relative rounded-lg border transition-all duration-200 hover:shadow-md",
            insight.isRead ? "bg-white" : "bg-blue-50 border-blue-200",
            getInsightColor(insight.type)
          )}
        >
          {/* Main insight content */}
          <div 
            className="p-4 cursor-pointer"
            onClick={() => handleInsightClick(insight)}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className={cn(
                "flex-shrink-0 p-2 rounded-lg",
                getInsightColor(insight.type)
              )}>
                {getInsightIcon(insight.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={cn(
                        "text-sm font-medium truncate",
                        insight.isRead ? "text-slate-900" : "text-blue-900"
                      )}>
                        {insight.title}
                      </h4>
                      
                      {/* Urgency indicator */}
                      {getUrgencyIndicator(insight.metadata?.urgency)}
                      
                      {/* Unread indicator */}
                      {!insight.isRead && (
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    
                    <p className={cn(
                      "text-sm line-clamp-2",
                      insight.isRead ? "text-slate-600" : "text-blue-700"
                    )}>
                      {insight.description}
                    </p>
                  </div>

                  {/* Impact score and actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Impact score */}
                    <div className="flex items-center space-x-1">
                      <Zap className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs font-medium text-slate-600">
                        {insight.impactScore}/10
                      </span>
                    </div>

                    {/* Actions */}
                    {showActions && (
                      <div className="flex items-center space-x-1">
                        {onMarkAsRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onMarkAsRead(insight.id)
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            title={insight.isRead ? "Mark as unread" : "Mark as read"}
                          >
                            {insight.isRead ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        
                        {onDismiss && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDismiss(insight.id)
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Dismiss insight"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Expand indicator */}
                    <ChevronRight className={cn(
                      "h-4 w-4 text-slate-400 transition-transform duration-200",
                      expandedInsight === insight.id && "rotate-90"
                    )} />
                  </div>
                </div>

                {/* Metadata row */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <span className={cn(
                      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                      getInsightColor(insight.type)
                    )}>
                      {insight.type}
                    </span>
                    
                    {insight.metadata?.category && (
                      <span className="text-xs text-slate-500">
                        {insight.metadata.category}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-slate-500">
                    {formatTimeAgo(insight.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded content */}
          {expandedInsight === insight.id && (
            <div className="border-t border-slate-200 px-4 py-3 bg-slate-50">
              <div className="text-sm text-slate-700">
                <p className="mb-3">{insight.description}</p>
                
                {insight.metadata?.actionable && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <h5 className="text-sm font-medium text-blue-900 mb-1">
                      Recommended Actions:
                    </h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Review the data and identify contributing factors</li>
                      <li>• Consider implementing the suggested improvements</li>
                      <li>• Monitor the impact of any changes made</li>
                    </ul>
                  </div>
                )}
                
                {/* Metadata details */}
                {insight.metadata && Object.keys(insight.metadata).length > 3 && (
                  <details className="mt-3">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                      View technical details
                    </summary>
                    <pre className="mt-2 text-xs text-slate-600 bg-white rounded p-2 overflow-auto">
                      {JSON.stringify(insight.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}