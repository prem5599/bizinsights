// app/api/integrations/stripe/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StripeIntegration } from '@/lib/integrations/stripe'
import { IntegrationManager } from '@/lib/integrations/manager'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.redirect(`${process.env.APP_URL}/auth/signin?error=unauthorized`)
    }

    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('Stripe OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=oauth_error&platform=stripe&details=${encodeURIComponent(errorDescription || error)}`
      )
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=missing_code&platform=stripe`
      )
    }

    // Parse state to get organization ID
    let organizationId: string
    try {
      const stateData = state ? JSON.parse(Buffer.from(state, 'base64').toString()) : {}
      organizationId = stateData.organizationId
    } catch (error) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=invalid_state&platform=stripe`
      )
    }

    if (!organizationId) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/dashboard/integrations?error=missing_org&platform=stripe`
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
        `${process.env.APP_URL}/dashboard/integrations?error=forbidden&platform=stripe`
      )
    }

    // Exchange code for access token
    const { accessToken, accountId } = await StripeIntegration.exchangeCodeForToken(code)

    // Store integration
    const integration = await prisma.integration.upsert({
      where: {
        organizationId_platform: {
          organizationId,
          platform: 'stripe'
        }
      },
      update: {
        accessToken,
        platformAccountId: accountId,
        status: 'active',
        tokenExpiresAt: null // Stripe tokens don't expire
      },
      create: {
        organizationId,
        platform: 'stripe',
        platformAccountId: accountId,
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
        `${process.env.APP_URL}/dashboard/integrations?error=connection_failed&platform=stripe`
      )
    }

    // Start initial data sync in background
    setImmediate(async () => {
      try {
        console.log(`Starting background sync for Stripe integration ${integration.id}`)
        await IntegrationManager.syncIntegration(integration.id)
        console.log(`Background sync completed for Stripe integration ${integration.id}`)
      } catch (error) {
        console.error('Background sync failed:', error)
      }
    })

    // Redirect to success page
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/integrations?success=true&platform=stripe&account=${accountId}`
    )

  } catch (error) {
    console.error('Stripe callback error:', error)
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard/integrations?error=callback_error&platform=stripe&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    )
  }
}