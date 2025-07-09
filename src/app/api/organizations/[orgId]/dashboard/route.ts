// app/api/organizations/[orgId]/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has access to organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: params.orgId,
        userId: session.user.id
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if organization has any integrations
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId: params.orgId,
        status: 'active'
      }
    })

    // If no integrations, return sample data with a flag
    if (integrations.length === 0) {
      return NextResponse.json({
        metrics: getSampleMetrics(),
        charts: getSampleCharts(),
        insights: getSampleInsights(),
        integrations: [],
        hasRealData: false,
        message: 'Connect your first integration to see real business data'
      })
    }

    // Get real data from integrations
    const metrics = await getRealDashboardMetrics(params.orgId)
    const charts = await getRealChartData(params.orgId)
    const insights = await getRecentInsights(params.orgId)

    return NextResponse.json({
      metrics,
      charts,
      insights,
      integrations: integrations.map(i => ({
        id: i.id,
        platform: i.platform,
        status: i.status,
        lastSyncAt: i.lastSyncAt
      })),
      hasRealData: true
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function getRealDashboardMetrics(orgId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)

  // Get all integration IDs for this organization
  const integrations = await prisma.integration.findMany({
    where: { organizationId: orgId, status: 'active' },
    select: { id: true }
  })

  const integrationIds = integrations.map(i => i.id)

  if (integrationIds.length === 0) {
    return getSampleMetrics()
  }

  // Revenue metrics
  const currentRevenue = await prisma.dataPoint.aggregate({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'revenue',
      dateRecorded: { gte: thirtyDaysAgo }
    },
    _sum: { value: true }
  })

  const previousRevenue = await prisma.dataPoint.aggregate({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'revenue',
      dateRecorded: {
        gte: sixtyDaysAgo,
        lt: thirtyDaysAgo
      }
    },
    _sum: { value: true }
  })

  // Orders metrics
  const currentOrders = await prisma.dataPoint.aggregate({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'orders',
      dateRecorded: { gte: thirtyDaysAgo }
    },
    _sum: { value: true }
  })

  const previousOrders = await prisma.dataPoint.aggregate({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'orders',
      dateRecorded: {
        gte: sixtyDaysAgo,
        lt: thirtyDaysAgo
      }
    },
    _sum: { value: true }
  })

  // Sessions metrics (if available)
  const currentSessions = await prisma.dataPoint.aggregate({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'sessions',
      dateRecorded: { gte: thirtyDaysAgo }
    },
    _sum: { value: true }
  })

  const previousSessions = await prisma.dataPoint.aggregate({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'sessions',
      dateRecorded: {
        gte: sixtyDaysAgo,
        lt: thirtyDaysAgo
      }
    },
    _sum: { value: true }
  })

  // Customers metrics
  const currentCustomers = await prisma.dataPoint.aggregate({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'customers',
      dateRecorded: { gte: thirtyDaysAgo }
    },
    _sum: { value: true }
  })

  const previousCustomers = await prisma.dataPoint.aggregate({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'customers',
      dateRecorded: {
        gte: sixtyDaysAgo,
        lt: thirtyDaysAgo
      }
    },
    _sum: { value: true }
  })

  const calculateMetric = (current: any, previous: any) => {
    const curr = Number(current._sum.value || 0)
    const prev = Number(previous._sum.value || 0)
    const change = prev > 0 ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0)
    
    return {
      current: curr,
      previous: prev,
      change: Math.round(change * 100) / 100,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    }
  }

  // Calculate derived metrics
  const revenueCurrent = Number(currentRevenue._sum.value || 0)
  const ordersCurrent = Number(currentOrders._sum.value || 0)
  const sessionsCurrent = Number(currentSessions._sum.value || 0)
  
  const revenuePrevious = Number(previousRevenue._sum.value || 0)
  const ordersPrevious = Number(previousOrders._sum.value || 0)
  const sessionsPrevious = Number(previousSessions._sum.value || 0)

  // Conversion rate (orders / sessions)
  const conversionCurrent = sessionsCurrent > 0 ? (ordersCurrent / sessionsCurrent) * 100 : 0
  const conversionPrevious = sessionsPrevious > 0 ? (ordersPrevious / sessionsPrevious) * 100 : 0
  const conversionChange = conversionPrevious > 0 ? ((conversionCurrent - conversionPrevious) / conversionPrevious) * 100 : 0

  // Average Order Value (revenue / orders)
  const aovCurrent = ordersCurrent > 0 ? revenueCurrent / ordersCurrent : 0
  const aovPrevious = ordersPrevious > 0 ? revenuePrevious / ordersPrevious : 0
  const aovChange = aovPrevious > 0 ? ((aovCurrent - aovPrevious) / aovPrevious) * 100 : 0

  return {
    revenue: calculateMetric(currentRevenue, previousRevenue),
    orders: calculateMetric(currentOrders, previousOrders),
    sessions: sessionsCurrent > 0 ? calculateMetric(currentSessions, previousSessions) : {
      current: 0, previous: 0, change: 0, trend: 'neutral'
    },
    customers: calculateMetric(currentCustomers, previousCustomers),
    conversion: {
      current: Math.round(conversionCurrent * 100) / 100,
      previous: Math.round(conversionPrevious * 100) / 100,
      change: Math.round(conversionChange * 100) / 100,
      trend: conversionChange > 0 ? 'up' : conversionChange < 0 ? 'down' : 'neutral'
    },
    aov: {
      current: Math.round(aovCurrent * 100) / 100,
      previous: Math.round(aovPrevious * 100) / 100,
      change: Math.round(aovChange * 100) / 100,
      trend: aovChange > 0 ? 'up' : aovChange < 0 ? 'down' : 'neutral'
    }
  }
}

