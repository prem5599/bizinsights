// src/app/api/integrations/shopify/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ Unauthorized: No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { shopDomain, accessToken, organizationId } = body

    console.log('🔗 Shopify Real Integration request:', { shopDomain, organizationId, userId: session.user.id })

    if (!shopDomain || !accessToken || !organizationId) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Shop domain, access token, and organization ID are required' },
        { status: 400 }
      )
    }

    // Verify user has admin access to this organization
    const userMembership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      },
      include: {
        organization: true
      }
    })

    if (!userMembership) {
      console.log('❌ Access denied: User not admin of organization')
      return NextResponse.json(
        { error: 'Admin access required for this organization' },
        { status: 403 }
      )
    }

    // Clean and validate shop domain
    console.log('🧹 Cleaning shop domain...')
    const cleanShopDomain = shopDomain.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\.myshopify\.com\/?$/, '')
      .replace(/\/$/, '')

    const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-_]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/
    if (!domainPattern.test(cleanShopDomain)) {
      console.log('❌ Invalid domain format:', cleanShopDomain)
      return NextResponse.json(
        {
          error: 'Invalid shop domain format. Please use formats like: mystore.myshopify.com, mystore.com, or just mystore',
          processed: cleanShopDomain,
          original: shopDomain
        },
        { status: 400 }
      )
    }

    // Validate access token format
    if (!accessToken.startsWith('shpat_')) {
      return NextResponse.json(
        { error: 'Invalid access token format. Shopify access tokens must start with "shpat_"' },
        { status: 400 }
      )
    }

    console.log('✅ Domain and token validation passed')

    // Test the Shopify connection first
    console.log('🧪 Testing Shopify connection...')
    try {
      await testShopifyConnection(cleanShopDomain, accessToken)
      console.log('✅ Shopify connection test successful')
    } catch (testError) {
      console.error('❌ Shopify connection test failed:', testError)
      return NextResponse.json(
        { 
          error: 'Failed to connect to Shopify store. Please verify your shop domain and access token.',
          details: testError instanceof Error ? testError.message : 'Connection test failed'
        },
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
        accessToken: accessToken,
        status: 'active',
        lastSyncAt: null,
        metadata: {
          shopDomain: cleanShopDomain,
          integrationMethod: 'private_app'
        }
      }
    })

    console.log('✅ Integration created:', integration.id)

    // Start initial data sync from real Shopify API
    console.log('🔄 Starting real data sync...')
    try {
      await syncRealShopifyData(integration.id, cleanShopDomain, accessToken)
      console.log('✅ Real data sync completed')
      
      // Update last sync timestamp
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() }
      })
      
    } catch (syncError) {
      console.error('❌ Error syncing real data:', syncError)
      // Delete the integration if data sync fails
      await prisma.integration.delete({ where: { id: integration.id } })
      return NextResponse.json(
        { 
          error: 'Failed to sync data from Shopify. Please check your access token permissions.',
          details: syncError instanceof Error ? syncError.message : 'Data sync failed'
        },
        { status: 400 }
      )
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
      message: 'Shopify store connected successfully with real data'
    })

  } catch (error) {
    console.error('Shopify Real Integration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Test Shopify connection with provided credentials
 */
async function testShopifyConnection(shopDomain: string, accessToken: string) {
  const testUrl = `https://${shopDomain}.myshopify.com/admin/api/2023-10/shop.json`
  
  const response = await fetch(testUrl, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Shopify API responded with ${response.status}: ${response.statusText}. ${errorText}`)
  }

  const shopData = await response.json()
  
  if (!shopData.shop) {
    throw new Error('Invalid response from Shopify API')
  }

  console.log('✅ Connected to Shopify store:', shopData.shop.name)
  return shopData.shop
}

/**
 * Sync real data from Shopify API
 */
async function syncRealShopifyData(integrationId: string, shopDomain: string, accessToken: string) {
  console.log('📊 Fetching real Shopify data...')
  
  // Calculate date range for initial sync (last 30 days)
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  const startDateISO = startDate.toISOString()

  try {
    // Fetch real orders from Shopify
    const ordersResponse = await fetch(
      `https://${shopDomain}.myshopify.com/admin/api/2023-10/orders.json?status=any&created_at_min=${startDateISO}&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text()
      console.error('Shopify Orders API Error:', errorText)
      throw new Error(`Failed to fetch orders: ${ordersResponse.status} ${ordersResponse.statusText}`)
    }

    const ordersData = await ordersResponse.json()
    const orders = ordersData.orders || []

    console.log(`📦 Found ${orders.length} orders from Shopify`)

    // Fetch customers
    const customersResponse = await fetch(
      `https://${shopDomain}.myshopify.com/admin/api/2023-10/customers.json?created_at_min=${startDateISO}&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    )

    let customers = []
    if (customersResponse.ok) {
      const customersData = await customersResponse.json()
      customers = customersData.customers || []
      console.log(`👥 Found ${customers.length} customers from Shopify`)
    } else {
      console.warn('Could not fetch customers, continuing with orders only')
    }

    // Fetch products for additional metrics
    const productsResponse = await fetch(
      `https://${shopDomain}.myshopify.com/admin/api/2023-10/products.json?limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    )

    let products = []
    if (productsResponse.ok) {
      const productsData = await productsResponse.json()
      products = productsData.products || []
      console.log(`🛍️ Found ${products.length} products from Shopify`)
    }

    // Process and store the real data
    await processRealShopifyData(integrationId, orders, customers, products)

    console.log('✅ Real Shopify data processed successfully')

  } catch (error) {
    console.error('❌ Failed to fetch real Shopify data:', error)
    throw error
  }
}

/**
 * Process real Shopify data and store as data points
 */
async function processRealShopifyData(integrationId: string, orders: any[], customers: any[], products: any[] = []) {
  const dataPoints = []
  
  // Group orders by date and process metrics
  const ordersByDate = new Map<string, { revenue: number; orderCount: number; customerIds: Set<string> }>()
  
  orders.forEach(order => {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0]
    const revenue = parseFloat(order.total_price || '0')
    const customerId = order.customer?.id || null
    
    if (!ordersByDate.has(orderDate)) {
      ordersByDate.set(orderDate, {
        revenue: 0,
        orderCount: 0,
        customerIds: new Set()
      })
    }
    
    const dayData = ordersByDate.get(orderDate)!
    dayData.revenue += revenue
    dayData.orderCount += 1
    if (customerId) {
      dayData.customerIds.add(customerId.toString())
    }
  })
  
  // Create data points for each date
  ordersByDate.forEach((dayData, dateStr) => {
    const date = new Date(dateStr)
    
    // Revenue data point
    dataPoints.push({
      integrationId,
      metricType: 'revenue',
      value: dayData.revenue,
      metadata: {
        currency: 'USD',
        source: 'shopify',
        type: 'real_data',
        orderCount: dayData.orderCount
      },
      dateRecorded: date,
      createdAt: new Date()
    })
    
    // Orders data point
    dataPoints.push({
      integrationId,
      metricType: 'orders',
      value: dayData.orderCount,
      metadata: {
        source: 'shopify',
        type: 'real_data',
        avgOrderValue: dayData.orderCount > 0 ? dayData.revenue / dayData.orderCount : 0
      },
      dateRecorded: date,
      createdAt: new Date()
    })
    
    // Customers data point (unique customers per day)
    dataPoints.push({
      integrationId,
      metricType: 'customers',
      value: dayData.customerIds.size,
      metadata: {
        source: 'shopify',
        type: 'real_data',
        totalCustomers: dayData.customerIds.size
      },
      dateRecorded: date,
      createdAt: new Date()
    })
  })

  // Add product count as a separate metric
  if (products.length > 0) {
    const today = new Date()
    dataPoints.push({
      integrationId,
      metricType: 'products',
      value: products.length,
      metadata: {
        source: 'shopify',
        type: 'real_data',
        activeProducts: products.filter(p => p.status === 'active').length
      },
      dateRecorded: today,
      createdAt: new Date()
    })
  }

  // Store all data points
  if (dataPoints.length > 0) {
    await prisma.dataPoint.createMany({
      data: dataPoints,
      skipDuplicates: true
    })
    
    console.log(`💾 Stored ${dataPoints.length} real data points from Shopify`)
  } else {
    console.log('⚠️ No data points to store - store may be empty or have no recent orders')
  }
}