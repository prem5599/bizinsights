// src/app/api/debug-user/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({
        error: 'No session found',
        hasSession: false
      })
    }

    console.log('🔍 Debugging user state for:', session.user.id)

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organizations: {
          include: {
            organization: true
          }
        }
      }
    })

    // Get all users in database
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })

    // Get all organizations
    const allOrgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true
      }
    })

    // Get all memberships
    const allMemberships = await prisma.organizationMember.findMany({
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      session: {
        userId: session.user.id,
        userEmail: session.user.email,
        userName: session.user.name
      },
      database: {
        userExists: !!dbUser,
        userDetails: dbUser ? {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          organizationCount: dbUser.organizations.length
        } : null,
        totalUsers: allUsers.length,
        totalOrganizations: allOrgs.length,
        totalMemberships: allMemberships.length,
        allUsers: allUsers,
        allOrganizations: allOrgs,
        allMemberships: allMemberships
      }
    })

  } catch (error) {
    console.error('Debug user error:', error)
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}