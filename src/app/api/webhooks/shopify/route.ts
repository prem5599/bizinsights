// src/app/api/webhooks/shopify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleShopifyWebhook } from '@/lib/integrations/shopify'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    // Get webhook headers
    const shopDomain = req.headers.get('x-shopify-shop-domain')
    const topic = req.headers.get('x-shopify-topic')
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256')
    
    console.log('Received Shopify webhook:', { shopDomain, topic, timestamp: new Date().toISOString() })

    if (!shopDomain || !topic || !hmacHeader) {
      console.error('Missing required webhook headers:', { shopDomain, topic, hmacHeader })
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      )
    }

    // Get raw body for signature verification
    const rawBody = await req.text()
    
    // Get organization ID from query params (set during webhook creation)
    const { searchParams } = new URL(req.url)
    const organizationId = searchParams.get('org')

    if (!organizationId) {
      console.error('No organization ID in webhook URL')
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    // Find the integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'shopify',
        status: 'active'
      }
    })

    if (!integration) {
      console.error(`No active Shopify integration found for ${shopDomain} in org ${organizationId}`)
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Verify webhook signature
    if (!verifyShopifyWebhook(rawBody, hmacHeader, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
      console.error('Invalid webhook signature from:', shopDomain)
      await logWebhookEvent(integration.id, topic, 'signature_verification_failed', null)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook data
    let webhookData
    try {
      webhookData = JSON.parse(rawBody)
    } catch (error) {
      console.error('Invalid JSON in webhook body:', error)
      await logWebhookEvent(integration.id, topic, 'invalid_json', null)
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      )
    }

    // Log webhook event
    const externalId = webhookData.id?.toString() || 'unknown'
    await logWebhookEvent(integration.id, topic, 'received', externalId)

    // Process webhook based on topic
    const result = await handleShopifyWebhook(integration.id, topic, webhookData)
    
    if (result.success) {
      console.log(`Successfully processed webhook: ${topic} for integration ${integration.id}`)
      
      // Update webhook event status
      await updateWebhookEventStatus(integration.id, topic, externalId, 'processed')
      
      // Trigger real-time dashboard updates
      await triggerDashboardUpdate(organizationId, topic, webhookData)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook processed successfully',
        topic,
        integrationId: integration.id
      })
    } else {
      console.error(`Failed to process webhook: ${topic}`, result.error)
      
      // Update webhook event status
      await updateWebhookEventStatus(integration.id, topic, externalId, 'failed', result.error)
      
      return NextResponse.json(
        { error: result.error || 'Webhook processing failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Webhook handler error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle special webhook topics
async function handleSpecialWebhookTopics(
  integrationId: string,
  topic: string,
  data: any
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (topic) {
      case 'app/uninstalled':
        await handleAppUninstallation(integrationId)
        break
      
      case 'shop/update':
        await handleShopUpdate(integrationId, data)
        break
      
      case 'gdpr/customers_data_request':
        await handleCustomersDataRequest(integrationId, data)
        break
      
      case 'gdpr/customers_redact':
        await handleCustomersRedact(integrationId, data)
        break
      
      case 'gdpr/shop_redact':
        await handleShopRedact(integrationId, data)
        break
    }

    return { success: true }
  } catch (error) {
    console.error(`Error handling special webhook topic ${topic}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Handle app uninstallation
async function handleAppUninstallation(integrationId: string): Promise<void> {
  console.log(`Handling app uninstallation for integration ${integrationId}`)
  
  const integration = await prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: 'inactive',
      lastSyncAt: new Date(),
      // Store uninstall metadata
      platformAccountId: null,
      accessToken: null,
      refreshToken: null
    },
    include: {
      organization: true
    }
  })

  // Notify organization admins
  await notifyIntegrationDisconnected(integration.organizationId, 'shopify', 'app_uninstalled')
}

// Handle shop update
async function handleShopUpdate(integrationId: string, shopData: any): Promise<void> {
  console.log(`Handling shop update for integration ${integrationId}`)
  
  // Update integration metadata with new shop information
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      lastSyncAt: new Date()
    }
  })
}

// GDPR handlers
async function handleCustomersDataRequest(integrationId: string, data: any): Promise<void> {
  console.log(`GDPR customers data request for integration ${integrationId}`, data)
  
  // In a real implementation, you would:
  // 1. Collect all customer data from your database
  // 2. Generate a report with all stored customer information
  // 3. Send the report to the customer
  // 4. Log the request for compliance purposes
  
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'gdpr_data_request',
      value: 1,
      metadata: {
        customerId: data.customer?.id,
        customerEmail: data.customer?.email,
        requestedAt: new Date().toISOString()
      },
      dateRecorded: new Date()
    }
  })
}

async function handleCustomersRedact(integrationId: string, data: any): Promise<void> {
  console.log(`GDPR customers redact for integration ${integrationId}`, data)
  
  // In a real implementation, you would:
  // 1. Remove or anonymize all customer data
  // 2. Update related records to remove personal information
  // 3. Log the redaction for compliance purposes
  
  const customerId = data.customer?.id?.toString()
  
  if (customerId) {
    // Remove or anonymize customer data points
    await prisma.dataPoint.updateMany({
      where: {
        integrationId,
        metadata: {
          path: ['customerId'],
          equals: customerId
        }
      },
      data: {
        metadata: {
          customerId: '[REDACTED]',
          customerEmail: '[REDACTED]',
          redactedAt: new Date().toISOString()
        }
      }
    })
  }
}

async function handleShopRedact(integrationId: string, data: any): Promise<void> {
  console.log(`GDPR shop redact for integration ${integrationId}`, data)
  
  // In a real implementation, you would:
  // 1. Remove all shop data and related customer information
  // 2. Deactivate the integration permanently
  // 3. Notify organization owners
  
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: 'inactive',
      accessToken: null,
      refreshToken: null,
      platformAccountId: '[REDACTED]'
    }
  })
}

// Utility functions
function verifyShopifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(body, 'utf8')
    const calculatedHmac = hmac.digest('base64')
    
    return crypto.timingSafeEqual(
      Buffer.from(hmacHeader, 'base64'),
      Buffer.from(calculatedHmac, 'base64')
    )
  } catch (error) {
    console.error('HMAC verification error:', error)
    return false
  }
}

async function logWebhookEvent(
  integrationId: string,
  topic: string,
  status: string,
  externalId: string | null
): Promise<void> {
  try {
    // Create a simple log in data points for webhook events
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'webhook_event',
        value: 1,
        metadata: {
          topic,
          status,
          externalId,
          timestamp: new Date().toISOString()
        },
        dateRecorded: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to log webhook event:', error)
  }
}

async function updateWebhookEventStatus(
  integrationId: string,
  topic: string,
  externalId: string,
  status: string,
  error?: string
): Promise<void> {
  try {
    // Update the webhook event status
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'webhook_status',
        value: status === 'processed' ? 1 : 0,
        metadata: {
          topic,
          status,
          externalId,
          error,
          processedAt: new Date().toISOString()
        },
        dateRecorded: new Date()
      }
    })
  } catch (updateError) {
    console.error('Failed to update webhook event status:', updateError)
  }
}

async function triggerDashboardUpdate(
  organizationId: string,
  eventType: string,
  data: any
): Promise<void> {
  try {
    // This could integrate with WebSocket connections, Server-Sent Events,
    // or a real-time service like Pusher/Ably for live dashboard updates
    
    console.log(`Dashboard update triggered for org ${organizationId}:`, {
      eventType,
      dataType: typeof data,
      timestamp: new Date().toISOString()
    })

    // In a production setup, you might:
    // 1. Send to a WebSocket service
    // 2. Update a Redis cache for real-time data
    // 3. Trigger a Server-Sent Event
    // 4. Call a real-time notification service like Pusher
    
    // For now, we'll create a notification data point
    await prisma.dataPoint.create({
      data: {
        integrationId: 'system',
        metricType: 'dashboard_update',
        value: 1,
        metadata: {
          organizationId,
          eventType,
          triggeredAt: new Date().toISOString()
        },
        dateRecorded: new Date()
      }
    })

  } catch (error) {
    console.error('Failed to trigger dashboard update:', error)
  }
}

async function notifyIntegrationDisconnected(
  organizationId: string,
  platform: string,
  reason: string
): Promise<void> {
  try {
    // Get organization admins
    const admins = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        role: {
          in: ['owner', 'admin']
        }
      },
      include: {
        user: true,
        organization: true
      }
    })

    // Log the disconnection
    console.log(`${platform} integration disconnected for org ${organizationId}:`, {
      reason,
      adminCount: admins.length,
      timestamp: new Date().toISOString()
    })

    // In a real implementation, send email notifications
    for (const admin of admins) {
      console.log(`Would notify ${admin.user.email} about ${platform} disconnection (${reason})`)
      
      // Example: await sendEmail({
      //   to: admin.user.email,
      //   subject: `${platform} integration disconnected`,
      //   template: 'integration-disconnected',
      //   data: { platform, reason, organizationName: admin.organization.name }
      // })
    }

    // Create notification data point
    await prisma.dataPoint.create({
      data: {
        integrationId: 'system',
        metricType: 'integration_disconnected',
        value: 1,
        metadata: {
          organizationId,
          platform,
          reason,
          adminCount: admins.length,
          notifiedAt: new Date().toISOString()
        },
        dateRecorded: new Date()
      }
    })

  } catch (error) {
    console.error('Failed to notify admins:', error)
  }
}

// Handle webhook verification for GET requests (Shopify webhook verification)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const challenge = searchParams.get('challenge')
  
  // Shopify webhook verification
  if (challenge) {
    console.log('Shopify webhook verification challenge received')
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // Webhook endpoint health check
  return NextResponse.json({
    message: 'Shopify webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
}