// src/app/api/integrations/shopify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ShopifyIntegration } from '@/lib/integrations/shopify'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // Get session to ensure user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin?error=unauthorized', req.url))
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const shop = searchParams.get('shop')
    const hmac = searchParams.get('hmac')
    const timestamp = searchParams.get('timestamp')

    // Validate required parameters
    if (!code || !state || !shop) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=missing_parameters', req.url)
      )
    }

    // Verify HMAC signature for security
    if (!verifyShopifyCallback(req.url)) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=invalid_signature', req.url)
      )
    }

    // Parse state to get organization info
    let organizationId: string
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      organizationId = stateData.organizationId
      
      // Verify timestamp is recent (within 10 minutes)
      const stateTimestamp = stateData.timestamp
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
      if (stateTimestamp < tenMinutesAgo) {
        throw new Error('State expired')
      }
    } catch (error) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=invalid_state', req.url)
      )
    }

    // Verify user has access to this organization
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
      }
    })

    if (!organization) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=access_denied', req.url)
      )
    }

    // Clean shop domain
    const shopDomain = shop.replace('.myshopify.com', '')

    // Exchange code for access token
    const tokens = await ShopifyIntegration.exchangeCodeForToken(shop, code)

    // Test the connection
    const shopifyIntegration = new ShopifyIntegration(tokens.accessToken, shopDomain)
    const isConnected = await shopifyIntegration.testConnection()

    if (!isConnected) {
      return NextResponse.redirect(
        new URL('/dashboard/integrations?error=connection_failed', req.url)
      )
    }

    // Get shop information
    const shopInfo = await shopifyIntegration.getShopInfo()

    // Check if integration already exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'shopify',
        platformAccountId: shopDomain
      }
    })

    if (existingIntegration) {
      // Update existing integration
      await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          status: 'active',
          metadata: {
            shopId: shopInfo.id,
            shopName: shopInfo.name,
            shopDomain: shopInfo.domain,
            currency: shopInfo.currency,
            timezone: shopInfo.timezone,
            planName: shopInfo.planName,
            updatedAt: new Date().toISOString()
          },
          connectedAt: new Date(),
          lastSyncAt: null // Will be updated on first sync
        }
      })
    } else {
      // Create new integration
      await prisma.integration.create({
        data: {
          organizationId,
          platform: 'shopify',
          platformAccountId: shopDomain,
          accountName: shopInfo.name,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          status: 'active',
          metadata: {
            shopId: shopInfo.id,
            shopName: shopInfo.name,
            shopDomain: shopInfo.domain,
            currency: shopInfo.currency,
            timezone: shopInfo.timezone,
            planName: shopInfo.planName,
            createdAt: new Date().toISOString()
          },
          connectedAt: new Date(),
          connectedBy: session.user.id
        }
      })
    }

    // Trigger initial data sync in the background
    try {
      await fetch(`${process.env.APP_URL}/api/integrations/shopify/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}` // For internal API calls
        },
        body: JSON.stringify({
          organizationId,
          shopDomain,
          initialSync: true
        })
      })
    } catch (syncError) {
      console.error('Failed to trigger initial sync:', syncError)
      // Don't fail the integration setup if sync fails - it can be retried later
    }

    // Set up webhooks for real-time updates
    try {
      await setupShopifyWebhooks(shopifyIntegration, organizationId)
    } catch (webhookError) {
      console.error('Failed to setup webhooks:', webhookError)
      // Don't fail integration if webhooks fail - they can be set up later
    }

    // Redirect back to integrations page with success message
    return NextResponse.redirect(
      new URL('/dashboard/integrations?success=shopify_connected', req.url)
    )

  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    
    return NextResponse.redirect(
      new URL('/dashboard/integrations?error=connection_error', req.url)
    )
  }
}

/**
 * Verify Shopify callback HMAC signature
 */
function verifyShopifyCallback(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    const hmac = parsedUrl.searchParams.get('hmac')
    
    if (!hmac) {
      return false
    }

    // Remove hmac and signature from params for verification
    const params = new URLSearchParams(parsedUrl.search)
    params.delete('hmac')
    params.delete('signature')

    // Sort parameters
    const sortedParams = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&')

    // Calculate HMAC
    const crypto = require('crypto')
    const calculatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_CLIENT_SECRET!)
      .update(sortedParams)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(calculatedHmac, 'hex')
    )
  } catch (error) {
    console.error('HMAC verification error:', error)
    return false
  }
}

/**
 * Set up Shopify webhooks for real-time data updates
 */
async function setupShopifyWebhooks(
  shopifyIntegration: ShopifyIntegration, 
  organizationId: string
): Promise<void> {
  const webhookUrl = `${process.env.APP_URL}/api/integrations/shopify/webhooks`
  
  const webhooks = [
    {
      topic: 'orders/create',
      address: webhookUrl,
      format: 'json'
    },
    {
      topic: 'orders/updated',
      address: webhookUrl,
      format: 'json'
    },
    {
      topic: 'orders/paid',
      address: webhookUrl,
      format: 'json'
    },
    {
      topic: 'orders/cancelled',
      address: webhookUrl,
      format: 'json'
    }
  ]

  for (const webhook of webhooks) {
    try {
      const response = await fetch(
        `https://${shopifyIntegration['shopDomain']}.myshopify.com/admin/api/2024-01/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyIntegration['accessToken'],
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webhook: {
              ...webhook,
              // Add organization ID to webhook URL for routing
              address: `${webhook.address}?org=${organizationId}`
            }
          })
        }
      )

      if (!response.ok) {
        const error = await response.text()
        console.error(`Failed to create webhook ${webhook.topic}:`, error)
      } else {
        const data = await response.json()
        console.log(`Webhook created: ${webhook.topic}`, data.webhook.id)
      }
    } catch (error) {
      console.error(`Error creating webhook ${webhook.topic}:`, error)
    }
  }
}

/**
 * Handle errors and provide user-friendly messages
 */
function getErrorMessage(error: string): string {
  const errorMessages: Record<string, string> = {
    unauthorized: 'You must be signed in to connect integrations',
    missing_parameters: 'Missing required parameters from Shopify',
    invalid_signature: 'Invalid request signature',
    invalid_state: 'Invalid or expired authorization state',
    access_denied: 'You do not have permission to add integrations',
    connection_failed: 'Failed to connect to Shopify',
    connection_error: 'An error occurred during connection'
  }

  return errorMessages[error] || 'An unknown error occurred'
}