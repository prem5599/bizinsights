// src/app/api/integrations/shopify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

interface ShopifyTokenResponse {
  access_token: string
  scope: string
}

interface ShopifyShopResponse {
  shop: {
    id: number
    name: string
    email: string
    domain: string
    myshopify_domain: string
    plan_name: string
    timezone: string
    currency: string
    country_name: string
    created_at: string
  }
}

// Verify Shopify webhook/callback authenticity
function verifyShopifyHmac(data: string, hmacHeader: string, secret: string): boolean {
  const calculatedHmac = crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('base64')
  
  return crypto.timingSafeEqual(
    Buffer.from(calculatedHmac),
    Buffer.from(hmacHeader)
  )
}

// Exchange authorization code for access token
async function exchangeCodeForToken(shop: string, code: string): Promise<ShopifyTokenResponse> {
  const clientId = process.env.SHOPIFY_CLIENT_ID!
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`)
  }

  return response.json()
}

// Fetch shop information using access token
async function fetchShopInfo(shop: string, accessToken: string): Promise<ShopifyShopResponse> {
  const response = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch shop info: ${response.status} ${errorText}`)
  }

  return response.json()
}

// Create webhook for real-time data updates
async function createWebhook(shop: string, accessToken: string, topic: string): Promise<any> {
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/shopify`
  
  const response = await fetch(`https://${shop}/admin/api/2023-10/webhooks.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      webhook: {
        topic: topic,
        address: webhookUrl,
        format: 'json'
      }
    })
  })

  if (!response.ok) {
    console.warn(`Failed to create webhook for ${topic}:`, await response.text())
    return null
  }

  return response.json()
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const hmac = searchParams.get('hmac')

    // Validate required parameters
    if (!code || !shop || !state || !hmac) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations?error=missing_parameters`
      )
    }

    // Find the pending integration using the state parameter
    const integration = await prisma.integration.findFirst({
      where: {
        platform: 'shopify',
        status: 'pending',
        metadata: {
          path: ['state'],
          equals: state
        }
      },
      include: {
        organization: true
      }
    })

    if (!integration) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations?error=invalid_state`
      )
    }

    // Verify HMAC signature for security
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET!
    const queryString = new URL(req.url).search.substring(1)
    const hmacParams = queryString.split('&').filter(param => !param.startsWith('hmac='))
    const sortedParams = hmacParams.sort().join('&')
    
    if (!verifyShopifyHmac(sortedParams, hmac, clientSecret)) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/integrations?error=invalid_hmac`
      )
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await exchangeCodeForToken(shop, code)
      
      // Fetch shop information
      const shopInfo = await fetchShopInfo(shop, tokenResponse.access_token)

      // Create essential webhooks for real-time updates
      const webhookTopics = [
        'orders/create',
        'orders/updated',
        'orders/paid',
        'orders/cancelled',
        'customers/create',
        'customers/update',
        'app/uninstalled'
      ]

      const webhookResults = await Promise.allSettled(
        webhookTopics.map(topic => createWebhook(shop, tokenResponse.access_token, topic))
      )

      const successfulWebhooks = webhookResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .map((result: any) => result.value.webhook)

      // Update the integration with the access token and shop info
      const updatedIntegration = await prisma.integration.update({
        where: {
          id: integration.id
        },
        data: {
          accessToken: tokenResponse.access_token,
          status: 'active',
          platformAccountId: shopInfo.shop.myshopify_domain,
          metadata: JSON.stringify({
            ...(typeof integration.metadata === 'string' ? JSON.parse(integration.metadata) : integration.metadata),
            shopInfo: {
              id: shopInfo.shop.id,
              name: shopInfo.shop.name,
              domain: shopInfo.shop.domain,
              email: shopInfo.shop.email,
              planName: shopInfo.shop.plan_name,
              timezone: shopInfo.shop.timezone,
              currency: shopInfo.shop.currency,
              country: shopInfo.shop.country_name,
              createdAt: shopInfo.shop.created_at
            },
            scopes: tokenResponse.scope.split(','),
            webhooks: successfulWebhooks.map(webhook => ({
              id: webhook.id,
              topic: webhook.topic,
              createdAt: webhook.created_at
            })),
            connectedAt: new Date().toISOString()
          }),
          lastSyncAt: new Date()
        }
      })

      // Get the return URL from metadata
      const returnUrl = (integration.metadata as any)?.returnUrl || 
        `${process.env.NEXTAUTH_URL}/${integration.organization.slug}/integrations`

      // Redirect to success page
      return NextResponse.redirect(
        `${returnUrl}?success=shopify_connected&shop=${shopInfo.shop.name}`
      )

    } catch (tokenError) {
      console.error('Error during token exchange or shop setup:', tokenError)
      
      // Update integration status to error
      await prisma.integration.update({
        where: {
          id: integration.id
        },
        data: {
          status: 'error',
          metadata: JSON.stringify({
            ...(typeof integration.metadata === 'string' ? JSON.parse(integration.metadata) : integration.metadata),
            error: {
              message: tokenError instanceof Error ? tokenError.message : 'Unknown error',
              timestamp: new Date().toISOString()
            }
          })
        }
      })

      const returnUrl = (integration.metadata as any)?.returnUrl || 
        `${process.env.NEXTAUTH_URL}/${integration.organization.slug}/integrations`

      return NextResponse.redirect(
        `${returnUrl}?error=connection_failed`
      )
    }

  } catch (error) {
    console.error('Shopify callback error:', error)
    
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/integrations?error=callback_error`
    )
  }
}

// Handle POST requests (for testing or manual callbacks)
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: 'POST method not supported for this endpoint' },
    { status: 405 }
  )
}