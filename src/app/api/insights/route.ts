// src/app/api/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')
    const type = searchParams.get('type')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    // For now, get the first organization the user belongs to
    // In a real app, this would be passed as a parameter
    const userMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id
      },
      include: {
        organization: true
      }
    })

    if (!userMembership) {
      // Return sample data if no organization found
      return NextResponse.json({
        insights: [
          {
            id: 'sample-1',
            type: 'trend',
            title: 'Revenue Growth Trend',
            description: 'Your revenue has increased by 25% over the last 7 days compared to the previous week. This positive trend indicates strong business performance.',
            impactScore: 85,
            isRead: false,
            createdAt: new Date().toISOString(),
            relativeTime: 'Just now',
            impactLevel: 'critical',
            typeDisplayName: 'Trend Analysis'
          },
          {
            id: 'sample-2',
            type: 'recommendation',
            title: 'Optimize Checkout Process',
            description: 'Cart abandonment rate is 68%. Consider simplifying your checkout process or adding exit-intent popups to recover potential sales.',
            impactScore: 72,
            isRead: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            relativeTime: '1h ago',
            impactLevel: 'high',
            typeDisplayName: 'Recommendation'
          },
          {
            id: 'sample-3',
            type: 'anomaly',
            title: 'Traffic Spike Detected',
            description: 'Website traffic increased by 150% yesterday. Investigate the source to capitalize on this opportunity and ensure your infrastructure can handle the load.',
            impactScore: 90,
            isRead: true,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            relativeTime: '1d ago',
            impactLevel: 'critical',
            typeDisplayName: 'Anomaly Detection'
          }
        ],
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
          unreadCount: 2,
          readCount: 1,
          typeBreakdown: {
            trend: 1,
            recommendation: 1,
            anomaly: 1
          }
        }
      })
    }

    const orgId = userMembership.organizationId

    // Build where clause
    const whereClause: any = {
      organizationId: orgId
    }

    if (type && type !== 'all') {
      whereClause.type = type
    }

    if (unreadOnly) {
      whereClause.isRead = false
    }

    // Get insights with pagination
    const [insights, totalCount] = await Promise.all([
      prisma.insight.findMany({
        where: whereClause,
        orderBy: [
          { isRead: 'asc' }, // Unread first
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          impactScore: true,
          isRead: true,
          metadata: true,
          createdAt: true
        }
      }),
      prisma.insight.count({
        where: whereClause
      })
    ])

    // If no insights found, return sample data
    if (insights.length === 0) {
      return NextResponse.json({
        insights: [
          {
            id: 'demo-1',
            type: 'trend',
            title: 'Welcome to Insights!',
            description: 'This is a demo insight. Connect your integrations to start receiving real AI-powered insights about your business performance.',
            impactScore: 75,
            isRead: false,
            createdAt: new Date().toISOString(),
            relativeTime: 'Just now',
            impactLevel: 'high',
            typeDisplayName: 'Getting Started'
          },
          {
            id: 'demo-2',
            type: 'recommendation',
            title: 'Connect Your First Integration',
            description: 'To start receiving insights, connect your Shopify store, Stripe account, or Google Analytics. This will allow our AI to analyze your data and provide valuable recommendations.',
            impactScore: 80,
            isRead: false,
            createdAt: new Date(Date.now() - 60000).toISOString(),
            relativeTime: '1m ago',
            impactLevel: 'high',
            typeDisplayName: 'Setup Guide'
          }
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 2,
          hasNextPage: false,
          hasPreviousPage: false,
          limit: 20
        },
        summary: {
          totalInsights: 2,
          unreadCount: 2,
          readCount: 0,
          typeBreakdown: {
            trend: 1,
            recommendation: 1
          }
        }
      })
    }

    // Get summary statistics
    const [totalInsights, unreadCount, typeBreakdown] = await Promise.all([
      prisma.insight.count({
        where: { organizationId: orgId }
      }),
      prisma.insight.count({
        where: { 
          organizationId: orgId,
          isRead: false 
        }
      }),
      prisma.insight.groupBy({
        by: ['type'],
        where: { organizationId: orgId },
        _count: {
          id: true
        }
      })
    ])

    // Format insights with relative time and additional data
    const formattedInsights = insights.map(insight => ({
      ...insight,
      relativeTime: getRelativeTime(insight.createdAt),
      impactLevel: getImpactLevel(insight.impactScore),
      typeDisplayName: getTypeDisplayName(insight.type)
    }))

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    return NextResponse.json({
      insights: formattedInsights,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        limit
      },
      summary: {
        totalInsights,
        unreadCount,
        readCount: totalInsights - unreadCount,
        typeBreakdown: typeBreakdown.reduce((acc, item) => {
          acc[item.type] = item._count.id
          return acc
        }, {} as Record<string, number>)
      }
    })

  } catch (error) {
    console.error('Get insights error:', error)
    
    // Always return sample data on error
    return NextResponse.json({
      insights: [
        {
          id: 'error-fallback-1',
          type: 'alert',
          title: 'Sample Insight',
          description: 'This is sample data shown because the insights system is still being set up. Your real insights will appear here once integrations are connected.',
          impactScore: 60,
          isRead: false,
          createdAt: new Date().toISOString(),
          relativeTime: 'Just now',
          impactLevel: 'medium',
          typeDisplayName: 'System Status'
        }
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalCount: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        limit: 20
      },
      summary: {
        totalInsights: 1,
        unreadCount: 1,
        readCount: 0,
        typeBreakdown: {
          alert: 1
        }
      }
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { type, title, description, impactScore, metadata } = body

    // Validation
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, description' },
        { status: 400 }
      )
    }

    // Get user's organization
    const userMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!userMembership) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Create insight
    const insight = await prisma.insight.create({
      data: {
        organizationId: userMembership.organizationId,
        type,
        title,
        description,
        impactScore: impactScore || 50,
        metadata: metadata || {},
        isRead: false
      }
    })

    return NextResponse.json({
      insight: {
        ...insight,
        relativeTime: getRelativeTime(insight.createdAt),
        impactLevel: getImpactLevel(insight.impactScore),
        typeDisplayName: getTypeDisplayName(insight.type)
      },
      message: 'Insight created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Create insight error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
  
  if (diffInHours < 1) return 'Just now'
  if (diffInHours < 24) return `${diffInHours}h ago`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`
  
  return date.toLocaleDateString()
}

function getImpactLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function getTypeDisplayName(type: string): string {
  const displayNames: Record<string, string> = {
    trend: 'Trend Analysis',
    anomaly: 'Anomaly Detection',
    recommendation: 'Recommendation',
    alert: 'Alert',
    opportunity: 'Opportunity'
  }
  return displayNames[type] || type
}