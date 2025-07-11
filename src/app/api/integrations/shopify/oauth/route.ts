// src/app/api/integrations/shopify/oauth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { shopDomain, orgId } = body

    // Validation
    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Shop domain is required' },
        { status: 400 }
      )
    }

    // Get or create organization for the user
    let userMembership = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id
      },
      include: {
        organization: true
      }
    })

    // If no membership exists, create a default organization
    if (!userMembership) {
      console.log('Creating default organization for user:', session.user.id)
      
      const organization = await prisma.organization.create({
        data: {
          name: `${session.user.name || session.user.email}'s Organization`,
          slug: `org-${session.user.id.slice(-8)}`,
          subscriptionTier: 'free'
        }
      })

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
    }

    const organizationId = userMembership.organizationId

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
    
    // Validate domain format (allow alphanumeric and hyphens, minimum 3 characters)
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(cleanShopDomain) || cleanShopDomain.length < 3) {
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

    console.log('Processing shop domain:', {
      original: shopDomain,
      cleaned: cleanShopDomain,
      isValid: true
    })

    // Check if integration already exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId: organizationId,
        platform: 'shopify',
        platformAccountId: cleanShopDomain
      }
    })

    if (existingIntegration) {
      return NextResponse.json(
        { error: 'Shopify integration already exists for this store' },
        { status: 409 }
      )
    }

    // Generate a mock access token for demo
    const mockAccessToken = `mock_token_${crypto.randomBytes(16).toString('hex')}`
    
    // Create the integration
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

    // Create some sample data points for demo
    await createSampleShopifyData(integration.id)

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