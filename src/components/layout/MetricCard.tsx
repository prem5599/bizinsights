// src/components/layout/MetricCard.tsx
'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  format?: 'currency' | 'number' | 'percentage'
  icon?: LucideIcon
  isLoading?: boolean
  description?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  trend = 'neutral',
  format = 'number',
  icon: Icon,
  isLoading = false,
  description,
  className
}: MetricCardProps) {
  
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return `${val}%`
      case 'number':
      default:
        return formatNumber(val)
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return TrendingUp
      case 'down':
        return TrendingDown
      default:
        return Minus
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-slate-500'
    }
  }

  const TrendIcon = getTrendIcon()

  if (isLoading) {
    return (
      <div 
        className={cn(
          "bg-white rounded-lg border border-slate-200 p-6 shadow-sm",
          className
        )}
        data-testid="metric-loading"
      >
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-slate-200 rounded w-20"></div>
            {Icon && (
              <div className="h-5 w-5 bg-slate-200 rounded"></div>
            )}
          </div>
          <div className="h-8 bg-slate-200 rounded w-24 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-16"></div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        "bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-600 truncate">
          {title}
        </h3>
        {Icon && (
          <Icon className="h-5 w-5 text-slate-400 flex-shrink-0" />
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <div className="text-2xl font-bold text-slate-900">
          {formatValue(value)}
        </div>
      </div>

      {/* Change and Description */}
      <div className="flex items-center justify-between">
        {change !== undefined && (
          <div className={cn(
            "flex items-center text-sm font-medium",
            getTrendColor()
          )}>
            <TrendIcon className="h-4 w-4 mr-1" />
            {formatPercentage(change)}
          </div>
        )}
        
        {description && (
          <span className="text-xs text-slate-500 ml-2 truncate">
            {description}
          </span>
        )}
      </div>

      {/* Additional trend context */}
      {change !== undefined && (
        <div className="mt-2 text-xs text-slate-500">
          vs. previous period
        </div>
      )}
    </div>
  )
}