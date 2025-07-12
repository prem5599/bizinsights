// src/app/api/organizations/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔍 Fetching organizations for user:', session.user.id)

    // Get user's organizations with member relationship
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                integrations: true,
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc' // Get the first/default organization
      }
    })

    console.log(`✅ Found ${memberships.length} organizations for user`)

    // Transform to the expected format
    const organizations = memberships.map(membership => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
      createdAt: membership.organization.createdAt,
      subscriptionTier: membership.organization.subscriptionTier,
      stats: {
        totalIntegrations: membership.organization._count.integrations,
        totalMembers: membership.organization._count.members
      }
    }))

    return NextResponse.json({ 
      organizations,
      total: organizations.length 
    })

  } catch (error) {
    console.error('Organizations/me API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}