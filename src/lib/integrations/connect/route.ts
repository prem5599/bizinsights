// app/api/integrations/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ShopifyIntegration } from '@/lib/integrations/shopify'
import { StripeIntegration } from '@/lib/integrations/stripe'
import { IntegrationManager } from '@/lib/integrations/manager'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platform, authCode, organizationId, shopDomain } = await req.json()

    // Verify user has access to organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let accessToken: string
    let refreshToken: string | undefined
    let platformAccountId: string | undefined

    switch (platform) {
      case 'shopify':
        if (!shopDomain) {
          return NextResponse.json({ error: 'Shop domain is required for Shopify' }, { status: 400 })
        }
        accessToken = await ShopifyIntegration.exchangeCodeForToken(authCode, shopDomain)
        platformAccountId = shopDomain
        break

      case 'stripe':
        const stripeTokens = await StripeIntegration.exchangeCodeForToken(authCode)
        accessToken = stripeTokens.accessToken
        platformAccountId = stripeTokens.accountId
        break

      default:
        return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 })
    }

    // Store or update integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform
        }
      },
      update: {
        accessToken,
        refreshToken,
        platformAccountId,
        status: 'active',
        tokenExpiresAt: getTokenExpiryDate(platform)
      },
      create: {
        organizationId,
        platform,
        platformAccountId,
        accessToken,
        refreshToken,
        status: 'active',
        tokenExpiresAt: getTokenExpiryDate(platform)
      }
    })

    // Test the connection
    const connectionTest = await IntegrationManager.testIntegration(integration.id)
    if (!connectionTest) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'error' }
      })
      return NextResponse.json({ error: 'Failed to connect to platform' }, { status: 400 })
    }

    // Start initial data sync in background
    setImmediate(async () => {
      try {
        await IntegrationManager.syncIntegration(integration.id)
      } catch (error) {
        console.error('Background sync failed:', error)
      }
    })

    return NextResponse.json({ 
      success: true, 
      integration: {
        id: integration.id,
        platform: integration.platform,
        status: integration.status,
        createdAt: integration.createdAt
      }
    })

  } catch (error) {
    console.error('Integration connect error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function getTokenExpiryDate(platform: string): Date | null {
  switch (platform) {
    case 'stripe':
      return null // Stripe tokens don't expire
    case 'shopify':
      return null // Shopify tokens don't expire for private apps
    default:
      return null
  }
}