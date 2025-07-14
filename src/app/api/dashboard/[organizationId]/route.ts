// src/app/api/dashboard/[organizationId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardData, DashboardMetrics, DashboardIntegration, DashboardInsight } from '@/hooks/useDashboardData'

interface RouteParams {
  params: {
    organizationId: string
  }
}

// Helper function to calculate percentage change
function calculateChange(current: number, previous: number) {
  if (previous === 0) return { change: current, changePercent: current > 0 ? 100 : 0 }
  const change = current - previous
  const changePercent = (change / previous) * 100
  return { change, changePercent }
}

// Helper function to determine trend
function getTrend(changePercent: number): 'up' | 'down' | 'neutral' {
  if (changePercent > 1) return 'up'
  if (changePercent < -1) return 'down'
  return 'neutral'
}

// Helper function to aggregate metrics from data points
async function aggregateMetrics(organizationId: string, days: number = 30): Promise<DashboardMetrics> {
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000)
  const previousStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)

  // Get current period data points
  const currentDataPoints = await prisma.dataPoint.findMany({
    where: {
      integration: {
        organizationId
      },
      dateRecorded: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      integration: true
    }
  })

  // Get previous period data points for comparison
  const previousDataPoints = await prisma.dataPoint.findMany({
    where: {
      integration: {
        organizationId
      },
      dateRecorded: {
        gte: previousStartDate,
        lt: startDate
      }
    },
    include: {
      integration: true
    }
  })

  // Aggregate current period metrics
  const currentMetrics = {
    revenue: 0,
    orders: 0,
    customers: 0,
    sessions: 0,
    totalOrderValue: 0,
    orderCount: 0
  }

  const previousMetrics = {
    revenue: 0,
    orders: 0,
    customers: 0,
    sessions: 0,
    totalOrderValue: 0,
    orderCount: 0
  }

  // Process current period data
  currentDataPoints.forEach(dataPoint => {
    const value = parseFloat(dataPoint.value.toString())
    
    switch (dataPoint.metricType) {
      case 'revenue':
        currentMetrics.revenue += value
        break
      case 'orders':
        currentMetrics.orders += value
        currentMetrics.orderCount += value
        break
      case 'order_value':
        currentMetrics.totalOrderValue += value
        break
      case 'customers':
        currentMetrics.customers += value
        break
      case 'sessions':
        currentMetrics.sessions += value
        break
    }
  })

  // Process previous period data
  previousDataPoints.forEach(dataPoint => {
    const value = parseFloat(dataPoint.value.toString())
    
    switch (dataPoint.metricType) {
      case 'revenue':
        previousMetrics.revenue += value
        break
      case 'orders':
        previousMetrics.orders += value
        previousMetrics.orderCount += value
        break
      case 'order_value':
        previousMetrics.totalOrderValue += value
        break
      case 'customers':
        previousMetrics.customers += value
        break
      case 'sessions':
        previousMetrics.sessions += value
        break
    }
  })

  // Calculate derived metrics
  const currentAOV = currentMetrics.orderCount > 0 
    ? currentMetrics.totalOrderValue / currentMetrics.orderCount 
    : 0
  const previousAOV = previousMetrics.orderCount > 0 
    ? previousMetrics.totalOrderValue / previousMetrics.orderCount 
    : 0

  const currentConversionRate = currentMetrics.sessions > 0 
    ? (currentMetrics.orders / currentMetrics.sessions) * 100 
    : 0
  const previousConversionRate = previousMetrics.sessions > 0 
    ? (previousMetrics.orders / previousMetrics.sessions) * 100 
    : 0

  // Calculate changes and trends
  const revenueChange = calculateChange(currentMetrics.revenue, previousMetrics.revenue)
  const ordersChange = calculateChange(currentMetrics.orders, previousMetrics.orders)
  const customersChange = calculateChange(currentMetrics.customers, previousMetrics.customers)
  const aovChange = calculateChange(currentAOV, previousAOV)
  const conversionChange = calculateChange(currentConversionRate, previousConversionRate)
  const sessionsChange = calculateChange(currentMetrics.sessions, previousMetrics.sessions)

  return {
    revenue: {
      current: currentMetrics.revenue,
      previous: previousMetrics.revenue,
      change: revenueChange.change,
      changePercent: revenueChange.changePercent,
      trend: getTrend(revenueChange.changePercent)
    },
    orders: {
      current: currentMetrics.orders,
      previous: previousMetrics.orders,
      change: ordersChange.change,
      changePercent: ordersChange.changePercent,
      trend: getTrend(ordersChange.changePercent)
    },
    customers: {
      current: currentMetrics.customers,
      previous: previousMetrics.customers,
      change: customersChange.change,
      changePercent: customersChange.changePercent,
      trend: getTrend(customersChange.changePercent)
    },
    conversionRate: {
      current: currentConversionRate,
      previous: previousConversionRate,
      change: conversionChange.change,
      changePercent: conversionChange.changePercent,
      trend: getTrend(conversionChange.changePercent)
    },
    averageOrderValue: {
      current: currentAOV,
      previous: previousAOV,
      change: aovChange.change,
      changePercent: aovChange.changePercent,
      trend: getTrend(aovChange.changePercent)
    },
    sessions: {
      current: currentMetrics.sessions,
      previous: previousMetrics.sessions,
      change: sessionsChange.change,
      changePercent: sessionsChange.changePercent,
      trend: getTrend(sessionsChange.changePercent)
    }
  }
}

