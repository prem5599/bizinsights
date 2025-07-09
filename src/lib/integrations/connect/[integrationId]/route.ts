// app/api/integrations/[integrationId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { IntegrationManager } from '@/lib/integrations/manager'

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

    // Get integration statistics
    const stats = await IntegrationManager.getIntegrationStats(integration.id)

    return NextResponse.json({
      integration: {
        id: integration.id,
        platform: integration.platform,
        status: integration.status,
        lastSyncAt: integration.lastSyncAt,
        createdAt: integration.createdAt,
        platformAccountId: integration.platformAccountId
      },
      stats
    })

  } catch (error) {
    console.error('Get integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
              where: { 
                userId: session.user.id,
                role: { in: ['owner', 'admin'] }
              }
            }
          }
        }
      }
    })

    if (!integration || integration.organization.members.length === 0) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Delete integration and all associated data points
    await prisma.integration.delete({
      where: { id: params.integrationId }
    })

    return NextResponse.json({ success: true, message: 'Integration deleted' })

  } catch (error) {
    console.error('Delete integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}