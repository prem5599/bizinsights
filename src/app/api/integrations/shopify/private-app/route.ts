// src/app/api/integrations/shopify/private-app/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Shopify Private App connection initiated')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ No valid session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { shopDomain, accessToken, organizationId } = body
    
    console.log('📋 Request data received:', {
      shopDomain: shopDomain ? `${shopDomain.substring(0, 10)}...` : 'missing',
      accessToken: accessToken ? 'provided' : 'missing',
      organizationId: organizationId || 'missing'
    })

    // Validate required fields
    if (!shopDomain || !accessToken || !organizationId) {
      const missing = []
      if (!shopDomain) missing.push('shopDomain')
      if (!accessToken) missing.push('accessToken')
      if (!organizationId) missing.push('organizationId')
      
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          missing: missing,
          received: {
            shopDomain: !!shopDomain,
            accessToken: !!accessToken,
            organizationId: !!organizationId
          }
        },
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

    console.log('✅ User membership verified for organization:', userMembership.organization.name)

    // Clean and validate shop domain
    const cleanShopDomain = shopDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\.myshopify\.com\/?$/, '')
      .replace(/\/.*$/, '')

    if (!cleanShopDomain || cleanShopDomain.length < 3) {
      console.log('❌ Invalid domain:', shopDomain, '→', cleanShopDomain)
      return NextResponse.json(
        { 
          error: 'Invalid shop domain format. Please use formats like: mystore.myshopify.com, mystore.com, or just mystore',
          processed: cleanShopDomain,
          original: shopDomain
        },
        { status: 400 }
      )
    }

    console.log('✅ Domain validation passed:', cleanShopDomain)

    // Validate access token format
    if (!accessToken.trim().startsWith('shpat_')) {
      console.log('❌ Invalid access token format')
      return NextResponse.json(
        { error: 'Invalid access token format. Private app tokens must start with "shpat_"' },
        { status: 400 }
      )
    }

    console.log('✅ Access token format validated')

    // Test the Shopify connection
    console.log('🔗 Testing Shopify connection...')
    try {
      const shopifyApiUrl = `https://${cleanShopDomain}.myshopify.com/admin/api/2023-10/shop.json`
      const shopifyResponse = await fetch(shopifyApiUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken.trim(),
          'Content-Type': 'application/json',
          'User-Agent': 'BizInsights-Integration/1.0'
        }
      })

      if (!shopifyResponse.ok) {
        const errorText = await shopifyResponse.text().catch(() => 'Unknown error')
        console.log('❌ Shopify API Error:', shopifyResponse.status, errorText)
        
        if (shopifyResponse.status === 401) {
          return NextResponse.json(
            { error: 'Invalid access token. Please check your token and try again.' },
            { status: 401 }
          )
        } else if (shopifyResponse.status === 404) {
          return NextResponse.json(
            { error: 'Shop not found. Please check your shop domain.' },
            { status: 404 }
          )
        } else {
          return NextResponse.json(
            { error: `Shopify API error: ${shopifyResponse.status} - ${errorText}` },
            { status: 400 }
          )
        }
      }

      const shopData = await shopifyResponse.json()
      console.log('✅ Shopify connection successful:', shopData.shop?.name)

    } catch (connectionError) {
      console.error('❌ Connection test failed:', connectionError)
      return NextResponse.json(
        { error: 'Failed to connect to Shopify. Please check your domain and token.' },
        { status: 400 }
      )
    }

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

    // Create the integration
    console.log('💾 Creating integration...')
    const integration = await prisma.integration.create({
      data: {
        organizationId: organizationId,
        platform: 'shopify',
        platformAccountId: cleanShopDomain,
        accessToken: accessToken.trim(),
        status: 'active',
        lastSyncAt: null,
        metadata: {
          type: 'private_app',
          connectedAt: new Date().toISOString()
        }
      }
    })

    console.log('✅ Integration created:', integration.id)

    console.log('🎉 Integration completed successfully')

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
        id: organizationId,
        name: userMembership.organization.name
      },
      message: 'Shopify store connected successfully with private app'
    })

  } catch (error) {
    console.error('❌ Shopify Private App error:', error)
    
    // Ensure we always return a proper JSON response
    const errorResponse = {
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' 
        ? (error instanceof Error ? error.message : 'Unknown error')
        : 'Please try again or contact support',
      timestamp: new Date().toISOString()
    }
    
    console.log('📤 Returning error response:', errorResponse)
    
    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}