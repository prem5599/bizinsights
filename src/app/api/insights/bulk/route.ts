// src/app/api/insights/bulk/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, insightIds, action } = body

    if (!organizationId || !insightIds || !Array.isArray(insightIds) || !action) {
      return NextResponse.json(
        { error: 'Organization ID, insight IDs array, and action are required' },
        { status: 400 }
      )
    }

    // Verify user has access to organization
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

    let updateData: any = {}
    let message = ''

    switch (action) {
      case 'markRead':
        updateData = { isRead: true }
        message = `Marked ${insightIds.length} insights as read`
        break
      
      case 'markUnread':
        updateData = { isRead: false }
        message = `Marked ${insightIds.length} insights as unread`
        break
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update insights
    const result = await prisma.insight.updateMany({
      where: {
        id: { in: insightIds },
        organizationId
      },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      message,
      updated: result.count
    })

  } catch (error) {
    console.error('Bulk insights update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, insightIds } = body

    if (!organizationId || !insightIds || !Array.isArray(insightIds)) {
      return NextResponse.json(
        { error: 'Organization ID and insight IDs array are required' },
        { status: 400 }
      )
    }

    // Verify user has admin access to organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Delete insights
    const result = await prisma.insight.deleteMany({
      where: {
        id: { in: insightIds },
        organizationId
      }
    })

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.count} insights`,
      deleted: result.count
    })

  } catch (error) {
    console.error('Bulk insights delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}