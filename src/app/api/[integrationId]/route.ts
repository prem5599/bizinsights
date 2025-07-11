// src/app/api/integrations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 })
    }

    // Verify user has access to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: session.user.id
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch integrations for the organization
    const integrations = await prisma.integration.findMany({
      where: {
        organizationId: orgId
      },
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        status: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
        // Don't expose sensitive tokens
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Add additional metadata for each integration
    const integrationsWithStatus = integrations.map(integration => ({
      ...integration,
      isConnected: integration.status === 'active',
      platformDisplayName: getPlatformDisplayName(integration.platform),
      statusText: getStatusText(integration.status, integration.lastSyncAt),
      canSync: integration.status === 'active',
      syncStatus: getSyncStatus(integration.lastSyncAt)
    }))

    return NextResponse.json({
      integrations: integrationsWithStatus,
      totalCount: integrations.length,
      connectedCount: integrations.filter(i => i.status === 'active').length
    })

  } catch (error) {
    console.error('GET integrations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { orgId, platform, accessToken, refreshToken, platformAccountId, metadata } = body

    // Validation
    if (!orgId || !platform || !accessToken) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, platform, accessToken' },
        { status: 400 }
      )
    }

    // Verify user has admin access to this organization
    const member = await prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        userId: session.user.id,
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Validate platform type
    const supportedPlatforms = ['shopify', 'stripe', 'google_analytics', 'facebook_ads', 'mailchimp']
    if (!supportedPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Unsupported platform. Supported platforms: ${supportedPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if integration already exists for this platform
    const existingIntegration = await prisma.integration.findUnique({
      where: {
        organizationId_platform: {
          organizationId: orgId,
          platform: platform
        }
      }
    })

    if (existingIntegration) {
      return NextResponse.json(
        { error: `Integration for ${platform} already exists` },
        { status: 409 }
      )
    }

    // Validate access token by making a test API call
    const validationResult = await validateIntegrationToken(platform, accessToken, platformAccountId)
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: validationResult.error || 'Invalid access token' },
        { status: 400 }
      )
    }

    // Create new integration
    const integration = await prisma.integration.create({
      data: {
        organizationId: orgId,
        platform,
        platformAccountId: platformAccountId || validationResult.accountId,
        accessToken,
        refreshToken,
        tokenExpiresAt: validationResult.expiresAt,
        status: 'active',
        lastSyncAt: null
      },
      select: {
        id: true,
        platform: true,
        platformAccountId: true,
        status: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Trigger initial data sync in background
    triggerInitialSync(integration.id, platform).catch(error => {
      console.error('Failed to trigger initial sync:', error)
    })

    return NextResponse.json({
      integration: {
        ...integration,
        isConnected: true,
        platformDisplayName: getPlatformDisplayName(platform),
        statusText: 'Connected',
        canSync: true,
        syncStatus: 'pending'
      },
      message: 'Integration created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('POST integrations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions

function getPlatformDisplayName(platform: string): string {
  const displayNames: Record<string, string> = {
    shopify: 'Shopify',
    stripe: 'Stripe',
    google_analytics: 'Google Analytics',
    facebook_ads: 'Facebook Ads',
    mailchimp: 'Mailchimp'
  }
  return displayNames[platform] || platform
}

function getStatusText(status: string, lastSyncAt: Date | null): string {
  if (status !== 'active') return 'Disconnected'
  
  if (!lastSyncAt) return 'Connected - No sync yet'
  
  const hoursSinceSync = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60)
  if (hoursSinceSync < 1) return 'Connected - Synced recently'
  if (hoursSinceSync < 24) return `Connected - Synced ${Math.floor(hoursSinceSync)}h ago`
  
  const daysSinceSync = Math.floor(hoursSinceSync / 24)
  return `Connected - Synced ${daysSinceSync}d ago`
}

function getSyncStatus(lastSyncAt: Date | null): 'pending' | 'syncing' | 'synced' | 'error' {
  if (!lastSyncAt) return 'pending'
  
  const hoursSinceSync = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60)
  if (hoursSinceSync > 25) return 'error' // Should sync at least daily
  
  return 'synced'
}

async function validateIntegrationToken(
  platform: string, 
  accessToken: string, 
  platformAccountId?: string
): Promise<{ isValid: boolean; error?: string; accountId?: string; expiresAt?: Date }> {
  try {
    switch (platform) {
      case 'shopify':
        return await validateShopifyToken(accessToken, platformAccountId)
      case 'stripe':
        return await validateStripeToken(accessToken)
      case 'google_analytics':
        return await validateGoogleAnalyticsToken(accessToken)
      case 'facebook_ads':
        return await validateFacebookAdsToken(accessToken)
      case 'mailchimp':
        return await validateMailchimpToken(accessToken)
      default:
        return { isValid: false, error: 'Unsupported platform' }
    }
  } catch (error) {
    console.error(`Token validation error for ${platform}:`, error)
    return { isValid: false, error: 'Token validation failed' }
  }
}

async function validateShopifyToken(accessToken: string, shopDomain?: string): Promise<any> {
  if (!shopDomain) {
    return { isValid: false, error: 'Shop domain is required for Shopify integration' }
  }
  
  try {
    const response = await fetch(`https://${shopDomain}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      return { isValid: false, error: 'Invalid Shopify access token or shop domain' }
    }
    
    const data = await response.json()
    return { 
      isValid: true, 
      accountId: data.shop?.id?.toString() || shopDomain 
    }
  } catch (error) {
    return { isValid: false, error: 'Failed to validate Shopify token' }
  }
}

async function validateStripeToken(accessToken: string): Promise<any> {
  try {
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    
    if (!response.ok) {
      return { isValid: false, error: 'Invalid Stripe access token' }
    }
    
    const data = await response.json()
    return { 
      isValid: true, 
      accountId: data.id 
    }
  } catch (error) {
    return { isValid: false, error: 'Failed to validate Stripe token' }
  }
}

async function validateGoogleAnalyticsToken(accessToken: string): Promise<any> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `access_token=${accessToken}`
    })
    
    if (!response.ok) {
      return { isValid: false, error: 'Invalid Google Analytics access token' }
    }
    
    const data = await response.json()
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined
    
    return { 
      isValid: true, 
      accountId: data.user_id || data.email,
      expiresAt 
    }
  } catch (error) {
    return { isValid: false, error: 'Failed to validate Google Analytics token' }
  }
}

async function validateFacebookAdsToken(accessToken: string): Promise<any> {
  try {
    const response = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`)
    
    if (!response.ok) {
      return { isValid: false, error: 'Invalid Facebook Ads access token' }
    }
    
    const data = await response.json()
    return { 
      isValid: true, 
      accountId: data.id 
    }
  } catch (error) {
    return { isValid: false, error: 'Failed to validate Facebook Ads token' }
  }
}

async function validateMailchimpToken(accessToken: string): Promise<any> {
  try {
    const response = await fetch('https://login.mailchimp.com/oauth2/metadata', {
      headers: {
        'Authorization': `OAuth ${accessToken}`
      }
    })
    
    if (!response.ok) {
      return { isValid: false, error: 'Invalid Mailchimp access token' }
    }
    
    const data = await response.json()
    return { 
      isValid: true, 
      accountId: data.dc 
    }
  } catch (error) {
    return { isValid: false, error: 'Failed to validate Mailchimp token' }
  }
}

async function triggerInitialSync(integrationId: string, platform: string): Promise<void> {
  // In a real implementation, this would trigger a background job
  // For now, we'll just log that sync should be triggered
  console.log(`Initial sync triggered for integration ${integrationId} (${platform})`)
  
  // You could use a queue system like Bull or trigger a serverless function
  // Example: await syncQueue.add('initial-sync', { integrationId, platform })
}