async function getRealChartData(orgId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Get integration IDs
  const integrations = await prisma.integration.findMany({
    where: { organizationId: orgId, status: 'active' },
    select: { id: true }
  })

  const integrationIds = integrations.map(i => i.id)

  if (integrationIds.length === 0) {
    return getSampleCharts()
  }

  // Revenue trend (daily) - using raw SQL for better performance
  const revenueTrend = await prisma.$queryRaw`
    SELECT 
      DATE("dateRecorded") as date,
      SUM("value") as total_revenue
    FROM "DataPoint"
    WHERE "integrationId" = ANY(${integrationIds})
      AND "metricType" = 'revenue'
      AND "dateRecorded" >= ${thirtyDaysAgo}
    GROUP BY DATE("dateRecorded")
    ORDER BY date ASC
  ` as Array<{ date: Date; total_revenue: number }>

  // Traffic sources (if available)
  const trafficSources = await prisma.$queryRaw`
    SELECT 
      ("metadata"->>'source') as source,
      SUM("value") as sessions
    FROM "DataPoint"
    WHERE "integrationId" = ANY(${integrationIds})
      AND "metricType" = 'sessions'
      AND "dateRecorded" >= ${thirtyDaysAgo}
      AND "metadata"->>'source' IS NOT NULL
    GROUP BY "metadata"->>'source'
    ORDER BY sessions DESC
    LIMIT 10
  ` as Array<{ source: string; sessions: number }>

  return {
    revenue_trend: revenueTrend.map(item => ({
      date: item.date.toISOString().split('T')[0],
      total_revenue: Number(item.total_revenue)
    })),
    traffic_sources: trafficSources.map(item => ({
      source: item.source || 'Unknown',
      sessions: Number(item.sessions)
    }))
  }
}

async function getRecentInsights(orgId: string) {
  // Try to get existing insights first
  let insights = await prisma.insight.findMany({
    where: { organizationId: orgId },
    orderBy: [
      { impactScore: 'desc' },
      { createdAt: 'desc' }
    ],
    take: 5
  })

  // If no insights exist, generate them
  if (insights.length === 0) {
    try {
      const { InsightsScheduler } = await import('@/lib/insights/scheduler')
      await InsightsScheduler.generateOrganizationInsights(orgId)
      
      // Fetch the newly generated insights
      insights = await prisma.insight.findMany({
        where: { organizationId: orgId },
        orderBy: [
          { impactScore: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 5
      })
    } catch (error) {
      console.error('Failed to generate insights:', error)
      // Return empty array if generation fails
      return []
    }
  }

  return insights
}

// Fallback sample data when no integrations exist
function getSampleMetrics() {
  return {
    revenue: { current: 0, previous: 0, change: 0, trend: 'neutral' },
    orders: { current: 0, previous: 0, change: 0, trend: 'neutral' },
    sessions: { current: 0, previous: 0, change: 0, trend: 'neutral' },
    customers: { current: 0, previous: 0, change: 0, trend: 'neutral' },
    conversion: { current: 0, previous: 0, change: 0, trend: 'neutral' },
    aov: { current: 0, previous: 0, change: 0, trend: 'neutral' }
  }
}

function getSampleCharts() {
  return {
    revenue_trend: [],
    traffic_sources: []
  }
}

function getSampleInsights() {
  return [
    {
      id: 'sample-1',
      type: 'recommendation',
      title: 'Connect your first integration',
      description: 'Add Shopify, Stripe, or Google Analytics to start seeing real business insights',
      impactScore: 10,
      isRead: false,
      createdAt: new Date().toISOString()
    }
  ]
}