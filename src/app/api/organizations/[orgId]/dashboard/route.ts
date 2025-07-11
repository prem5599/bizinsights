// src/app/api/organizations/[orgId]/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  getSampleMetrics, 
  getSampleCharts, 
  getSampleInsights,
  getRealDashboardMetrics,
  getRealChartData,
  getRecentInsights
} from '@/lib/dashboard/sample-data'

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
      integrations,
      hasRealData: true,
      message: `Data from ${integrations.length} connected integration${integrations.length !== 1 ? 's' : ''}`
    })

  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}