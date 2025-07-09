// app/api/integrations/shopify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ShopifyIntegration } from '@/lib/integrations/shopify'
import { IntegrationManager } from '@/lib/integrations/manager'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.redirect(`${process.env.APP_URL}/auth/signin?error=unauthorized`)
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Shopify OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=oauth_error&platform=shopify`
      )
    }

    // Validate required parameters
    if (!code || !shop) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=missing_params&platform=shopify`
      )
    }

    // Parse state to get organization ID
    let organizationId: string
    try {
      const stateData = state ? JSON.parse(Buffer.from(state, 'base64').toString()) : {}
      organizationId = stateData.organizationId
    } catch (error) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=invalid_state&platform=shopify`
      )
    }

    if (!organizationId) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=missing_org&platform=shopify`
      )
    }

    // Verify user has access to organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!member) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=forbidden&platform=shopify`
      )
    }

    // Extract shop domain (remove .myshopify.com if present)
    const shopDomain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Exchange code for access token
    const accessToken = await ShopifyIntegration.exchangeCodeForToken(code, shopDomain)

    // Store integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'shopify'
        }
      },
      update: {
        accessToken,
        platformAccountId: shopDomain,
        status: 'active',
        tokenExpiresAt: null // Shopify tokens don't expire
      },
      create: {
        organizationId,
        platform: 'shopify',
        platformAccountId: shopDomain,
        accessToken,
        status: 'active',
        tokenExpiresAt: null
      }
    })

    // Test the connection
    const connectionTest = await IntegrationManager.testIntegration(integration.id)
    if (!connectionTest) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: 'error' }
      })
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=connection_failed&platform=shopify`
      )
    }

    // Start initial data sync in background
    setImmediate(async () => {
      try {
        console.log(`Starting background sync for Shopify integration ${integration.id}`)
        await IntegrationManager.syncIntegration(integration.id)
        console.log(`Background sync completed for Shopify integration ${integration.id}`)
      } catch (error) {
        console.error('Background sync failed:', error)
      }
    })

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/integrations?success=true&platform=shopify&shop=${shopDomain}`
    )

  } catch (error) {
    console.error('Shopify callback error:', error)
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/integrations?error=callback_error&platform=shopify`
    )
  }
}