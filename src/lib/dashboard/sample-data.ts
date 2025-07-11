// src/lib/dashboard/sample-data.ts

export function getSampleMetrics() {
  return {
    revenue: { current: 45000, previous: 38000, change: 18.4, trend: 'up' as const },
    orders: { current: 342, previous: 298, change: 14.8, trend: 'up' as const },
    sessions: { current: 8542, previous: 7890, change: 8.3, trend: 'up' as const },
    customers: { current: 156, previous: 142, change: 9.9, trend: 'up' as const },
    conversion: { current: 4.0, previous: 3.8, change: 5.3, trend: 'up' as const },
    aov: { current: 131.58, previous: 127.52, change: 3.2, trend: 'up' as const }
  }
}

export function getSampleCharts() {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return {
      date: date.toISOString().split('T')[0],
      total_revenue: Math.floor(Math.random() * 2000) + 1000 + (i * 50)
    }
  })

  return {
    revenue_trend: last30Days,
    traffic_sources: [
      { source: 'Direct', sessions: 3420 },
      { source: 'Google', sessions: 2890 },
      { source: 'Social Media', sessions: 1230 },
      { source: 'Email', sessions: 890 },
      { source: 'Referral', sessions: 580 }
    ]
  }
}

export function getSampleInsights() {
  return [
    {
      id: 'sample-1',
      type: 'trend',
      title: 'Revenue Growth Accelerating',
      description: 'Your revenue has increased by 18.4% this month, outpacing the previous growth rate of 12.3%.',
      impactScore: 8,
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      id: 'sample-2',
      type: 'opportunity',
      title: 'Email Campaign Performance',
      description: 'Email traffic shows high conversion rates. Consider increasing email marketing budget.',
      impactScore: 6,
      isRead: false,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'sample-3',
      type: 'anomaly',
      title: 'Traffic Spike Detected',
      description: 'Unusual increase in direct traffic on Tuesday. Investigate potential viral content or mentions.',
      impactScore: 5,
      isRead: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]
}

export async function getRealDashboardMetrics(organizationId: string) {
  // TODO: Implement real metrics aggregation from integrations
  // This would query actual data from connected integrations
  // For now, return sample data
  return getSampleMetrics()
}

export async function getRealChartData(organizationId: string) {
  // TODO: Implement real chart data aggregation from integrations
  // This would query actual data from connected integrations
  // For now, return sample data
  return getSampleCharts()
}

export async function getRecentInsights(organizationId: string) {
  // TODO: Implement real insights fetching from database
  // This would query the insights table for this organization
  // For now, return sample data
  return getSampleInsights()
}