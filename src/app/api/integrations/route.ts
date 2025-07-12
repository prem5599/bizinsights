// src/app/api/integrations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { IntegrationManager } from '@/lib/integrations/manager'

/**
 * GET /api/integrations - Get all integrations for an organization
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('orgId')

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }

    // Verify user has access to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all integrations for the organization
    const integrations = await prisma.integration.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        status: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        platformAccountId: true,
        metadata: true,
        _count: {
          select: {
            dataPoints: true,
            webhookEvents: true
          }
        }
      }
    })

    // Add connection status for each integration
    const integrationsWithStatus = await Promise.all(
      integrations.map(async (integration) => {
        const isConnected = await IntegrationManager.testIntegration(integration.id)
        
        return {
          ...integration,
          isConnected,
          dataPointsCount: integration._count.dataPoints,
          webhookEventsCount: integration._count.webhookEvents
        }
      })
    )

    return NextResponse.json({
      integrations: integrationsWithStatus,
      total: integrations.length
    })

  } catch (error) {
    console.error('Get integrations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/integrations - Create a new integration
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, platform, platformAccountId, accessToken, refreshToken } = body

    if (!organizationId || !platform) {
      return NextResponse.json(
        { error: 'Organization ID and platform are required' },
        { status: 400 }
      )
    }

    // Verify user has admin access to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if integration already exists for this platform
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform
      }
    })

    if (existingIntegration) {
      return NextResponse.json(
        { error: `${platform} integration already exists` },
        { status: 409 }
      )
    }

    // Create the integration
    const integration = await prisma.integration.create({
      data: {
        organizationId,
        platform,
        platformAccountId,
        accessToken,
        refreshToken,
        status: 'active',
        metadata: {
          createdBy: session.user.id,
          createdAt: new Date().toISOString()
        }
      }
    })

    // Test the connection
    const connectionTest = await IntegrationManager.testIntegration(integration.id)
    if (!connectionTest) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'error' }
      })
      return NextResponse.json(
        { error: 'Failed to connect to platform' },
        { status: 400 }
      )
    }

    // Start initial data sync in background
    setImmediate(async () => {
      try {
        await IntegrationManager.syncIntegration(integration.id)
      } catch (error) {
        console.error('Background sync failed:', error)
      }
    })

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        platform: integration.platform,
        status: integration.status,
        createdAt: integration.createdAt
      }
    })

  } catch (error) {
    console.error('Create integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/integrations - Delete an integration
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const integrationId = searchParams.get('id')

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Get the integration
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
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

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Check if user has admin access
    const member = integration.organization.members[0]
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Disconnect the integration using the manager
    const success = await IntegrationManager.disconnectIntegration(
      integrationId,
      'user_deleted'
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to disconnect integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Integration disconnected successfully'
    })

  } catch (error) {
    console.error('Delete integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/integrations - Update an integration
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { integrationId, action, ...updateData } = body

    if (!integrationId) {
      return NextResponse.json({ error: 'Integration ID required' }, { status: 400 })
    }

    // Get the integration
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
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

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Check if user has admin access
    const member = integration.organization.members[0]
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    let result
    switch (action) {
      case 'sync':
        result = await IntegrationManager.syncIntegration(integrationId)
        break
      
      case 'test':
        const isConnected = await IntegrationManager.testIntegration(integrationId)
        result = { success: isConnected, connected: isConnected }
        break
      
      case 'update':
        const updatedIntegration = await prisma.integration.update({
          where: { id: integrationId },
          data: {
            ...updateData,
            updatedAt: new Date()
          }
        })
        result = { success: true, integration: updatedIntegration }
        break
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Update integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}