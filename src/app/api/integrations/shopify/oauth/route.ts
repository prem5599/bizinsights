// src/app/api/integrations/shopify/oauth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Shopify OAuth connection initiated')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ No valid session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizationId, shopDomain } = await request.json()
    
    if (!organizationId || !shopDomain) {
      return NextResponse.json(
        { error: 'Organization ID and shop domain are required' },
        { status: 400 }
      )
    }

    console.log('🔍 Verifying user membership...')
    
    // Verify user has access to the organization
    const userMembership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organizationId,
        userId: session.user.id
      },
      include: {
        organization: true
      }
    })

    if (!userMembership) {
      console.log('❌ User not a member of organization')
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      )
    }

    console.log('✅ User membership verified')

    // Clean and validate shop domain
    const cleanShopDomain = shopDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\.myshopify\.com\/?$/, '')
      .replace(/\/.*$/, '')

    if (!cleanShopDomain || cleanShopDomain.length < 3) {
      return NextResponse.json(
        { 
          error: `Invalid shop domain format. Please use formats like: mystore.myshopify.com, mystore.com, or just mystore`,
          processed: cleanShopDomain,
          original: shopDomain
        },
        { status: 400 }
      )
    }

    console.log('✅ Domain validation passed')

    // Check if integration already exists
    console.log('🔍 Checking for existing integration...')
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId: organizationId,
        platform: 'shopify',
        platformAccountId: cleanShopDomain
      }
    })

    if (existingIntegration) {
      console.log('❌ Integration already exists:', existingIntegration.id)
      return NextResponse.json(
        { error: 'Shopify integration already exists for this store' },
        { status: 409 }
      )
    }

    console.log('✅ No existing integration found')

    // Generate a mock access token for demo
    const mockAccessToken = `mock_token_${crypto.randomBytes(16).toString('hex')}`
    console.log('🔑 Generated mock token')
    
    // Create the integration
    console.log('💾 Creating integration...')
    const integration = await prisma.integration.create({
      data: {
        organizationId: organizationId,
        platform: 'shopify',
        platformAccountId: cleanShopDomain,
        accessToken: mockAccessToken,
        status: 'active',
        lastSyncAt: null
      }
    })

    console.log('✅ Integration created:', integration.id)

    console.log('Shopify integration created successfully:', {
      integrationId: integration.id,
      organizationId: organizationId,
      shopDomain: cleanShopDomain
    })

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        platform: 'shopify',
        platformAccountId: cleanShopDomain,
        status: 'active',
        lastSyncAt: integration.lastSyncAt,
        createdAt: integration.createdAt
      },
      organization: {
        id: userMembership.organization.id,
        name: userMembership.organization.name
      },
      message: 'Shopify store connected successfully'
    })

  } catch (error) {
    console.error('Shopify OAuth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}integrations/shopify/private-app/route.ts