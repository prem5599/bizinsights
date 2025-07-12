// src/app/api/integrations/shopify/oauth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Shopify OAuth - Starting request')
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ No valid session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Session valid for user:', session.user.id)

    const body = await req.json()
    const { shopDomain, orgId } = body

    console.log('📋 Request body:', { shopDomain, orgId })

    // Validation
    if (!shopDomain) {
      console.log('❌ Shop domain missing')
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      )
    }

    // Get or create organization for the user
    console.log('🔍 Looking for user membership...')
    let userMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id
      },
      include: {
        organization: true
      }
    })

    console.log('📊 User membership found:', userMembership ? 'Yes' : 'No')

    // If no membership exists, create a default organization
    if (!userMembership) {
      console.log('🏢 Creating default organization for user:', session.user.id)
      
      try {
        const organizationSlug = `org-${session.user.id.slice(-8)}-${Date.now()}`
        console.log('🏷️ Organization slug:', organizationSlug)
        
        const organization = await prisma.organization.create({
          data: {
            name: `${session.user.name || session.user.email}'s Organization`,
            slug: organizationSlug,
            subscriptionTier: 'free'
          }
        })

        console.log('✅ Organization created:', organization.id)

        userMembership = await prisma.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: session.user.id,
            role: 'owner'
          },
          include: {
            organization: true
          }
        })

        console.log('✅ Membership created:', userMembership.id)
      } catch (orgError) {
        console.error('❌ Error creating organization:', orgError)
        return NextResponse.json(
          { 
            error: 'Failed to create organization',
            details: orgError instanceof Error ? orgError.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }

    const organizationId = userMembership.organizationId
    console.log('🏢 Using organization ID:', organizationId)

    // Clean shop domain (remove .myshopify.com if present, handle different formats)
    let cleanShopDomain = shopDomain.trim().toLowerCase()
    
    // Remove common prefixes and suffixes
    cleanShopDomain = cleanShopDomain.replace(/^https?:\/\//, '') // Remove http:// or https://
    cleanShopDomain = cleanShopDomain.replace(/^www\./, '') // Remove www.
    cleanShopDomain = cleanShopDomain.replace(/\.myshopify\.com\/?$/, '') // Remove .myshopify.com with optional trailing slash
    cleanShopDomain = cleanShopDomain.replace(/\/.*$/, '') // Remove any remaining path after domain
    
    // If it's a custom domain, extract the main part
    if (cleanShopDomain.includes('.') && !cleanShopDomain.includes('myshopify')) {
      // For custom domains like example.com, use the domain name without TLD for platform ID
      const domainParts = cleanShopDomain.split('.')
      if (domainParts.length >= 2) {
        cleanShopDomain = domainParts[domainParts.length - 2] // Get the main domain part
      }
    }
    
    console.log('🧹 Domain cleaning:', {
      original: shopDomain,
      cleaned: cleanShopDomain
    })
    
    // Validate domain format (allow alphanumeric and hyphens, minimum 3 characters)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(cleanShopDomain) || cleanShopDomain.length < 3) {
      console.log('❌ Invalid domain format:', cleanShopDomain)
      return NextResponse.json(
        { 
          error: 'Please enter a valid shop domain', 
          details: `Processed domain "${cleanShopDomain}" is not valid. Please use formats like: mystore.myshopify.com, mystore.com, or just mystore`,
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

    // Create some sample data points for demo
    console.log('📊 Creating sample data...')
    try {
      await createSampleShopifyData(integration.id)
      console.log('✅ Sample data created')
    } catch (dataError) {
      console.error('⚠️ Error creating sample data (non-critical):', dataError)
      // Don't fail the whole operation for sample data issues
    }

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
}

// Helper function to create sample data for demo
async function createSampleShopifyData(integrationId: string) {
  const sampleDataPoints = []
  const now = new Date()
  
  // Generate 30 days of sample data
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000)
    const baseRevenue = 800 + Math.random() * 400 // $800-$1200 per day
    const orders = Math.floor(8 + Math.random() * 12) // 8-20 orders per day
    const customers = Math.floor(orders * 0.7) // ~70% of orders are from different customers
    
    sampleDataPoints.push(
      {
        integrationId,
        metricType: 'revenue',
        value: baseRevenue,
        metadata: { 
          currency: 'USD', 
          source: 'shopify',
          demo: true 
        },
        dateRecorded: date,
        createdAt: new Date()
      },
      {
        integrationId,
        metricType: 'orders',
        value: orders,
        metadata: { 
          source: 'shopify',
          demo: true 
        },
        dateRecorded: date,
        createdAt: new Date()
      },
      {
        integrationId,
        metricType: 'customers',
        value: customers,
        metadata: { 
          source: 'shopify',
          demo: true 
        },
        dateRecorded: date,
        createdAt: new Date()
      },
      {
        integrationId,
        metricType: 'sessions',
        value: Math.floor(150 + Math.random() * 100), // 150-250 sessions
        metadata: { 
          source: 'shopify',
          demo: true 
        },
        dateRecorded: date,
        createdAt: new Date()
      }
    )
  }

  // Batch create the sample data
  await prisma.dataPoint.createMany({
    data: sampleDataPoints,
    skipDuplicates: true
  })

  console.log(`Created ${sampleDataPoints.length} sample data points for Shopify integration ${integrationId}`)
}