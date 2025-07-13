// src/components/layout/MetricCard.tsx
'use client'

import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  format?: 'currency' | 'number' | 'percentage'
  icon?: LucideIcon
  description?: string
  isLoading?: boolean
  className?: string
  prefix?: string
  suffix?: string
}

export function MetricCard({
  title,
  value,
  change,
  trend,
  format = 'number',
  icon: Icon,
  description,
  isLoading = false,
  className,
  prefix,
  suffix
}: MetricCardProps) {
  
  const formatValue = (val: number | string, format: string): string => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: val % 1 === 0 ? 0 : 2
        }).format(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val)
    }
  }

  const formatChange = (change: number): string => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      case 'neutral':
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      case 'neutral':
      default:
        return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <div className={cn(
        "bg-white rounded-lg border border-gray-200 p-6 shadow-sm",
        className
      )}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 truncate">
          {title}
        </h3>
        {Icon && (
          <div className="flex-shrink-0">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline space-x-2 mb-2">
        {prefix && (
          <span className="text-sm text-gray-500">{prefix}</span>
        )}
        <p className="text-2xl font-bold text-gray-900 truncate">
          {formatValue(value, format)}
        </p>
        {suffix && (
          <span className="text-sm text-gray-500">{suffix}</span>
        )}
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={cn("text-sm font-medium", getTrendColor())}>
            {formatChange(change)}
          </span>
          {description && (
            <span className="text-sm text-gray-500 ml-1">
              {description}
            </span>
          )}
        </div>
      )}

      {/* Description without change */}
      {change === undefined && description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </div>
  )
}