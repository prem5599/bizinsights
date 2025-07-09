// app/api/organizations/[orgId]/insights/[insightId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { orgId: string; insightId: string } }
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

    // Get insight
    const insight = await prisma.insight.findFirst({
      where: {
        id: params.insightId,
        organizationId: params.orgId
      }
    })

    if (!insight) {
      return NextResponse.json({ error: 'Insight not found' }, { status: 404 })
    }

    return NextResponse.json({ insight })

  } catch (error) {
    console.error('Get insight error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orgId: string; insightId: string } }
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

    const { isRead, dismissed } = await req.json()

    // Update insight
    const updateData: any = {}
    if (typeof isRead === 'boolean') {
      updateData.isRead = isRead
    }
    if (typeof dismissed === 'boolean') {
      updateData.metadata = {
        dismissed,
        dismissedAt: dismissed ? new Date().toISOString() : null,
        dismissedBy: dismissed ? session.user.id : null
      }
    }

    const insight = await prisma.insight.update({
      where: {
        id: params.insightId,
        organizationId: params.orgId
      },
      data: updateData
    })

    return NextResponse.json({ insight })

  } catch (error) {
    console.error('Update insight error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { orgId: string; insightId: string } }
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

    // Delete insight
    await prisma.insight.delete({
      where: {
        id: params.insightId,
        organizationId: params.orgId
      }
    })

    return NextResponse.json({ success: true, message: 'Insight deleted' })

  } catch (error) {
    console.error('Delete insight error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}