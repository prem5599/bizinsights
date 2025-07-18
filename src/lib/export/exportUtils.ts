// src/lib/export/exportUtils.ts
import { format } from 'date-fns'

export type ExportFormat = 'csv' | 'json' | 'pdf' | 'excel'

export interface ExportOptions {
  format: ExportFormat
  filename?: string
  dateRange?: {
    start: Date
    end: Date
  }
  includeCharts?: boolean
  includeMetadata?: boolean
  filters?: Record<string, any>
}

export interface ExportData {
  metrics?: Array<{
    name: string
    value: number
    change: number
    trend: string
    period: string
  }>
  timeSeries?: Array<{
    date: string
    [key: string]: any
  }>
  insights?: Array<{
    title: string
    description: string
    type: string
    impact: number
    date: string
  }>
  integrations?: Array<{
    platform: string
    status: string
    lastSync: string
    dataPoints: number
  }>
  raw?: Array<Record<string, any>>
}

// Convert data to CSV format
export function convertToCSV(data: Record<string, any>[]): string {
  if (!data || data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return String(value)
      }).join(',')
    )
  ]

  return csvRows.join('\n')
}

// Convert data to JSON format
export function convertToJSON(data: ExportData): string {
  return JSON.stringify(data, null, 2)
}

// Download file utility
export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Generate filename with timestamp
export function generateFilename(prefix: string, format: ExportFormat): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss')
  return `${prefix}_${timestamp}.${format}`
}

// Format data for export
export function formatExportData(rawData: any, options: ExportOptions): ExportData {
  const formatted: ExportData = {}

  // Format metrics
  if (rawData.metrics) {
    formatted.metrics = Object.entries(rawData.metrics).map(([key, value]: [string, any]) => ({
      name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      value: value.current || 0,
      change: value.change || 0,
      trend: value.trend || 'neutral',
      period: options.dateRange ? 
        `${format(options.dateRange.start, 'yyyy-MM-dd')} to ${format(options.dateRange.end, 'yyyy-MM-dd')}` : 
        'Current period'
    }))
  }

  // Format time series data
  if (rawData.chartData?.revenue) {
    formatted.timeSeries = rawData.chartData.revenue.map((item: any) => ({
      date: format(new Date(item.date), 'yyyy-MM-dd'),
      revenue: item.revenue || 0,
      orders: item.orders || 0,
      sessions: item.sessions || 0
    }))
  }

  // Format insights
  if (rawData.insights) {
    formatted.insights = rawData.insights.map((insight: any) => ({
      title: insight.title,
      description: insight.description,
      type: insight.type,
      impact: insight.impactScore,
      date: format(new Date(insight.createdAt), 'yyyy-MM-dd HH:mm:ss')
    }))
  }

  // Format integrations
  if (rawData.integrations) {
    formatted.integrations = rawData.integrations.map((integration: any) => ({
      platform: integration.platform,
      status: integration.status,
      lastSync: integration.lastSyncAt ? 
        format(new Date(integration.lastSyncAt), 'yyyy-MM-dd HH:mm:ss') : 
        'Never',
      dataPoints: integration.dataPointsCount || 0
    }))
  }

  return formatted
}

// Export data points to CSV
export function exportDataPoints(dataPoints: any[], options: ExportOptions): string {
  const csvData = dataPoints.map(point => ({
    date: format(new Date(point.dateRecorded), 'yyyy-MM-dd HH:mm:ss'),
    metric: point.metricType,
    value: point.value,
    integration: point.integration?.platform || 'Unknown',
    metadata: JSON.stringify(point.metadata || {})
  }))

  return convertToCSV(csvData)
}

// Export metrics summary
export function exportMetricsSummary(metrics: any, options: ExportOptions): string {
  const summary = Object.entries(metrics).map(([key, value]: [string, any]) => ({
    metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
    current_value: value.current || 0,
    previous_value: value.previous || 0,
    change: value.change || 0,
    change_percent: value.changePercent || 0,
    trend: value.trend || 'neutral'
  }))

  return convertToCSV(summary)
}

// Export insights to CSV
export function exportInsights(insights: any[], options: ExportOptions): string {
  const insightData = insights.map(insight => ({
    title: insight.title,
    description: insight.description,
    type: insight.type,
    impact_score: insight.impactScore,
    is_read: insight.isRead,
    created_at: format(new Date(insight.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    metadata: JSON.stringify(insight.metadata || {})
  }))

  return convertToCSV(insightData)
}

// Export integrations to CSV
export function exportIntegrations(integrations: any[], options: ExportOptions): string {
  const integrationData = integrations.map(integration => ({
    platform: integration.platform,
    account_id: integration.platformAccountId || '',
    status: integration.status,
    last_sync: integration.lastSyncAt ? 
      format(new Date(integration.lastSyncAt), 'yyyy-MM-dd HH:mm:ss') : 
      'Never',
    data_points: integration.dataPointsCount || 0,
    created_at: format(new Date(integration.createdAt), 'yyyy-MM-dd HH:mm:ss')
  }))

  return convertToCSV(integrationData)
}

// Validate export options
export function validateExportOptions(options: ExportOptions): string | null {
  if (!options.format) {
    return 'Export format is required'
  }

  if (!['csv', 'json', 'pdf', 'excel'].includes(options.format)) {
    return 'Invalid export format. Supported formats: csv, json, pdf, excel'
  }

  if (options.dateRange) {
    if (!options.dateRange.start || !options.dateRange.end) {
      return 'Date range requires both start and end dates'
    }
    
    if (options.dateRange.start >= options.dateRange.end) {
      return 'Start date must be before end date'
    }
  }

  return null
}

// Get export content type
export function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv'
    case 'json':
      return 'application/json'
    case 'pdf':
      return 'application/pdf'
    case 'excel':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    default:
      return 'text/plain'
  }
}