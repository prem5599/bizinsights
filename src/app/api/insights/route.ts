// src/app/api/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AIInsightsEngine } from '@/lib/insights/engine'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('organizationId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const type = searchParams.get('type') // filter by insight type
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Build where clause
    const whereClause: any = { organizationId }
    if (type) whereClause.type = type
    if (unreadOnly) whereClause.isRead = false

    // Get insights
    const insights = await prisma.insight.findMany({
      where: whereClause,
      orderBy: [
        { createdAt: 'desc' },
        { impactScore: 'desc' }
      ],
      take: limit
    })

    // Get summary stats
    const stats = await prisma.insight.groupBy({
      by: ['type', 'isRead'],
      where: { organizationId },
      _count: { id: true }
    })

    const summary = {
      total: 0,
      unread: 0,
      byType: {} as Record<string, number>,
      byTypeUnread: {} as Record<string, number>
    }

    stats.forEach(stat => {
      const count = stat._count.id
      summary.total += count
      
      if (!stat.isRead) {
        summary.unread += count
      }

      if (!summary.byType[stat.type]) {
        summary.byType[stat.type] = 0
        summary.byTypeUnread[stat.type] = 0
      }
      
      summary.byType[stat.type] += count
      if (!stat.isRead) {
        summary.byTypeUnread[stat.type] += count
      }
    })

    return NextResponse.json({
      success: true,
      insights,
      summary,
      pagination: {
        limit,
        total: insights.length,
        hasMore: insights.length === limit
      }
    })

  } catch (error) {
    console.error('Get insights error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, action } = body

    if (!organizationId || !action) {
      return NextResponse.json(
        { error: 'Organization ID and action are required' },
        { status: 400 }
      )
    }

    // Verify user has access to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    switch (action) {
      case 'generate':
        // Generate new insights
        const engine = new AIInsightsEngine(organizationId)
        const timeframe = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date()
        }
        
        const insights = await engine.generateInsights(timeframe)
        
        return NextResponse.json({
          success: true,
          message: `Generated ${insights.length} insights`,
          insights: insights.slice(0, 5) // Return top 5
        })

      case 'markAllRead':
        // Mark all insights as read
        await prisma.insight.updateMany({
          where: {
            organizationId,
            isRead: false
          },
          data: { isRead: true }
        })
        
        return NextResponse.json({
          success: true,
          message: 'All insights marked as read'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Insights action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}






