// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleStripeWebhook } from '@/lib/integrations/stripe'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    // Get Stripe signature
    const signature = req.headers.get('stripe-signature')
    
    if (!signature) {
      console.error('Missing Stripe signature header')
      return NextResponse.json(
        { error: 'Missing signature header' },
        { status: 400 }
      )
    }

    // Get raw body for signature verification
    const rawBody = await req.text()
    
    // Verify webhook signature
    const event = verifyStripeWebhook(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
    
    if (!event) {
      console.error('Invalid Stripe webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('Received Stripe webhook:', { 
      type: event.type, 
      id: event.id,
      timestamp: new Date().toISOString()
    })

    // Find integration based on Stripe account ID
    const accountId = event.account || 'default'
    const integration = await findStripeIntegration(accountId)

    if (!integration) {
      console.error(`No active Stripe integration found for account ${accountId}`)
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Log webhook event
    await logStripeWebhookEvent(integration.id, event.type, event.id, 'received')

    // Process webhook based on event type
    const result = await processStripeWebhookEvent(integration.id, event)
    
    if (result.success) {
      console.log(`Successfully processed Stripe webhook: ${event.type} for integration ${integration.id}`)
      
      // Update webhook event status
      await updateStripeWebhookEventStatus(integration.id, event.type, event.id, 'processed')
      
      // Trigger real-time dashboard updates
      await triggerDashboardUpdate(integration.organizationId, event.type, event.data)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook processed successfully',
        eventType: event.type,
        eventId: event.id,
        integrationId: integration.id
      })
    } else {
      console.error(`Failed to process Stripe webhook: ${event.type}`, result.error)
      
      // Update webhook event status
      await updateStripeWebhookEventStatus(integration.id, event.type, event.id, 'failed', result.error)
      
      return NextResponse.json(
        { error: result.error || 'Webhook processing failed' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Stripe webhook handler error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Process different Stripe webhook events
async function processStripeWebhookEvent(
  integrationId: string,
  event: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const { type, data } = event

    switch (type) {
      // Payment events
      case 'charge.succeeded':
        await handleChargeSucceeded(integrationId, data.object)
        break
      
      case 'charge.failed':
        await handleChargeFailed(integrationId, data.object)
        break
      
      case 'charge.refunded':
        await handleChargeRefunded(integrationId, data.object)
        break
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(integrationId, data.object)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(integrationId, data.object)
        break

      // Subscription events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(integrationId, data.object)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(integrationId, data.object)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(integrationId, data.object)
        break
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(integrationId, data.object)
        break
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(integrationId, data.object)
        break

      // Customer events
      case 'customer.created':
        await handleCustomerCreated(integrationId, data.object)
        break
      
      case 'customer.updated':
        await handleCustomerUpdated(integrationId, data.object)
        break
      
      case 'customer.deleted':
        await handleCustomerDeleted(integrationId, data.object)
        break

      // Dispute events
      case 'charge.dispute.created':
        await handleDisputeCreated(integrationId, data.object)
        break
      
      case 'charge.dispute.updated':
        await handleDisputeUpdated(integrationId, data.object)
        break

      // Payout events
      case 'payout.created':
        await handlePayoutCreated(integrationId, data.object)
        break
      
      case 'payout.updated':
        await handlePayoutUpdated(integrationId, data.object)
        break

      // Account events
      case 'account.updated':
        await handleAccountUpdated(integrationId, data.object)
        break

      default:
        console.log(`Unhandled Stripe webhook event: ${type}`)
        return { success: true } // Don't fail for unhandled events
    }

    return { success: true }
  } catch (error) {
    console.error(`Error processing Stripe webhook event ${event.type}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Payment event handlers
async function handleChargeSucceeded(integrationId: string, charge: any): Promise<void> {
  const amount = charge.amount / 100
  const fee = charge.application_fee_amount ? charge.application_fee_amount / 100 : 0

  const dataPoints = [
    {
      integrationId,
      metricType: 'stripe_revenue',
      value: amount,
      metadata: {
        chargeId: charge.id,
        currency: charge.currency,
        customerId: charge.customer,
        paymentMethod: charge.payment_method_details?.type,
        feeAmount: fee,
        netAmount: amount - fee,
        webhook: true,
        eventType: 'charge.succeeded'
      },
      dateRecorded: new Date(charge.created * 1000)
    },
    {
      integrationId,
      metricType: 'stripe_transactions',
      value: 1,
      metadata: {
        chargeId: charge.id,
        amount: amount,
        currency: charge.currency,
        type: 'charge_succeeded',
        webhook: true
      },
      dateRecorded: new Date(charge.created * 1000)
    }
  ]

  await prisma.dataPoint.createMany({
    data: dataPoints,
    skipDuplicates: true
  })
}

async function handleChargeFailed(integrationId: string, charge: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_failed_charges',
      value: 1,
      metadata: {
        chargeId: charge.id,
        failureCode: charge.failure_code,
        failureMessage: charge.failure_message,
        amount: charge.amount / 100,
        currency: charge.currency,
        customerId: charge.customer,
        webhook: true,
        eventType: 'charge.failed'
      },
      dateRecorded: new Date(charge.created * 1000)
    }
  })
}

async function handleChargeRefunded(integrationId: string, charge: any): Promise<void> {
  const refundAmount = charge.amount_refunded / 100

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_refunds',
      value: -refundAmount, // Negative to reduce revenue
      metadata: {
        chargeId: charge.id,
        refundAmount: refundAmount,
        currency: charge.currency,
        customerId: charge.customer,
        refundReason: charge.refunds?.data?.[0]?.reason,
        webhook: true,
        eventType: 'charge.refunded'
      },
      dateRecorded: new Date()
    }
  })
}

async function handlePaymentIntentSucceeded(integrationId: string, paymentIntent: any): Promise<void> {
  const amount = paymentIntent.amount_received / 100

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_payment_intents',
      value: amount,
      metadata: {
        paymentIntentId: paymentIntent.id,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        paymentMethod: paymentIntent.payment_method_types?.[0],
        webhook: true,
        eventType: 'payment_intent.succeeded'
      },
      dateRecorded: new Date(paymentIntent.created * 1000)
    }
  })
}

async function handlePaymentIntentFailed(integrationId: string, paymentIntent: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_failed_payment_intents',
      value: 1,
      metadata: {
        paymentIntentId: paymentIntent.id,
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        customerId: paymentIntent.customer,
        webhook: true,
        eventType: 'payment_intent.payment_failed'
      },
      dateRecorded: new Date(paymentIntent.created * 1000)
    }
  })
}

// Subscription event handlers
async function handleSubscriptionCreated(integrationId: string, subscription: any): Promise<void> {
  const mrr = calculateMRR(subscription)

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_new_subscriptions',
      value: 1,
      metadata: {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        mrr: mrr,
        planCount: subscription.items.data.length,
        webhook: true,
        eventType: 'customer.subscription.created'
      },
      dateRecorded: new Date(subscription.created * 1000)
    }
  })
}

async function handleSubscriptionUpdated(integrationId: string, subscription: any): Promise<void> {
  const mrr = calculateMRR(subscription)

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_mrr',
      value: mrr,
      metadata: {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        status: subscription.status,
        planCount: subscription.items.data.length,
        webhook: true,
        eventType: 'customer.subscription.updated'
      },
      dateRecorded: new Date()
    }
  })
}

async function handleSubscriptionDeleted(integrationId: string, subscription: any): Promise<void> {
  const mrr = calculateMRR(subscription)

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_cancelled_subscriptions',
      value: 1,
      metadata: {
        subscriptionId: subscription.id,
        customerId: subscription.customer,
        cancelReason: subscription.cancellation_details?.reason,
        lostMrr: mrr,
        webhook: true,
        eventType: 'customer.subscription.deleted'
      },
      dateRecorded: new Date()
    }
  })
}

async function handleInvoicePaymentSucceeded(integrationId: string, invoice: any): Promise<void> {
  const amount = invoice.amount_paid / 100

  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_subscription_revenue',
      value: amount,
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
        currency: invoice.currency,
        billingReason: invoice.billing_reason,
        webhook: true,
        eventType: 'invoice.payment_succeeded'
      },
      dateRecorded: new Date(invoice.created * 1000)
    }
  })
}

async function handleInvoicePaymentFailed(integrationId: string, invoice: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_failed_invoices',
      value: 1,
      metadata: {
        invoiceId: invoice.id,
        subscriptionId: invoice.subscription,
        customerId: invoice.customer,
        amount: invoice.amount_due / 100,
        currency: invoice.currency,
        webhook: true,
        eventType: 'invoice.payment_failed'
      },
      dateRecorded: new Date(invoice.created * 1000)
    }
  })
}

// Customer event handlers
async function handleCustomerCreated(integrationId: string, customer: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_new_customers',
      value: 1,
      metadata: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        webhook: true,
        eventType: 'customer.created'
      },
      dateRecorded: new Date(customer.created * 1000)
    }
  })
}

async function handleCustomerUpdated(integrationId: string, customer: any): Promise<void> {
  // Track customer updates for analytics
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_customer_updates',
      value: 1,
      metadata: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
        webhook: true,
        eventType: 'customer.updated'
      },
      dateRecorded: new Date()
    }
  })
}

async function handleCustomerDeleted(integrationId: string, customer: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_deleted_customers',
      value: 1,
      metadata: {
        customerId: customer.id,
        webhook: true,
        eventType: 'customer.deleted'
      },
      dateRecorded: new Date()
    }
  })
}

// Dispute event handlers
async function handleDisputeCreated(integrationId: string, dispute: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_disputes',
      value: 1,
      metadata: {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        webhook: true,
        eventType: 'charge.dispute.created'
      },
      dateRecorded: new Date(dispute.created * 1000)
    }
  })
}

async function handleDisputeUpdated(integrationId: string, dispute: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_dispute_updates',
      value: 1,
      metadata: {
        disputeId: dispute.id,
        chargeId: dispute.charge,
        status: dispute.status,
        reason: dispute.reason,
        webhook: true,
        eventType: 'charge.dispute.updated'
      },
      dateRecorded: new Date()
    }
  })
}

// Payout event handlers
async function handlePayoutCreated(integrationId: string, payout: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_payouts',
      value: payout.amount / 100,
      metadata: {
        payoutId: payout.id,
        currency: payout.currency,
        status: payout.status,
        method: payout.method,
        type: payout.type,
        webhook: true,
        eventType: 'payout.created'
      },
      dateRecorded: new Date(payout.created * 1000)
    }
  })
}

async function handlePayoutUpdated(integrationId: string, payout: any): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'stripe_payout_updates',
      value: 1,
      metadata: {
        payoutId: payout.id,
        status: payout.status,
        failureCode: payout.failure_code,
        webhook: true,
        eventType: 'payout.updated'
      },
      dateRecorded: new Date()
    }
  })
}

// Account event handlers
async function handleAccountUpdated(integrationId: string, account: any): Promise<void> {
  // Update integration metadata with account information
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      lastSyncAt: new Date()
    }
  })
}

// Utility functions
function verifyStripeWebhook(payload: string, signature: string, secret: string): any | null {
  try {
    const elements = signature.split(',')
    const signatureElements: Record<string, string> = {}
    
    for (const element of elements) {
      const [key, value] = element.split('=')
      signatureElements[key] = value
    }
    
    const timestamp = signatureElements.t
    const expectedSignature = signatureElements.v1
    
    if (!timestamp || !expectedSignature) {
      return null
    }
    
    // Check timestamp (reject events older than 5 minutes)
    const timestampNumber = parseInt(timestamp, 10)
    const currentTime = Math.floor(Date.now() / 1000)
    if (currentTime - timestampNumber > 300) {
      console.error('Webhook timestamp too old')
      return null
    }
    
    // Verify signature
    const signedPayload = `${timestamp}.${payload}`
    const expectedSignatureBuffer = crypto
      .createHmac('sha256', secret)
      .update(signedPayload, 'utf8')
      .digest('hex')
    
    const signatureBuffer = Buffer.from(expectedSignature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignatureBuffer, 'hex')
    
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null
    }
    
    // Parse and return event
    return JSON.parse(payload)
  } catch (error) {
    console.error('Stripe webhook verification error:', error)
    return null
  }
}

async function findStripeIntegration(accountId: string) {
  return await prisma.integration.findFirst({
    where: {
      platform: 'stripe',
      status: 'active',
      OR: [
        { platformAccountId: accountId },
        { platformAccountId: null } // Default account
      ]
    },
    include: {
      organization: true
    }
  })
}

function calculateMRR(subscription: any): number {
  let mrr = 0
  
  for (const item of subscription.items.data) {
    const amount = item.price.unit_amount / 100
    const interval = item.price.recurring.interval
    
    // Convert to monthly amount
    switch (interval) {
      case 'month':
        mrr += amount
        break
      case 'year':
        mrr += amount / 12
        break
      case 'week':
        mrr += amount * 4.33 // Average weeks per month
        break
      case 'day':
        mrr += amount * 30 // Average days per month
        break
    }
  }
  
  return mrr
}

async function logStripeWebhookEvent(
  integrationId: string,
  eventType: string,
  eventId: string,
  status: string
): Promise<void> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'stripe_webhook_event',
        value: 1,
        metadata: {
          eventType,
          eventId,
          status,
          timestamp: new Date().toISOString()
        },
        dateRecorded: new Date()
      }
    })
  } catch (error) {
    console.error('Failed to log Stripe webhook event:', error)
  }
}

async function updateStripeWebhookEventStatus(
  integrationId: string,
  eventType: string,
  eventId: string,
  status: string,
  error?: string
): Promise<void> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'stripe_webhook_status',
        value: status === 'processed' ? 1 : 0,
        metadata: {
          eventType,
          eventId,
          status,
          error,
          processedAt: new Date().toISOString()
        },
        dateRecorded: new Date()
      }
    })
  } catch (updateError) {
    console.error('Failed to update Stripe webhook event status:', updateError)
  }
}

async function triggerDashboardUpdate(
  organizationId: string,
  eventType: string,
  data: any
): Promise<void> {
  try {
    console.log(`Dashboard update triggered for org ${organizationId}:`, {
      eventType,
      timestamp: new Date().toISOString()
    })

    // Create notification data point
    await prisma.dataPoint.create({
      data: {
        integrationId: 'system',
        metricType: 'dashboard_update',
        value: 1,
        metadata: {
          organizationId,
          eventType,
          source: 'stripe_webhook',
          triggeredAt: new Date().toISOString()
        },
        dateRecorded: new Date()
      }
    })

  } catch (error) {
    console.error('Failed to trigger dashboard update:', error)
  }
}

// Handle webhook endpoint health check
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Stripe webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
}