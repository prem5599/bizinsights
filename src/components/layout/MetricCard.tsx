// components/dashboard/MetricCard.tsx
'use client'

import { TrendingUp, TrendingDown, Minus, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface MetricCardProps {
  title: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  format?: 'currency' | 'number' | 'percentage'
  period?: string
  isLoading?: boolean
  icon?: React.ReactNode
  description?: string
}

export function MetricCard({
  title,
  value,
  change,
  trend = 'neutral',
  format = 'number',
  period = 'vs last period',
  isLoading = false,
  icon,
  description
}: MetricCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow duration-200">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 w-4 bg-slate-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val)
      case 'percentage':
        return `${val}%`
      default:
        return new Intl.NumberFormat('en-US').format(val)
    }
  }

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-emerald-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-slate-400" />
    }
  }

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-emerald-600 bg-emerald-50'
      case 'down':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-slate-600 bg-slate-50'
    }
  }

  const getChangeColor = () => {
    if (change === undefined) return 'text-slate-500'
    switch (trend) {
      case 'up':
        return 'text-emerald-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-slate-600'
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 hover:border-slate-300">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200",
              getTrendColor()
            )}>
              {icon}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-slate-600 truncate">
              {title}
            </p>
            {description && (
              <p className="text-xs text-slate-500 mt-1 hidden sm:block">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-all duration-200"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 z-10 mt-1 w-40 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                <button className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  View Details
                </button>
                <button className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  Export Data
                </button>
                <button className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100">
                  Set Alert
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Value */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2">
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
            {formatValue(value)}
          </p>
          {getTrendIcon()}
        </div>
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
              getTrendColor()
            )}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              {period}
            </span>
          </div>
          
          {/* Mobile period display */}
          <span className="text-xs text-slate-500 sm:hidden">
            {period.split(' ').slice(0, 2).join(' ')}
          </span>
        </div>
      )}

      {/* Gradient accent */}
      <div className={cn(
        "absolute bottom-0 left-0 h-1 w-full transition-all duration-300",
        trend === 'up' && "bg-gradient-to-r from-emerald-500 to-emerald-400",
        trend === 'down' && "bg-gradient-to-r from-red-500 to-red-400",
        trend === 'neutral' && "bg-gradient-to-r from-slate-400 to-slate-300"
      )} />
    </div>
  )
}