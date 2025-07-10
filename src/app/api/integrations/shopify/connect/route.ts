// src/app/api/integrations/shopify/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateIntegrationAuthUrl, validatePlatformRequirements } from '@/lib/integrations/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // Verify user authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be signed in to connect integrations' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { shopDomain, organizationId } = body

    // Validate required fields
    if (!shopDomain || !organizationId) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          message: 'Shop domain and organization ID are required'
        },
        { status: 400 }
      )
    }

    // Validate shop domain format
    const validation = validatePlatformRequirements('shopify', { shopDomain })
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid shop domain',
          message: validation.errors[0] || 'Please enter a valid shop domain'
        },
        { status: 400 }
      )
    }

    // Verify user has permission to add integrations for this organization
    const organization = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        members: {
          some: {
            userId: session.user.id,
            role: {
              in: ['owner', 'admin'] // Only owners and admins can add integrations
            }
          }
        }
      },
      include: {
        integrations: {
          where: {
            platform: 'shopify',
            status: 'active'
          }
        }
      }
    })

    if (!organization) {
      return NextResponse.json(
        {
          error: 'Access denied',
          message: 'You do not have permission to add integrations for this organization'
        },
        { status: 403 }
      )
    }

    // Clean and format shop domain
    const cleanShopDomain = shopDomain.toLowerCase().trim()
      .replace(/^https?:\/\//, '') // Remove protocol
      .replace(/\/$/, '') // Remove trailing slash
      .replace('.myshopify.com', '') // Remove .myshopify.com if present

    // Validate shop domain format after cleaning
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9]$/.test(cleanShopDomain)) {
      return NextResponse.json(
        {
          error: 'Invalid shop domain format',
          message: 'Shop domain should only contain letters, numbers, and hyphens'
        },
        { status: 400 }
      )
    }

    // Check if this shop is already connected
    const existingIntegration = organization.integrations.find(
      integration => integration.platformAccountId === cleanShopDomain
    )

    if (existingIntegration) {
      return NextResponse.json(
        {
          error: 'Already connected',
          message: 'This Shopify store is already connected to your organization',
          integration: {
            id: existingIntegration.id,
            accountName: existingIntegration.accountName,
            connectedAt: existingIntegration.connectedAt,
            lastSyncAt: existingIntegration.lastSyncAt
          }
        },
        { status: 409 }
      )
    }

    // Check if shop exists and is accessible
    const shopExists = await verifyShopExists(cleanShopDomain)
    if (!shopExists) {
      return NextResponse.json(
        {
          error: 'Shop not found',
          message: 'The Shopify store could not be found. Please check the domain and try again.'
        },
        { status: 404 }
      )
    }

    // Generate OAuth authorization URL
    try {
      const authUrl = generateIntegrationAuthUrl('shopify', organizationId, cleanShopDomain)
      
      // Log the connection attempt for analytics
      await logConnectionAttempt(organizationId, session.user.id, cleanShopDomain)

      return NextResponse.json({
        success: true,
        authUrl,
        shopDomain: cleanShopDomain,
        message: 'Redirect to Shopify to authorize the connection'
      })

    } catch (error) {
      console.error('Failed to generate auth URL:', error)
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'Failed to generate authorization URL. Please contact support.'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Shopify connect error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}

/**
 * Verify that a Shopify store exists and is accessible
 */
async function verifyShopExists(shopDomain: string): Promise<boolean> {
  try {
    // Make a simple request to the shop's public endpoint
    const response = await fetch(`https://${shopDomain}.myshopify.com/`, {
      method: 'HEAD',
      timeout: 10000 // 10 second timeout
    })

    // If we get any response (even 401/403), the shop exists
    // We only care that the domain resolves and responds
    return response.status !== 404

  } catch (error) {
    // If there's a network error, DNS failure, etc., shop probably doesn't exist
    console.error(`Shop verification failed for ${shopDomain}:`, error)
    return false
  }
}

/**
 * Log connection attempt for analytics and debugging
 */
async function logConnectionAttempt(
  organizationId: string, 
  userId: string, 
  shopDomain: string
): Promise<void> {
  try {
    // This could be expanded to use a dedicated analytics/logging service
    await prisma.integrationAttempt.create({
      data: {
        organizationId,
        userId,
        platform: 'shopify',
        platformAccountId: shopDomain,
        status: 'initiated',
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: 'API', // Could get from request headers
          ipAddress: 'unknown' // Could get from request
        }
      }
    })
  } catch (error) {
    // Don't fail the main request if logging fails
    console.error('Failed to log connection attempt:', error)
  }
}

/**
 * Get user-friendly error messages
 */
function getErrorResponse(error: string, details?: string) {
  const errorMessages: Record<string, { message: string; status: number }> = {
    'unauthorized': {
      message: 'You must be signed in to connect integrations',
      status: 401
    },
    'missing_fields': {
      message: 'Shop domain and organization ID are required',
      status: 400
    },
    'invalid_domain': {
      message: 'Please enter a valid Shopify store domain (e.g., mystore.myshopify.com)',
      status: 400
    },
    'access_denied': {
      message: 'You do not have permission to add integrations for this organization',
      status: 403
    },
    'already_connected': {
      message: 'This Shopify store is already connected to your organization',
      status: 409
    },
    'shop_not_found': {
      message: 'The Shopify store could not be found. Please check the domain and try again.',
      status: 404
    },
    'rate_limited': {
      message: 'Too many connection attempts. Please wait a moment and try again.',
      status: 429
    }
  }

  const errorInfo = errorMessages[error] || {
    message: details || 'An unexpected error occurred',
    status: 500
  }

  return NextResponse.json(
    { error, message: errorInfo.message },
    { status: errorInfo.status }
  )
}

/**
 * Validate request rate limiting (optional enhancement)
 */
async function checkRateLimit(userId: string, organizationId: string): Promise<boolean> {
  try {
    // Check how many connection attempts in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const recentAttempts = await prisma.integrationAttempt.count({
      where: {
        organizationId,
        userId,
        platform: 'shopify',
        createdAt: {
          gte: oneHourAgo
        }
      }
    })

    // Allow max 10 attempts per hour per user per organization
    return recentAttempts < 10

  } catch (error) {
    console.error('Rate limit check failed:', error)
    // If rate limit check fails, allow the request
    return true
  }
}