// Helper function to get platform display name
function getPlatformDisplayName(platform: string): string {
  const platformNames: Record<string, string> = {
    shopify: 'Shopify',
    stripe: 'Stripe',
    google_analytics: 'Google Analytics',
    facebook_ads: 'Facebook Ads',
    google_ads: 'Google Ads'
  }
  return platformNames[platform] || platform
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = params

    // Verify user has access to this organization
    const organizationMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      },
      include: {
        organization: true
      }
    })

    if (!organizationMember) {
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 })
    }

    // Get query parameters
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Fetch integrations with data point counts
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId
      },
      include: {
        _count: {
          select: {
            dataPoints: true
          }
        }
      }
    })

    // Transform integrations for response
    const dashboardIntegrations: DashboardIntegration[] = integrations.map(integration => ({
      id: integration.id,
      platform: integration.platform,
      platformAccountId: integration.platformAccountId,
      status: integration.status as 'active' | 'inactive' | 'error' | 'syncing',
      lastSyncAt: integration.lastSyncAt?.toISOString() || null,
      dataPointsCount: integration._count.dataPoints
    }))

    // Check if we have any real data
    const hasRealData = integrations.some(integration => integration._count.dataPoints > 0)

    let metrics: DashboardMetrics
    let insights: DashboardInsight[]

    if (hasRealData) {
      // Calculate real metrics from data points
      metrics = await aggregateMetrics(organizationId, days)

      // Fetch recent insights
      const insightRecords = await prisma.insight.findMany({
        where: {
          organizationId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })

      insights = insightRecords.map(insight => ({
        id: insight.id,
        type: insight.type as 'trend' | 'anomaly' | 'recommendation',
        title: insight.title,
        description: insight.description,
        impactScore: insight.impactScore,
        isRead: insight.isRead,
        createdAt: insight.createdAt.toISOString(),
        metadata: insight.metadata as Record<string, any>
      }))

    } else {
      // Return empty metrics for no data case
      const emptyMetric = {
        current: 0,
        previous: 0,
        change: 0,
        changePercent: 0,
        trend: 'neutral' as const
      }

      metrics = {
        revenue: emptyMetric,
        orders: emptyMetric,
        customers: emptyMetric,
        conversionRate: emptyMetric,
        averageOrderValue: emptyMetric,
        sessions: emptyMetric
      }

      insights = []
    }

    // Determine data status message
    let message = ''
    if (integrations.length === 0) {
      message = 'Connect your first integration to see real data'
    } else if (!hasRealData) {
      message = 'Integrations connected. Data will appear within 24 hours.'
    } else {
      message = `Data from ${integrations.length} connected integration${integrations.length !== 1 ? 's' : ''}`
    }

    const dashboardData: DashboardData = {
      metrics,
      integrations: dashboardIntegrations,
      insights,
      hasRealData,
      message,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Optional: POST endpoint for refreshing dashboard data
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId } = params

    // Verify user has access to this organization
    const organizationMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!organizationMember) {
      return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 })
    }

    // TODO: Trigger data sync for all integrations
    // This could be implemented as:
    // 1. Queue sync jobs for all active integrations
    // 2. Update lastSyncAt timestamps
    // 3. Return updated data

    // For now, just return success
    return NextResponse.json({ 
      success: true, 
      message: 'Data refresh initiated',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Dashboard refresh API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}