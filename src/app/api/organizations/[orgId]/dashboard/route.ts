// src/app/api/organizations/[orgId]/dashboard/route.ts
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

    const { orgId } = params

    // Verify user has access to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: session.user.id
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all active integrations for this organization
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId: orgId,
        status: 'active'
      }
    })

    // Get insights for this organization
    const insights = await prisma.insight.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    // Calculate metrics from real data
    const metrics = await calculateRealMetrics(orgId, integrations)
    
    // Get chart data from real integrations
    const charts = await getRealChartData(orgId, integrations)
    
    // Prepare dashboard response
    const dashboardData = {
      metrics,
      charts,
      insights: insights.map(insight => ({
        id: insight.id,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        impactScore: insight.impactScore,
        isRead: insight.isRead,
        createdAt: insight.createdAt.toISOString()
      })),
      integrations: integrations.map(integration => ({
        id: integration.id,
        platform: integration.platform,
        status: integration.status === 'active' ? 'connected' : 'disconnected',
        lastSyncAt: integration.lastSyncAt?.toISOString() || null
      })),
      hasRealData: integrations.length > 0,
      message: integrations.length > 0 
        ? `Data from ${integrations.length} connected integration${integrations.length !== 1 ? 's' : ''}`
        : 'Connect your integrations to see real analytics'
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Calculate real metrics from integration data
 */
async function calculateRealMetrics(organizationId: string, integrations: any[]) {
  if (integrations.length === 0) {
    // Return empty metrics if no integrations
    return {
      revenue: { current: 0, previous: 0, change: 0, trend: 'neutral' as const },
      orders: { current: 0, previous: 0, change: 0, trend: 'neutral' as const },
      sessions: { current: 0, previous: 0, change: 0, trend: 'neutral' as const },
      customers: { current: 0, previous: 0, change: 0, trend: 'neutral' as const },
      conversion: { current: 0, previous: 0, change: 0, trend: 'neutral' as const },
      aov: { current: 0, previous: 0, change: 0, trend: 'neutral' as const }
    }
  }

  // Get integration IDs
  const integrationIds = integrations.map(i => i.id)
  
  // Define date ranges
  const now = new Date()
  const currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
  const previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) // 30-60 days ago
  const previousPeriodEnd = currentPeriodStart

  // Get current period data
  const currentData = await aggregateMetrics(integrationIds, currentPeriodStart, now)
  
  // Get previous period data
  const previousData = await aggregateMetrics(integrationIds, previousPeriodStart, previousPeriodEnd)

  // Calculate changes and trends
  function calculateChange(current: number, previous: number) {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  function getTrend(change: number): 'up' | 'down' | 'neutral' {
    if (change > 1) return 'up'
    if (change < -1) return 'down'
    return 'neutral'
  }

  const revenueChange = calculateChange(currentData.revenue, previousData.revenue)
  const ordersChange = calculateChange(currentData.orders, previousData.orders)
  const sessionsChange = calculateChange(currentData.sessions, previousData.sessions)
  const customersChange = calculateChange(currentData.customers, previousData.customers)
  
  // Calculate conversion rate (orders/sessions * 100)
  const currentConversion = currentData.sessions > 0 ? (currentData.orders / currentData.sessions) * 100 : 0
  const previousConversion = previousData.sessions > 0 ? (previousData.orders / previousData.sessions) * 100 : 0
  const conversionChange = calculateChange(currentConversion, previousConversion)
  
  // Calculate AOV (average order value)
  const currentAOV = currentData.orders > 0 ? currentData.revenue / currentData.orders : 0
  const previousAOV = previousData.orders > 0 ? previousData.revenue / previousData.orders : 0
  const aovChange = calculateChange(currentAOV, previousAOV)

  return {
    revenue: {
      current: Math.round(currentData.revenue),
      previous: Math.round(previousData.revenue),
      change: Math.round(revenueChange * 10) / 10,
      trend: getTrend(revenueChange)
    },
    orders: {
      current: Math.round(currentData.orders),
      previous: Math.round(previousData.orders),
      change: Math.round(ordersChange * 10) / 10,
      trend: getTrend(ordersChange)
    },
    sessions: {
      current: Math.round(currentData.sessions),
      previous: Math.round(previousData.sessions),
      change: Math.round(sessionsChange * 10) / 10,
      trend: getTrend(sessionsChange)
    },
    customers: {
      current: Math.round(currentData.customers),
      previous: Math.round(previousData.customers),
      change: Math.round(customersChange * 10) / 10,
      trend: getTrend(customersChange)
    },
    conversion: {
      current: Math.round(currentConversion * 10) / 10,
      previous: Math.round(previousConversion * 10) / 10,
      change: Math.round(conversionChange * 10) / 10,
      trend: getTrend(conversionChange)
    },
    aov: {
      current: Math.round(currentAOV * 100) / 100,
      previous: Math.round(previousAOV * 100) / 100,
      change: Math.round(aovChange * 10) / 10,
      trend: getTrend(aovChange)
    }
  }
}

/**
 * Aggregate metrics for a specific time period
 */
async function aggregateMetrics(integrationIds: string[], startDate: Date, endDate: Date) {
  const [revenueData, ordersData, sessionsData, customersData] = await Promise.all([
    // Revenue aggregation
    prisma.dataPoint.aggregate({
      where: {
        integrationId: { in: integrationIds },
        metricType: 'revenue',
        dateRecorded: { gte: startDate, lte: endDate }
      },
      _sum: { value: true }
    }),
    
    // Orders aggregation
    prisma.dataPoint.aggregate({
      where: {
        integrationId: { in: integrationIds },
        metricType: 'orders',
        dateRecorded: { gte: startDate, lte: endDate }
      },
      _sum: { value: true }
    }),
    
    // Sessions aggregation
    prisma.dataPoint.aggregate({
      where: {
        integrationId: { in: integrationIds },
        metricType: 'sessions',
        dateRecorded: { gte: startDate, lte: endDate }
      },
      _sum: { value: true }
    }),
    
    // Customers aggregation (could be distinct count, but for now sum)
    prisma.dataPoint.aggregate({
      where: {
        integrationId: { in: integrationIds },
        metricType: 'customers',
        dateRecorded: { gte: startDate, lte: endDate }
      },
      _sum: { value: true }
    })
  ])

  return {
    revenue: Number(revenueData._sum.value || 0),
    orders: Number(ordersData._sum.value || 0),
    sessions: Number(sessionsData._sum.value || 0),
    customers: Number(customersData._sum.value || 0)
  }
}

/**
 * Get real chart data from integrations
 */
async function getRealChartData(organizationId: string, integrations: any[]) {
  if (integrations.length === 0) {
    return {
      revenue_trend: [],
      traffic_sources: []
    }
  }

  const integrationIds = integrations.map(i => i.id)
  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Get daily revenue trend for last 30 days
  const revenueData = await prisma.dataPoint.findMany({
    where: {
      integrationId: { in: integrationIds },
      metricType: 'revenue',
      dateRecorded: { gte: last30Days }
    },
    orderBy: { dateRecorded: 'asc' }
  })

  // Group revenue by date
  const revenueByDate = new Map<string, number>()
  revenueData.forEach(point => {
    const date = point.dateRecorded.toISOString().split('T')[0]
    const current = revenueByDate.get(date) || 0
    revenueByDate.set(date, current + Number(point.value))
  })

  // Create revenue trend array
  const revenue_trend = Array.from(revenueByDate.entries()).map(([date, total_revenue]) => ({
    date,
    total_revenue: Math.round(total_revenue)
  }))

  // Get session data by source if available
  // Traffic sources will be empty until Google Analytics integration is added
  const traffic_sources: { source: string; sessions: number }[] = []

  return {
    revenue_trend,
    traffic_sources
  }
}