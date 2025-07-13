// src/app/api/organizations/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/organizations/me
 * Get current user's organizations
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('🏢 Fetching organizations for user:', session.user.id)

    // Get user's organization memberships
    const memberships = await prisma.organizationMember.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        organization: {
          include: {
            _count: {
              select: {
                members: true,
                integrations: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // First joined organization first
      }
    })

    // Transform the data
    const organizations = memberships.map(membership => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      subscriptionTier: membership.organization.subscriptionTier,
      role: membership.role,
      joinedAt: membership.createdAt,
      memberCount: membership.organization._count.members,
      integrationCount: membership.organization._count.integrations,
      createdAt: membership.organization.createdAt,
      updatedAt: membership.organization.updatedAt
    }))

    console.log('✅ Found', organizations.length, 'organizations')

    // If user has no organizations, create a default one
    if (organizations.length === 0) {
      console.log('🆕 Creating default organization for user')
      
      const defaultOrg = await prisma.organization.create({
        data: {
          name: session.user.name || session.user.email || 'My Organization',
          slug: `org-${session.user.id.slice(-8)}`,
          subscriptionTier: 'free',
          members: {
            create: {
              userId: session.user.id,
              role: 'owner'
            }
          }
        },
        include: {
          _count: {
            select: {
              members: true,
              integrations: true
            }
          }
        }
      })

      const newOrganization = {
        id: defaultOrg.id,
        name: defaultOrg.name,
        slug: defaultOrg.slug,
        subscriptionTier: defaultOrg.subscriptionTier,
        role: 'owner',
        joinedAt: defaultOrg.createdAt,
        memberCount: defaultOrg._count.members,
        integrationCount: defaultOrg._count.integrations,
        createdAt: defaultOrg.createdAt,
        updatedAt: defaultOrg.updatedAt
      }

      return NextResponse.json({
        organizations: [newOrganization],
        defaultOrganization: newOrganization,
        totalCount: 1
      })
    }

    // Return organizations with default (first/primary) organization
    const defaultOrganization = organizations.find(org => org.role === 'owner') || organizations[0]

    return NextResponse.json({
      organizations,
      defaultOrganization,
      totalCount: organizations.length
    })

  } catch (error) {
    console.error('❌ Error fetching user organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}