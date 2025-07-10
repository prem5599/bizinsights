// src/components/layout/MetricCard.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatNumber, formatPercentage } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  format?: 'currency' | 'number' | 'percentage'
  prefix?: string
  suffix?: string
  isLoading?: boolean
  icon?: React.ReactNode
  description?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  trend,
  format = 'number',
  prefix,
  suffix,
  isLoading = false,
  icon,
  description,
  className
}: MetricCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return formatCurrency(val)
      case 'percentage':
        return formatPercentage(val)
      case 'number':
        return formatNumber(val)
      default:
        return val.toString()
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />
      case 'down':
        return <TrendingDown className="h-3 w-3" />
      case 'neutral':
        return <Minus className="h-3 w-3" />
      default:
        return null
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50'
      case 'down':
        return 'text-red-600 bg-red-50'
      case 'neutral':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("relative", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          {icon && <div className="text-gray-400">{icon}</div>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" data-testid="metric-loading" />
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          {description && (
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("relative hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        {icon && <div className="text-gray-400">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline space-x-1">
            {prefix && <span className="text-lg text-gray-600">{prefix}</span>}
            <div className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </div>
            {suffix && <span className="text-lg text-gray-600">{suffix}</span>}
          </div>
          
          {change !== undefined && (
            <Badge 
              variant="secondary" 
              className={cn(
                "flex items-center space-x-1 text-xs px-2 py-1",
                getTrendColor()
              )}
            >
              {getTrendIcon()}
              <span>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
            </Badge>
          )}
        </div>
        
        {description && (
          <p className="text-xs text-gray-500 mt-2">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}