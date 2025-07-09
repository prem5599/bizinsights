// app/api/integrations/[integrationId]/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { IntegrationManager } from '@/lib/integrations/manager'

export async function POST(
  req: NextRequest,
  { params }: { params: { integrationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integration = await prisma.integration.findUnique({
      where: { id: params.integrationId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Check if integration is active
    if (integration.status !== 'active') {
      return NextResponse.json({ error: 'Integration is not active' }, { status: 400 })
    }

    // Test connection first
    const connectionTest = await IntegrationManager.testIntegration(integration.id)
    if (!connectionTest) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'error' }
      })
      return NextResponse.json({ error: 'Connection test failed' }, { status: 400 })
    }

    // Trigger sync
    const result = await IntegrationManager.syncIntegration(integration.id)

    return NextResponse.json({
      success: result.success,
      recordsProcessed: result.recordsProcessed,
      errors: result.errors,
      lastSyncAt: result.lastSyncAt
    })

  } catch (error) {
    console.error('Manual sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint to check sync status
export async function GET(
  req: NextRequest,
  { params }: { params: { integrationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const integration = await prisma.integration.findUnique({
      where: { id: params.integrationId },
      include: {
        organization: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Get recent data points to check sync status
    const recentDataPoints = await prisma.dataPoint.findMany({
      where: { integrationId: integration.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const syncStatus = {
      lastSyncAt: integration.lastSyncAt,
      status: integration.status,
      recentDataCount: recentDataPoints.length,
      connectionActive: await IntegrationManager.testIntegration(integration.id)
    }

    return NextResponse.json({ syncStatus })

  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}