// app/api/organizations/[orgId]/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { InsightsScheduler } from '@/lib/insights/scheduler'

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

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const type = searchParams.get('type')
    const urgency = searchParams.get('urgency')
    const unreadOnly = searchParams.get('unread') === 'true'

    // Build where condition
    const where: any = { organizationId: params.orgId }
    
    if (type) {
      where.type = type
    }
    
    if (urgency) {
      where.metadata = {
        path: ['urgency'],
        equals: urgency
      }
    }
    
    if (unreadOnly) {
      where.isRead = false
    }

    // Get insights
    const insights = await prisma.insight.findMany({
      where,
      orderBy: [
        { impactScore: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })

    // Get summary
    const summary = await InsightsScheduler.getInsightsSummary(params.orgId)

    return NextResponse.json({
      insights,
      summary,
      pagination: {
        total: insights.length,
        limit
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

export async function POST(
  req: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has admin access to organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: params.orgId,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action } = await req.json()

    switch (action) {
      case 'generate':
        // Trigger insight generation
        await InsightsScheduler.generateOrganizationInsights(params.orgId)
        return NextResponse.json({ 
          success: true, 
          message: 'Insights generation triggered' 
        })

      case 'mark_all_read':
        // Mark all insights as read
        await InsightsScheduler.markInsightsAsRead(params.orgId)
        return NextResponse.json({ 
          success: true, 
          message: 'All insights marked as read' 
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Insights action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}