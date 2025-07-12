// src/app/api/integrations/shopify/private-app/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  console.log('🔄 Shopify Private App - Starting request')
  console.log('📋 Request method:', req.method)
  console.log('📋 Request URL:', req.url)
  console.log('📋 Request headers:', Object.fromEntries(req.headers.entries()))
  
  try {
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('❌ No valid session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ Session valid for user:', session.user.id)

    // Verify user exists in database and create if needed
    console.log('👤 Verifying user exists in database...')
    let dbUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!dbUser) {
      console.log('🆕 User not found in database, creating user record...')
      try {
        dbUser = await prisma.user.create({
          data: {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.name || null,
            image: session.user.image || null
          }
        })
        console.log('✅ User created successfully:', dbUser.id)
      } catch (userError) {
        console.error('❌ Failed to create user:', userError)
        return NextResponse.json({
          error: 'Failed to create user account',
          details: 'Database user creation failed'
        }, { status: 500 })
      }
    } else {
      console.log('✅ User found in database:', dbUser.id)
    }

    const body = await req.json().catch(err => {
      console.error('❌ Failed to parse request body:', err)
      throw new Error('Invalid JSON in request body')
    })
    const { shopDomain, accessToken } = body

    console.log('📋 Request body parsed successfully:', { 
      shopDomain, 
      accessToken: accessToken ? 'PROVIDED' : 'MISSING',
      bodyKeys: Object.keys(body)
    })

    // Validation
    if (!shopDomain || !accessToken) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { error: 'Shop domain and access token are required' },
        { status: 400 }
      )
    }

    // Clean and validate access token
    const cleanAccessToken = accessToken.trim()
    console.log('🔑 Token validation:', {
      originalLength: accessToken.length,
      cleanedLength: cleanAccessToken.length,
      startsWithShpat: cleanAccessToken.startsWith('shpat_'),
      firstChars: cleanAccessToken.substring(0, 10),
      tokenPreview: `${cleanAccessToken.substring(0, 10)}...${cleanAccessToken.substring(-5)}`
    })

    if (!cleanAccessToken.startsWith('shpat_')) {
      console.log('❌ Invalid access token format')
      console.log('Token received:', JSON.stringify(accessToken))
      console.log('Token cleaned:', JSON.stringify(cleanAccessToken))
      return NextResponse.json(
        { 
          error: 'Invalid access token format. Token should start with "shpat_"',
          debug: {
            receivedLength: accessToken.length,
            cleanedLength: cleanAccessToken.length,
            firstChars: cleanAccessToken.substring(0, 10)
          }
        },
        { status: 400 }
      )
    }

    // Clean shop domain
    let cleanShopDomain = shopDomain.trim().toLowerCase()
    cleanShopDomain = cleanShopDomain.replace(/^https?:\/\//, '')
    cleanShopDomain = cleanShopDomain.replace(/^www\./, '')
    cleanShopDomain = cleanShopDomain.replace(/\.myshopify\.com\/?$/, '')
    cleanShopDomain = cleanShopDomain.replace(/\/.*$/, '')

    console.log('🧹 Domain cleaning:', {
      original: shopDomain,
      cleaned: cleanShopDomain
    })

    // Validate the access token by making a test API call
    console.log('🔑 Validating access token...')
    const shopUrl = `https://${cleanShopDomain}.myshopify.com`
    
    try {
      const testResponse = await fetch(`${shopUrl}/admin/api/2023-10/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': cleanAccessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!testResponse.ok) {
        console.log('❌ Access token validation failed:', testResponse.status)
        const errorText = await testResponse.text()
        console.log('Error details:', errorText)
        
        if (testResponse.status === 401) {
          return NextResponse.json(
            { error: 'Invalid access token. Please check your token and try again.' },
            { status: 401 }
          )
        } else if (testResponse.status === 404) {
          return NextResponse.json(
            { error: 'Shop not found. Please check your shop domain.' },
            { status: 404 }
          )
        } else {
          return NextResponse.json(
            { error: 'Failed to connect to Shopify. Please check your credentials.' },
            { status: 400 }
          )
        }
      }

      const shopData = await testResponse.json()
      console.log('✅ Access token validated successfully')
      console.log('🏪 Shop info:', shopData.shop?.name, shopData.shop?.domain)

    } catch (tokenError) {
      console.error('❌ Error validating access token:', tokenError)
      return NextResponse.json(
        { error: 'Failed to validate access token. Please check your internet connection and try again.' },
        { status: 500 }
      )
    }

    // Get or create organization using simplified approach
    console.log('🏢 Getting or creating user organization...')
    let organizationId: string
    let organizationName: string

    try {
      // First, try to find existing membership
      console.log('🔍 Searching for existing organization membership...')
      const existingMembership = await prisma.organizationMember.findFirst({
        where: { userId: dbUser.id },
        include: { organization: true }
      })

      if (existingMembership) {
        console.log('✅ Found existing organization:', existingMembership.organization.id)
        organizationId = existingMembership.organizationId
        organizationName = existingMembership.organization.name
      } else {
        console.log('🆕 No existing organization found, creating new one...')
        
        // Generate unique slug using timestamp and random element
        const timestamp = Date.now()
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        const userIdShort = session.user.id.slice(-6)
        const organizationSlug = `org-${userIdShort}-${randomSuffix}`
        
        const orgName = `${dbUser.name || dbUser.email || 'User'}'s Organization`
        
        console.log('🏷️ Creating organization with details:', { 
          name: orgName, 
          slug: organizationSlug,
          userId: session.user.id 
        })

        try {
          // Create organization first
          console.log('📝 Creating organization record...')
          const organization = await prisma.organization.create({
            data: {
              name: orgName,
              slug: organizationSlug,
              subscriptionTier: 'free'
            }
          })
          console.log('✅ Organization created successfully:', organization.id)

          // Then create membership
          console.log('👤 Creating organization membership...')
          await prisma.organizationMember.create({
            data: {
              organizationId: organization.id,
              userId: dbUser.id,
              role: 'owner'
            }
          })
          console.log('✅ Membership created successfully')

          organizationId = organization.id
          organizationName = organization.name
          
        } catch (createError) {
          console.error('❌ Error during organization creation:', createError)
          
          // Log specific error details
          if (createError instanceof Error) {
            console.error('Error message:', createError.message)
            console.error('Error stack:', createError.stack)
          }
          
          // Check if it's a constraint error
          if (createError instanceof Error && createError.message.includes('unique')) {
            console.log('🔄 Unique constraint violation, trying with different slug...')
            
            // Try with a different slug
            const newSlug = `${organizationSlug}-${Date.now()}`
            console.log('🆕 Retrying with slug:', newSlug)
            
            try {
              const retryOrg = await prisma.organization.create({
                data: {
                  name: orgName,
                  slug: newSlug,
                  subscriptionTier: 'free'
                }
              })
              
              await prisma.organizationMember.create({
                data: {
                  organizationId: retryOrg.id,
                  userId: dbUser.id,
                  role: 'owner'
                }
              })
              
              organizationId = retryOrg.id
              organizationName = retryOrg.name
              console.log('✅ Retry successful with organization:', organizationId)
              
            } catch (retryError) {
              console.error('❌ Retry also failed:', retryError)
              throw retryError
            }
          } else {
            throw createError
          }
        }
      }
    } catch (orgError) {
      console.error('❌ Critical organization setup error:', orgError)
      
      // One final attempt to find existing organization
      console.log('🔄 Final attempt to find existing organization...')
      const finalRetryMembership = await prisma.organizationMember.findFirst({
        where: { userId: dbUser.id },
        include: { organization: true }
      }).catch(err => {
        console.error('❌ Final retry query failed:', err)
        return null
      })

      if (finalRetryMembership) {
        console.log('✅ Found organization on final retry')
        organizationId = finalRetryMembership.organizationId
        organizationName = finalRetryMembership.organization.name
      } else {
        console.error('❌ Complete failure - no organization could be created or found')
        
        // Return detailed error for debugging
        const errorDetails = orgError instanceof Error ? orgError.message : 'Unknown error'
        return NextResponse.json(
          { 
            error: 'Failed to set up user organization',
            details: errorDetails,
            userId: session.user.id,
            debugInfo: {
              hasSession: !!session,
              userId: session.user.id,
              userEmail: session.user.email,
              errorType: orgError instanceof Error ? orgError.constructor.name : 'Unknown'
            }
          },
          { status: 500 }
        )
      }
    }

    console.log('🏢 Using organization:', organizationId)

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
        accessToken: cleanAccessToken,
        status: 'active',
        lastSyncAt: null
      }
    })

    console.log('✅ Integration created:', integration.id)

    // Create some sample data points for demo (optional)
    console.log('📊 Creating sample data...')
    try {
      await createSampleShopifyData(integration.id)
      console.log('✅ Sample data created')
    } catch (dataError) {
      console.error('⚠️ Error creating sample data (non-critical):', dataError)
      // Don't fail the whole operation for sample data issues
    }

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
        name: organizationName
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
          type: 'private_app'
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
          type: 'private_app'
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
          type: 'private_app'
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
          type: 'private_app'
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