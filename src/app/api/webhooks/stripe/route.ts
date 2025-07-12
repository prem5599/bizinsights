// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  verifyStripeWebhook, 
  logWebhookEvent, 
  updateWebhookEventStatus, 
  triggerDashboardUpdate,
  extractMetricFromWebhook,
  validateWebhookPayload,
  checkWebhookRateLimit
} from '@/lib/webhooks'

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
        platform: 'stripe',
        status: 'active'
      }
    })

    if (!integration) {
      console.error(`No active Stripe integration found for org ${organizationId}`)
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
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    let event
    try {
      event = verifyStripeWebhook(rawBody, signature, webhookSecret)
    } catch (error) {
      console.error('Stripe webhook verification failed:', error)
      await logWebhookEvent(integration.id, 'unknown', 'signature_verification_failed', null)
      return NextResponse.json(
        { error: 'Webhook verification failed' },
        { status: 401 }
      )
    }

    // Validate webhook payload
    const validation = validateWebhookPayload('stripe', event.type, event)
    if (!validation.isValid) {
      console.error('Invalid Stripe webhook payload:', validation.errors)
      await logWebhookEvent(integration.id, event.type, 'invalid_payload', null)
      return NextResponse.json(
        { error: 'Invalid payload', details: validation.errors },
        { status: 400 }
      )
    }

    console.log('Received Stripe webhook:', { 
      type: event.type, 
      id: event.id,
      organizationId,
      timestamp: new Date().toISOString() 
    })

    // Log webhook event
    await logWebhookEvent(integration.id, event.type, 'received', event.id)

    // Process webhook based on event type
    const result = await processStripeWebhook(integration, event)
    
    if (result.success) {
      console.log(`Successfully processed Stripe webhook: ${event.type} for integration ${integration.id}`)
      
      // Update webhook event status
      await updateWebhookEventStatus(integration.id, event.type, event.id, 'processed')
      
      // Trigger real-time dashboard updates
      await triggerDashboardUpdate(organizationId, event.type, event.data)
      
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook processed successfully',
        eventType: event.type,
        eventId: event.id,
        integrationId: integration.id,
        processed: result.processed
      })
    } else {
      console.error(`Failed to process Stripe webhook: ${event.type}`, result.error)
      
      // Update webhook event status
      await updateWebhookEventStatus(integration.id, event.type, event.id, 'failed', result.error)
      
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

/**
 * Process different Stripe webhook events
 */
async function processStripeWebhook(
  integration: any,
  event: any
): Promise<{ success: boolean; error?: string; processed?: number }> {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        return await handlePaymentIntentSucceeded(integration, event)
      
      case 'payment_intent.payment_failed':
        return await handlePaymentIntentFailed(integration, event)
      
      case 'charge.succeeded':
        return await handleChargeSucceeded(integration, event)
      
      case 'charge.failed':
        return await handleChargeFailed(integration, event)
      
      case 'charge.dispute.created':
        return await handleChargeDisputeCreated(integration, event)
      
      case 'customer.created':
        return await handleCustomerCreated(integration, event)
      
      case 'customer.subscription.created':
        return await handleSubscriptionCreated(integration, event)
      
      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(integration, event)
      
      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(integration, event)
      
      case 'invoice.paid':
        return await handleInvoicePaid(integration, event)
      
      case 'invoice.payment_failed':
        return await handleInvoicePaymentFailed(integration, event)
      
      case 'checkout.session.completed':
        return await handleCheckoutSessionCompleted(integration, event)
      
      default:
        console.log(`Unhandled Stripe webhook event type: ${event.type}`)
        return {
          success: true,
          processed: 0
        }
    }

  } catch (error) {
    console.error(`Error processing Stripe webhook ${event.type}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(integration: any, event: any) {
  try {
    const paymentIntent = event.data.object
    const amount = paymentIntent.amount / 100 // Convert cents to dollars
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'revenue',
        value: amount,
        metadata: {
          paymentIntentId: paymentIntent.id,
          currency: paymentIntent.currency,
          customerId: paymentIntent.customer,
          paymentMethod: paymentIntent.payment_method_types?.[0],
          status: paymentIntent.status
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(integration: any, event: any) {
  try {
    const paymentIntent = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'payment_failed',
        value: paymentIntent.amount / 100,
        metadata: {
          paymentIntentId: paymentIntent.id,
          currency: paymentIntent.currency,
          customerId: paymentIntent.customer,
          failureCode: paymentIntent.last_payment_error?.code,
          failureMessage: paymentIntent.last_payment_error?.message
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle successful charge
 */
async function handleChargeSucceeded(integration: any, event: any) {
  try {
    const charge = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'charge_succeeded',
        value: charge.amount / 100,
        metadata: {
          chargeId: charge.id,
          currency: charge.currency,
          customerId: charge.customer,
          paymentMethodType: charge.payment_method_details?.type,
          receiptUrl: charge.receipt_url
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle failed charge
 */
async function handleChargeFailed(integration: any, event: any) {
  try {
    const charge = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'charge_failed',
        value: charge.amount / 100,
        metadata: {
          chargeId: charge.id,
          currency: charge.currency,
          customerId: charge.customer,
          failureCode: charge.failure_code,
          failureMessage: charge.failure_message
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle charge dispute creation
 */
async function handleChargeDisputeCreated(integration: any, event: any) {
  try {
    const dispute = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'dispute_created',
        value: dispute.amount / 100,
        metadata: {
          disputeId: dispute.id,
          chargeId: dispute.charge,
          reason: dispute.reason,
          status: dispute.status,
          currency: dispute.currency
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle customer creation
 */
async function handleCustomerCreated(integration: any, event: any) {
  try {
    const customer = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'customers',
        value: 1,
        metadata: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          description: customer.description
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle subscription creation
 */
async function handleSubscriptionCreated(integration: any, event: any) {
  try {
    const subscription = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'subscription_created',
        value: subscription.items.data[0]?.price?.unit_amount / 100 || 0,
        metadata: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price?.id,
          interval: subscription.items.data[0]?.price?.recurring?.interval
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle subscription update
 */
async function handleSubscriptionUpdated(integration: any, event: any) {
  try {
    const subscription = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'subscription_updated',
        value: subscription.items.data[0]?.price?.unit_amount / 100 || 0,
        metadata: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          priceId: subscription.items.data[0]?.price?.id
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(integration: any, event: any) {
  try {
    const subscription = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'subscription_cancelled',
        value: 1,
        metadata: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          canceledAt: subscription.canceled_at,
          cancelAtPeriodEnd: subscription.cancel_at_period_end
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle invoice payment success
 */
async function handleInvoicePaid(integration: any, event: any) {
  try {
    const invoice = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'invoice_paid',
        value: invoice.amount_paid / 100,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          currency: invoice.currency,
          paidAt: invoice.status_transitions?.paid_at
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle invoice payment failure
 */
async function handleInvoicePaymentFailed(integration: any, event: any) {
  try {
    const invoice = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'invoice_payment_failed',
        value: invoice.amount_due / 100,
        metadata: {
          invoiceId: invoice.id,
          customerId: invoice.customer,
          subscriptionId: invoice.subscription,
          currency: invoice.currency,
          attemptCount: invoice.attempt_count
        },
        dateRecorded: new Date(event.created * 1000)
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
 * Handle checkout session completion
 */
async function handleCheckoutSessionCompleted(integration: any, event: any) {
  try {
    const session = event.data.object
    
    await prisma.dataPoint.create({
      data: {
        integrationId: integration.id,
        metricType: 'checkout_completed',
        value: session.amount_total / 100,
        metadata: {
          sessionId: session.id,
          customerId: session.customer,
          paymentIntentId: session.payment_intent,
          currency: session.currency,
          mode: session.mode
        },
        dateRecorded: new Date(event.created * 1000)
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

// Handle webhook endpoint health check
export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Stripe webhook endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  })
}