// src/app/api/organizations/[orgId]/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orgId } = params

    // Handle temporary org ID for development
    if (orgId === 'temp-org-id') {
      // Return mock data for development
      const mockData = {
        metrics: {
          revenue: {
            current: 45000,
            previous: 38000,
            change: 18.4,
            trend: 'up' as const
          },
          orders: {
            current: 182,
            previous: 156,
            change: 16.7,
            trend: 'up' as const
          },
          sessions: {
            current: 2847,
            previous: 2456,
            change: 15.9,
            trend: 'up' as const
          },
          customers: {
            current: 145,
            previous: 123,
            change: 17.9,
            trend: 'up' as const
          },
          conversion: {
            current: 6.4,
            previous: 6.1,
            change: 4.9,
            trend: 'up' as const
          },
          aov: {
            current: 247.25,
            previous: 243.59,
            change: 1.5,
            trend: 'up' as const
          }
        },
        charts: {
          revenue_trend: [
            { date: '2024-01-01', total_revenue: 35000 },
            { date: '2024-01-08', total_revenue: 42000 },
            { date: '2024-01-15', total_revenue: 38000 },
            { date: '2024-01-22', total_revenue: 45000 },
            { date: '2024-01-29', total_revenue: 48000 },
          ],
          traffic_sources: [
            { source: 'Organic Search', sessions: 1423 },
            { source: 'Direct', sessions: 854 },
            { source: 'Social Media', sessions: 427 },
            { source: 'Paid Ads', sessions: 143 },
          ]
        },
        insights: [
          {
            id: '1',
            type: 'trend',
            title: 'Revenue Growth Accelerating',
            description: 'Your revenue has increased by 23% this month compared to last month, showing strong upward momentum.',
            impactScore: 85,
            isRead: false,
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            type: 'recommendation',
            title: 'Optimize Checkout Flow',
            description: 'Cart abandonment rate is 68%. Consider simplifying your checkout process or adding exit-intent popups.',
            impactScore: 72,
            isRead: false,
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: '3',
            type: 'anomaly',
            title: 'Unusual Traffic Spike Detected',
            description: 'Website traffic increased by 150% yesterday. Investigate the source to capitalize on this opportunity.',
            impactScore: 90,
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString()
          }
        ],
        integrations: [
          {
            id: '1',
            platform: 'shopify',
            status: 'connected',
            lastSyncAt: new Date().toISOString()
          },
          {
            id: '2',
            platform: 'stripe',
            status: 'connected',
            lastSyncAt: new Date().toISOString()
          },
          {
            id: '3',
            platform: 'google_analytics',
            status: 'disconnected',
            lastSyncAt: null
          }
        ],
        hasRealData: false,
        message: 'Demo data - Connect your integrations to see real analytics'
      }

      return NextResponse.json(mockData)
    }

    // Check if user has access to this organization
    const organizationMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: session.user.id
      },
      include: {
        organization: true
      }
    })

    if (!organizationMember) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 403 }
      )
    }

    // Fetch real data from database
    const [insights, integrations] = await Promise.all([
      prisma.insight.findMany({
        where: {
          organizationId: orgId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      }),
      prisma.integration.findMany({
        where: {
          organizationId: orgId
        }
      })
    ])

    // In a real implementation, you would:
    // 1. Fetch actual metrics from your data warehouse
    // 2. Calculate trends and changes
    // 3. Generate charts data
    // 4. Get real insights from AI service

    // For now, return mock data with real insights
    const dashboardData = {
      metrics: {
        revenue: {
          current: 45000,
          previous: 38000,
          change: 18.4,
          trend: 'up' as const
        },
        orders: {
          current: 182,
          previous: 156,
          change: 16.7,
          trend: 'up' as const
        },
        sessions: {
          current: 2847,
          previous: 2456,
          change: 15.9,
          trend: 'up' as const
        },
        customers: {
          current: 145,
          previous: 123,
          change: 17.9,
          trend: 'up' as const
        },
        conversion: {
          current: 6.4,
          previous: 6.1,
          change: 4.9,
          trend: 'up' as const
        },
        aov: {
          current: 247.25,
          previous: 243.59,
          change: 1.5,
          trend: 'up' as const
        }
      },
      charts: {
        revenue_trend: [
          { date: '2024-01-01', total_revenue: 35000 },
          { date: '2024-01-08', total_revenue: 42000 },
          { date: '2024-01-15', total_revenue: 38000 },
          { date: '2024-01-22', total_revenue: 45000 },
          { date: '2024-01-29', total_revenue: 48000 },
        ],
        traffic_sources: [
          { source: 'Organic Search', sessions: 1423 },
          { source: 'Direct', sessions: 854 },
          { source: 'Social Media', sessions: 427 },
          { source: 'Paid Ads', sessions: 143 },
        ]
      },
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
        status: integration.isActive ? 'connected' : 'disconnected',
        lastSyncAt: integration.lastSyncAt?.toISOString() || null
      })),
      hasRealData: integrations.some(i => i.isActive),
      message: integrations.some(i => i.isActive) 
        ? 'Data from your connected integrations'
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