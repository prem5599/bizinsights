// src/app/api/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/insights
 * Get insights for the user's organization
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const type = searchParams.get('type')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    console.log('💡 Fetching insights for user:', session.user.id, {
      limit,
      page,
      type,
      unreadOnly
    })

    // Get user's default organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id
      },
      include: {
        organization: true
      },
      orderBy: {
        createdAt: 'asc' // First organization
      }
    })

    if (!membership) {
      // Return empty insights if no organization
      return NextResponse.json({
        insights: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNextPage: false,
          hasPreviousPage: false,
          limit
        },
        summary: {
          totalInsights: 0,
          unreadCount: 0,
          readCount: 0,
          typeBreakdown: {}
        }
      })
    }

    // Build where clause
    const whereClause: any = {
      organizationId: membership.organizationId
    }

    if (type && type !== 'all') {
      whereClause.type = type
    }

    if (unreadOnly) {
      whereClause.isRead = false
    }

    // Get insights with pagination
    const [insights, totalCount, summary] = await Promise.all([
      prisma.insight.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.insight.count({
        where: whereClause
      }),
      getInsightsSummary(membership.organizationId)
    ])

    // Transform insights with additional metadata
    const transformedInsights = insights.map(insight => ({
      ...insight,
      relativeTime: getRelativeTime(insight.createdAt),
      impactLevel: getImpactLevel(insight.impactScore),
      typeDisplayName: getTypeDisplayName(insight.type)
    }))

    const totalPages = Math.ceil(totalCount / limit)

    console.log('✅ Found', insights.length, 'insights')

    return NextResponse.json({
      insights: transformedInsights,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit
      },
      summary
    })

  } catch (error) {
    console.error('❌ Error fetching insights:', error)
    
    // Return fallback insights on error
    const fallbackInsights = [
      {
        id: 'fallback-1',
        type: 'trend',
        title: 'Welcome to BizInsights!',
        description: 'Your analytics dashboard is ready. Connect your first integration to start receiving AI-powered insights about your business performance.',
        impactScore: 75,
        isRead: false,
        createdAt: new Date().toISOString(),
        relativeTime: 'Just now',
        impactLevel: 'high',
        typeDisplayName: 'Getting Started'
      },
      {
        id: 'fallback-2',
        type: 'recommendation',
        title: 'Connect Your Data Sources',
        description: 'To unlock the full power of BizInsights, connect your Shopify store, Stripe payments, or Google Analytics. This enables our AI to provide personalized recommendations.',
        impactScore: 80,
        isRead: false,
        createdAt: new Date(Date.now() - 300000).toISOString(),
        relativeTime: '5m ago',
        impactLevel: 'high',
        typeDisplayName: 'Setup Guide'
      },
      {
        id: 'fallback-3',
        type: 'opportunity',
        title: 'Explore Your Dashboard',
        description: 'Check out the Analytics section to see your revenue trends, or visit Integrations to connect your business tools. The Reports section lets you generate automated insights.',
        impactScore: 60,
        isRead: false,
        createdAt: new Date(Date.now() - 600000).toISOString(),
        relativeTime: '10m ago',
        impactLevel: 'medium',
        typeDisplayName: 'Tour Guide'
      }
    ]

    return NextResponse.json({
      insights: fallbackInsights,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 3,
        hasNextPage: false,
        hasPreviousPage: false,
        limit: 20
      },
      summary: {
        totalInsights: 3,
        unreadCount: 3,
        readCount: 0,
        typeBreakdown: {
          trend: 1,
          recommendation: 1,
          opportunity: 1
        }
      }
    })
  }
}

/**
 * POST /api/insights
 * Generate new insights
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action !== 'generate') {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    console.log('🔄 Generating new insights for user:', session.user.id)

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      )
    }

    // Generate sample insights (in real app, this would use AI)
    const newInsights = await generateSampleInsights(membership.organizationId)

    console.log('✅ Generated', newInsights.length, 'new insights')

    return NextResponse.json({
      success: true,
      message: `Generated ${newInsights.length} new insights`,
      insights: newInsights
    })

  } catch (error) {
    console.error('❌ Error generating insights:', error)
    return NextResponse.json(
      { error: 'Failed to generate insights' },
      { status: 500 }
    )
  }
}

// Helper functions

async function getInsightsSummary(organizationId: string) {
  const [totalCount, unreadCount, typeBreakdown] = await Promise.all([
    prisma.insight.count({
      where: { organizationId }
    }),
    prisma.insight.count({
      where: { organizationId, isRead: false }
    }),
    prisma.insight.groupBy({
      by: ['type'],
      where: { organizationId },
      _count: { id: true }
    })
  ])

  const breakdown = typeBreakdown.reduce((acc, item) => {
    acc[item.type] = item._count.id
    return acc
  }, {} as Record<string, number>)

  return {
    totalInsights: totalCount,
    unreadCount,
    readCount: totalCount - unreadCount,
    typeBreakdown: breakdown
  }
}

function getRelativeTime(createdAt: Date): string {
  const now = new Date()
  const created = new Date(createdAt)
  const diffMs = now.getTime() - created.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return created.toLocaleDateString()
}

function getImpactLevel(score: number): string {
  if (score >= 80) return 'high'
  if (score >= 60) return 'medium'
  return 'low'
}

function getTypeDisplayName(type: string): string {
  switch (type.toLowerCase()) {
    case 'trend': return 'Trend Analysis'
    case 'opportunity': return 'Growth Opportunity'
    case 'alert': return 'Alert'
    case 'anomaly': return 'Anomaly Detected'
    case 'recommendation': return 'Recommendation'
    default: return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

async function generateSampleInsights(organizationId: string) {
  const sampleInsights = [
    {
      organizationId,
      type: 'trend',
      title: 'Revenue Growth Trending Upward',
      description: 'Your revenue has shown consistent growth over the past 2 weeks. This positive trend suggests effective marketing strategies and customer retention.',
      impactScore: Math.floor(Math.random() * 20) + 70, // 70-90
      isRead: false,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataPoints: ['revenue', 'orders'],
        confidence: 0.85
      }
    },
    {
      organizationId,
      type: 'opportunity',
      title: 'Customer Acquisition Opportunity',
      description: 'Analysis shows that customers acquired through social media have 25% higher lifetime value. Consider increasing social media marketing budget.',
      impactScore: Math.floor(Math.random() * 15) + 75, // 75-90
      isRead: false,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataPoints: ['customers', 'revenue'],
        confidence: 0.78
      }
    },
    {
      organizationId,
      type: 'recommendation',
      title: 'Optimize Checkout Process',
      description: 'Cart abandonment rate is higher than industry average. Consider implementing exit-intent popups or simplified checkout flow.',
      impactScore: Math.floor(Math.random() * 10) + 65, // 65-75
      isRead: false,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataPoints: ['conversion', 'sessions'],
        confidence: 0.72
      }
    }
  ]

  // Create insights in database
  const createdInsights = await Promise.all(
    sampleInsights.map(insight =>
      prisma.insight.create({
        data: insight
      })
    )
  )

  return createdInsights.map(insight => ({
    ...insight,
    relativeTime: getRelativeTime(insight.createdAt),
    impactLevel: getImpactLevel(insight.impactScore),
    typeDisplayName: getTypeDisplayName(insight.type)
  }))
}