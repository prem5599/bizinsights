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

    // Check if we have Shopify credentials configured
    if (!process.env.SHOPIFY_CLIENT_ID || !process.env.SHOPIFY_CLIENT_SECRET || 
        process.env.SHOPIFY_CLIENT_ID === 'your_shopify_app_client_id') {
      console.log('❌ Shopify OAuth credentials not configured')
      return NextResponse.json(
        { 
          error: 'Shopify OAuth not configured. Please use Private App method instead.',
          suggestion: 'Configure SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in your .env file for OAuth, or use the Private App connection method.'
        },
        { status: 400 }
      )
    }

    // Generate OAuth state
    const state = crypto.randomBytes(32).toString('hex')
    
    // Store state in database for verification
    await prisma.integration.create({
      data: {
        organizationId: organizationId,
        platform: 'shopify',
        platformAccountId: cleanShopDomain,
        accessToken: null,
        status: 'pending',
        lastSyncAt: null,
        metadata: {
          oauthState: state,
          pendingOAuth: true,
          createdAt: new Date().toISOString()
        }
      }
    })

    // Generate OAuth URL
    const authUrl = `https://${cleanShopDomain}.myshopify.com/admin/oauth/authorize?` +
      `client_id=${process.env.SHOPIFY_CLIENT_ID}&` +
      `scope=read_orders,read_customers,read_products,read_analytics&` +
      `redirect_uri=${encodeURIComponent(process.env.NEXTAUTH_URL + '/api/integrations/shopify/callback')}&` +
      `state=${state}`

    console.log('🔗 Generated OAuth URL')
    
    return NextResponse.json({
      success: true,
      redirectUrl: authUrl,
      message: 'Redirecting to Shopify for authorization...'
    })

  } catch (error) {
    console.error('Shopify OAuth error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}