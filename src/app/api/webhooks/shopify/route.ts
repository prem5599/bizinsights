// src/app/api/webhooks/shopify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  verifyShopifyWebhook, 
  logWebhookEvent, 
  updateWebhookEventStatus, 
  triggerDashboardUpdate,
  extractMetricFromWebhook,
  validateWebhookPayload,
  checkWebhookRateLimit
} from '@/lib/webhooks'

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

    // Check rate limiting
    if (!checkWebhookRateLimit(integration.id)) {
      console.warn(`Rate limit exceeded for integration ${integration.id}`)
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }

    // Verify webhook signature
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('SHOPIFY_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    if (!verifyShopifyWebhook(rawBody, hmacHeader, webhookSecret)) {
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

    // Validate webhook payload
    const validation = validateWebhookPayload('shopify', topic, webhookData)
    if (!validation.isValid) {
      console.error('Invalid webhook payload:', validation.errors)
      await logWebhookEvent(integration.id, topic, 'invalid_payload', null)
      return NextResponse.json(
        { error: 'Invalid payload', details: validation.errors },
        { status: 400 }
      )
    }

    // Log webhook event
    const externalId = webhookData.id?.toString() || 'unknown'
    await logWebhookEvent(integration.id, topic, 'received', externalId)

    // Process webhook based on topic
    const result = await processShopifyWebhook(integration, topic, webhookData)
    
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
        integrationId: integration.id,
        processed: result.processed
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

/**
 * Process different Shopify webhook events
 */
async function processShopifyWebhook(
  integration: any,
  topic: string,
  webhookData: any
): Promise<{ success: boolean; error?: string; processed?: number }> {
  try {
    switch (topic) {
      case 'orders/create':
        return await handleOrderCreate(integration, webhookData)
      
      case 'orders/updated':
        return await handleOrderUpdate(integration, webhookData)
      
      case 'orders/paid':
        return await handleOrderPaid(integration, webhookData)
      
      case 'orders/cancelled':
        return await handleOrderCancelled(integration, webhookData)
      
      case 'orders/fulfilled':
        return await handleOrderFulfilled(integration, webhookData)
      
      case 'orders/refunded':
        return await handleOrderRefunded(integration, webhookData)
      
      case 'app/uninstalled':
        return await handleAppUninstalled(integration, webhookData)
      
      case 'shop/update':
        return await handleShopUpdate(integration, webhookData)
      
      case 'customers/create':
        return await handleCustomerCreate(integration, webhookData)
      
      default:
        console.log(`Unhandled webhook topic: ${topic}`)
        return {
          success: true,
          processed: 0
        }
    }

  } catch (error) {
    console.error(`Error processing webhook ${topic}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Handle order creation webhook
 */
async function handleOrderCreate(integration: any, orderData: any) {
  try {
    const metrics = extractMetricFromWebhook('shopify', 'orders/create', orderData)
    
    // Store metrics as data points
    for (const metric of metrics) {
      await prisma.dataPoint.create({
        data: {
          integrationId: integration.id,
          metricType: metric.metricType,
          value: metric.value,
          metadata: metric.metadata,
          dateRecorded: metric.dateRecorded
        }
      })
    }

    return {
      success: true,
      processed: metrics.length
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle order payment webhook
 */
async function handleOrderPaid(integration: any, orderData: any) {
  try {
    const metrics = extractMetricFromWebhook('shopify', 'orders/paid', orderData)
    
    // Store metrics as data points
    for (const metric of metrics) {
      await prisma.dataPoint.create({
        data: {
          integrationId: integration.id,
          metricType: metric.metricType,
          value: metric.value,
          metadata: metric.metadata,
          dateRecorded: metric.dateRecorded
        }
      })
    }

    return {
      success: true,
      processed: metrics.length
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle order update webhook
 */
async function handleOrderUpdate(integration: any, orderData: any) {
  try {
    // Update existing order data point
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'order_updated',
        value: 1,
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          status: orderData.financial_status,
          updatedAt: orderData.updated_at
        },
        dateRecorded: new Date(orderData.updated_at || Date.now())
      }
    })

    return {
      success: true,
      processed: 1
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle order cancellation webhook
 */
async function handleOrderCancelled(integration: any, orderData: any) {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'order_cancelled',
        value: parseFloat(orderData.total_price || '0'),
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          cancelReason: orderData.cancel_reason,
          cancelledAt: orderData.cancelled_at
        },
        dateRecorded: new Date(orderData.cancelled_at || Date.now())
      }
    })

    return {
      success: true,
      processed: 1
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle order fulfillment webhook
 */
async function handleOrderFulfilled(integration: any, orderData: any) {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'order_fulfilled',
        value: 1,
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          fulfillmentStatus: orderData.fulfillment_status
        },
        dateRecorded: new Date()
      }
    })

    return {
      success: true,
      processed: 1
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle order refund webhook
 */
async function handleOrderRefunded(integration: any, refundData: any) {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'order_refunded',
        value: parseFloat(refundData.refund?.amount || '0'),
        metadata: {
          orderId: refundData.order_id,
          refundId: refundData.id,
          refundAmount: refundData.refund?.amount,
          reason: refundData.note
        },
        dateRecorded: new Date(refundData.created_at || Date.now())
      }
    })

    return {
      success: true,
      processed: 1
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle customer creation webhook
 */
async function handleCustomerCreate(integration: any, customerData: any) {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'customers',
        value: 1,
        metadata: {
          customerId: customerData.id,
          email: customerData.email,
          firstName: customerData.first_name,
          lastName: customerData.last_name,
          acceptsMarketing: customerData.accepts_marketing
        },
        dateRecorded: new Date(customerData.created_at || Date.now())
      }
    })

    return {
      success: true,
      processed: 1
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle shop update webhook
 */
async function handleShopUpdate(integration: any, shopData: any) {
  try {
    // Update integration metadata with shop info
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        metadata: {
          ...(integration.metadata as any || {}),
          shopInfo: {
            name: shopData.name,
            email: shopData.email,
            domain: shopData.domain,
            currency: shopData.currency,
            timezone: shopData.timezone,
            updatedAt: new Date().toISOString()
          }
        }
      }
    })

    return {
      success: true,
      processed: 1
    }
  } catch (error) {
    throw error
  }
}

/**
 * Handle app uninstallation webhook
 */
async function handleAppUninstalled(integration: any, webhookData: any) {
  try {
    // Deactivate the integration
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        status: 'inactive',
        accessToken: null,
        refreshToken: null,
        metadata: {
          ...(integration.metadata as any || {}),
          uninstalledAt: new Date().toISOString(),
          uninstallReason: 'app_uninstalled'
        }
      }
    })

    // Notify organization admins
    await notifyIntegrationDisconnected(integration.organizationId, 'shopify', 'app_uninstalled')

    return {
      success: true,
      processed: 1
    }
  } catch (error) {
    throw error
  }
}

/**
 * Notify organization admins about integration disconnection
 */
async function notifyIntegrationDisconnected(
  organizationId: string,
  platform: string,
  reason: string
) {
  try {
    // Get organization admins
    const admins = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        role: { in: ['owner', 'admin'] }
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

    // In a real implementation, send email notifications to admins
    for (const admin of admins) {
      console.log(`Would notify ${admin.user.email} about ${platform} disconnection (${reason})`)
    }

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