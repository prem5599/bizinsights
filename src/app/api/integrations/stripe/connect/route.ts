// src/app/api/integrations/stripe/connect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StripeIntegration } from '@/lib/integrations/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { organizationId, secretKey } = body

    if (!organizationId || !secretKey) {
      return NextResponse.json(
        { error: 'Organization ID and secret key are required' },
        { status: 400 }
      )
    }

    // Verify user has admin access to organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Test Stripe connection
    const stripe = new StripeIntegration(secretKey)
    const isConnected = await stripe.testConnection()

    if (!isConnected) {
      return NextResponse.json(
        { error: 'Invalid Stripe secret key or connection failed' },
        { status: 400 }
      )
    }

    // Get account info
    const accountInfo = await stripe.getAccountInfo()

    // Check if integration already exists
    const existingIntegration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'stripe'
      }
    })

    let integration
    if (existingIntegration) {
      // Update existing integration
      integration = await prisma.integration.update({
        where: { id: existingIntegration.id },
        data: {
          accessToken: secretKey,
          platformAccountId: accountInfo.id,
          status: 'active',
          lastSyncAt: new Date(),
          metadata: JSON.stringify({
            accountId: accountInfo.id,
            displayName: accountInfo.display_name || accountInfo.business_profile?.name,
            country: accountInfo.country,
            currency: accountInfo.default_currency,
            connectedAt: new Date().toISOString()
          })
        }
      })
    } else {
      // Create new integration
      integration = await prisma.integration.create({
        data: {
          organizationId,
          platform: 'stripe',
          platformAccountId: accountInfo.id,
          accessToken: secretKey,
          status: 'active',
          lastSyncAt: new Date(),
          metadata: JSON.stringify({
            accountId: accountInfo.id,
            displayName: accountInfo.display_name || accountInfo.business_profile?.name,
            country: accountInfo.country,
            currency: accountInfo.default_currency,
            connectedAt: new Date().toISOString()
          })
        }
      })
    }

    // Setup webhooks
    try {
      const webhookUrls = await stripe.setupWebhooks(organizationId)
      console.log(`Created ${webhookUrls.length} Stripe webhooks`)
    } catch (webhookError) {
      console.warn('Failed to setup webhooks:', webhookError)
      // Don't fail the integration for webhook setup issues
    }

    // Start historical data sync in background
    stripe.syncHistoricalData(integration.id, 30).catch(error => {
      console.error('Background sync failed:', error)
    })

    return NextResponse.json({
      success: true,
      integration: {
        id: integration.id,
        platform: 'stripe',
        accountName: accountInfo.display_name || accountInfo.business_profile?.name,
        accountId: accountInfo.id,
        status: 'active'
      }
    })

  } catch (error) {
    console.error('Stripe connect error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}







    