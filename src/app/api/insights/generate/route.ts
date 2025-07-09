// app/api/insights/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { InsightsScheduler } from '@/lib/insights/scheduler'

export async function POST(req: NextRequest) {
  try {
    // In production, this should be protected with API keys or internal auth
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY || 'dev-key'}`
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, force = false } = await req.json()

    if (organizationId) {
      // Generate insights for specific organization
      await InsightsScheduler.generateOrganizationInsights(organizationId)
      return NextResponse.json({ 
        success: true, 
        message: `Insights generated for organization: ${organizationId}` 
      })
    } else {
      // Generate insights for all organizations
      const results = await InsightsScheduler.generateAllInsights()
      return NextResponse.json({ 
        success: true, 
        message: 'Insights generated for all organizations',
        results 
      })
    }

  } catch (error) {
    console.error('Insights generation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get insights generation status/summary
    const authHeader = req.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.INTERNAL_API_KEY || 'dev-key'}`
    
    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get summary of insights across all organizations
    const totalInsights = await prisma.insight.count()
    const recentInsights = await prisma.insight.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    const insightsByType = await prisma.insight.groupBy({
      by: ['type'],
      _count: { id: true }
    })

    const avgImpactScore = await prisma.insight.aggregate({
      _avg: { impactScore: true }
    })

    return NextResponse.json({
      summary: {
        totalInsights,
        recentInsights,
        insightsByType: insightsByType.reduce((acc, item) => {
          acc[item.type] = item._count.id
          return acc
        }, {} as Record<string, number>),
        avgImpactScore: avgImpactScore._avg.impactScore || 0
      }
    })

  } catch (error) {
    console.error('Get insights summary error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}