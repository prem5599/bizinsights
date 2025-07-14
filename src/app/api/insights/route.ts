// src/app/api/insights/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for creating insights
const createInsightSchema = z.object({
  organizationId: z.string().min(1),
  type: z.enum(['trend', 'anomaly', 'recommendation']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  impactScore: z.number().min(1).max(10),
  metadata: z.record(z.any()).optional().default({})
})

// Validation schema for querying insights
const queryInsightsSchema = z.object({
  organizationId: z.string().optional(),
  type: z.enum(['trend', 'anomaly', 'recommendation']).optional(),
  isRead: z.enum(['true', 'false']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  offset: z.string().regex(/^\d+$/).transform(Number).optional().default('0')
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = {
      organizationId: searchParams.get('organizationId'),
      type: searchParams.get('type'),
      isRead: searchParams.get('isRead'),
      limit: searchParams.get('limit') || '10',
      offset: searchParams.get('offset') || '0'
    }

    // Validate query parameters
    const validation = queryInsightsSchema.safeParse(query)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { organizationId, type, isRead, limit, offset } = validation.data

    // Build where clause
    let whereClause: any = {}

    // If organizationId is provided, verify user has access
    if (organizationId) {
      const organizationMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: session.user.id
        }
      })

      if (!organizationMember) {
        return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 })
      }

      whereClause.organizationId = organizationId
    } else {
      // Get all organizations user has access to
      const userOrganizations = await prisma.organizationMember.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          organizationId: true
        }
      })

      whereClause.organizationId = {
        in: userOrganizations.map(org => org.organizationId)
      }
    }

    // Add optional filters
    if (type) {
      whereClause.type = type
    }

    if (isRead !== undefined) {
      whereClause.isRead = isRead === 'true'
    }

    // Fetch insights with pagination
    const [insights, totalCount] = await Promise.all([
      prisma.insight.findMany({
        where: whereClause,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { isRead: 'asc' }, // Unread first
          { impactScore: 'desc' }, // High impact first
          { createdAt: 'desc' } // Most recent first
        ],
        take: limit,
        skip: offset
      }),
      prisma.insight.count({
        where: whereClause
      })
    ])

    // Transform insights for response
    const transformedInsights = insights.map(insight => ({
      id: insight.id,
      type: insight.type,
      title: insight.title,
      description: insight.description,
      impactScore: insight.impactScore,
      isRead: insight.isRead,
      createdAt: insight.createdAt.toISOString(),
      metadata: insight.metadata,
      organization: insight.organization
    }))

    // Calculate summary statistics
    const unreadCount = insights.filter(insight => !insight.isRead).length
    const highImpactCount = insights.filter(insight => insight.impactScore >= 7).length

    return NextResponse.json({
      insights: transformedInsights,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasNext: offset + limit < totalCount,
        hasPrev: offset > 0
      },
      summary: {
        total: totalCount,
        unread: unreadCount,
        highImpact: highImpactCount,
        byType: {
          trend: insights.filter(i => i.type === 'trend').length,
          anomaly: insights.filter(i => i.type === 'anomaly').length,
          recommendation: insights.filter(i => i.type === 'recommendation').length
        }
      }
    })

  } catch (error) {
    console.error('GET insights API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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

    // Validate request body
    const validation = createInsightSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { organizationId, type, title, description, impactScore, metadata } = validation.data

    // Verify user has admin or owner access to this organization
    const organizationMember = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: {
          in: ['owner', 'admin'] // Only admins and owners can create insights
        }
      }
    })

    if (!organizationMember) {
      return NextResponse.json({ error: 'Access denied - admin role required' }, { status: 403 })
    }

    // Create the insight
    const insight = await prisma.insight.create({
      data: {
        organizationId,
        type,
        title,
        description,
        impactScore,
        metadata,
        isRead: false
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      insight: {
        id: insight.id,
        type: insight.type,
        title: insight.title,
        description: insight.description,
        impactScore: insight.impactScore,
        isRead: insight.isRead,
        createdAt: insight.createdAt.toISOString(),
        metadata: insight.metadata,
        organization: insight.organization
      }
    }, { status: 201 })

  } catch (error) {
    console.error('POST insights API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PATCH endpoint for bulk operations (mark multiple as read, etc.)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action, insightIds, organizationId } = body

    if (!action || !Array.isArray(insightIds) || insightIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    // Verify user has access to the organization
    if (organizationId) {
      const organizationMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId,
          userId: session.user.id
        }
      })

      if (!organizationMember) {
        return NextResponse.json({ error: 'Organization not found or access denied' }, { status: 404 })
      }
    }

    let updateData: any = {}
    
    switch (action) {
      case 'mark_read':
        updateData.isRead = true
        break
      case 'mark_unread':
        updateData.isRead = false
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Build where clause for the insights
    let whereClause: any = {
      id: {
        in: insightIds
      }
    }

    if (organizationId) {
      whereClause.organizationId = organizationId
    } else {
      // Ensure user only updates insights from organizations they have access to
      const userOrganizations = await prisma.organizationMember.findMany({
        where: {
          userId: session.user.id
        },
        select: {
          organizationId: true
        }
      })

      whereClause.organizationId = {
        in: userOrganizations.map(org => org.organizationId)
      }
    }

    // Perform bulk update
    const result = await prisma.insight.updateMany({
      where: whereClause,
      data: updateData
    })

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      action
    })

  } catch (error) {
    console.error('PATCH insights API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}