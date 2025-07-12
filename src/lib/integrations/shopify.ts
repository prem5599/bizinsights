// src/lib/integrations/shopify.ts
import { prisma } from '@/lib/prisma'

/**
 * Shopify Integration Class
 */
export class ShopifyIntegration {
  private accessToken: string
  private shopDomain: string
  private apiVersion: string = '2023-10'

  constructor(accessToken: string, shopDomain: string) {
    this.accessToken = accessToken
    this.shopDomain = shopDomain
  }

  /**
   * Make authenticated API request to Shopify
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}/${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get shop information
   */
  async getShopInfo(): Promise<any> {
    const data = await this.makeRequest('shop.json')
    return data.shop
  }

  /**
   * Get recent orders
   */
  async getOrders(limit: number = 250, sinceId?: string): Promise<any[]> {
    let endpoint = `orders.json?status=any&limit=${limit}`
    if (sinceId) {
      endpoint += `&since_id=${sinceId}`
    }
    
    const data = await this.makeRequest(endpoint)
    return data.orders || []
  }

  /**
   * Get customers
   */
  async getCustomers(limit: number = 250, sinceId?: string): Promise<any[]> {
    let endpoint = `customers.json?limit=${limit}`
    if (sinceId) {
      endpoint += `&since_id=${sinceId}`
    }
    
    const data = await this.makeRequest(endpoint)
    return data.customers || []
  }

  /**
   * Get products
   */
  async getProducts(limit: number = 250, sinceId?: string): Promise<any[]> {
    let endpoint = `products.json?limit=${limit}`
    if (sinceId) {
      endpoint += `&since_id=${sinceId}`
    }
    
    const data = await this.makeRequest(endpoint)
    return data.products || []
  }

  /**
   * Create webhook
   */
  async createWebhook(topic: string, address: string): Promise<any> {
    const webhookData = {
      webhook: {
        topic,
        address,
        format: 'json'
      }
    }

    const data = await this.makeRequest('webhooks.json', {
      method: 'POST',
      body: JSON.stringify(webhookData)
    })

    return data.webhook
  }

  /**
   * Get existing webhooks
   */
  async getWebhooks(): Promise<any[]> {
    const data = await this.makeRequest('webhooks.json')
    return data.webhooks || []
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.makeRequest(`webhooks/${webhookId}.json`, {
      method: 'DELETE'
    })
  }

  /**
   * Test the connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const shop = await this.getShopInfo()
      return !!shop.id
    } catch (error) {
      console.error('Shopify connection test failed:', error)
      return false
    }
  }

  /**
   * Setup required webhooks for the integration
   */
  async setupWebhooks(organizationId: string): Promise<string[]> {
    const webhookTopics = [
      'orders/create',
      'orders/updated', 
      'orders/paid',
      'orders/cancelled',
      'orders/fulfilled',
      'orders/refunded',
      'customers/create',
      'app/uninstalled'
    ]

    const baseUrl = process.env.APP_URL || 'https://your-app.com'
    const webhookUrls: string[] = []

    for (const topic of webhookTopics) {
      try {
        const webhookUrl = `${baseUrl}/api/webhooks/shopify?org=${organizationId}`
        const webhook = await this.createWebhook(topic, webhookUrl)
        webhookUrls.push(webhook.address)
        console.log(`Created webhook for ${topic}: ${webhook.id}`)
      } catch (error) {
        console.error(`Failed to create webhook for ${topic}:`, error)
      }
    }

    return webhookUrls
  }

  /**
   * Get historical data for initial sync
   */
  async getHistoricalData(days: number = 30): Promise<{
    orders: any[];
    customers: any[];
    products: any[];
  }> {
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)
    const sinceIso = sinceDate.toISOString()

    try {
      const [orders, customers, products] = await Promise.all([
        this.makeRequest(`orders.json?status=any&created_at_min=${sinceIso}&limit=250`),
        this.makeRequest(`customers.json?created_at_min=${sinceIso}&limit=250`),
        this.makeRequest(`products.json?created_at_min=${sinceIso}&limit=250`)
      ])

      return {
        orders: orders.orders || [],
        customers: customers.customers || [],
        products: products.products || []
      }
    } catch (error) {
      console.error('Error fetching historical data:', error)
      throw error
    }
  }
}

/**
 * Handle Shopify webhook events
 */
export async function handleShopifyWebhook(
  integrationId: string,
  topic: string,
  webhookData: any
): Promise<{ success: boolean; error?: string; processed?: number }> {
  try {
    console.log(`Processing Shopify webhook: ${topic} for integration ${integrationId}`)

    switch (topic) {
      case 'orders/create':
      case 'orders/paid':
        return await processOrderWebhook(integrationId, webhookData, 'created')
      
      case 'orders/updated':
        return await processOrderWebhook(integrationId, webhookData, 'updated')
      
      case 'orders/cancelled':
        return await processOrderCancellation(integrationId, webhookData)
      
      case 'orders/fulfilled':
        return await processOrderFulfillment(integrationId, webhookData)
      
      case 'orders/refunded':
        return await processOrderRefund(integrationId, webhookData)
      
      case 'customers/create':
        return await processCustomerCreation(integrationId, webhookData)
      
      case 'app/uninstalled':
        return await processAppUninstall(integrationId, webhookData)
      
      default:
        console.log(`Unhandled Shopify webhook topic: ${topic}`)
        return { success: true, processed: 0 }
    }

  } catch (error) {
    console.error(`Error handling Shopify webhook ${topic}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process order webhook (create/update/paid)
 */
async function processOrderWebhook(
  integrationId: string,
  orderData: any,
  action: 'created' | 'updated'
): Promise<{ success: boolean; processed: number }> {
  let processed = 0

  try {
    const orderValue = parseFloat(orderData.total_price || '0')
    const orderDate = new Date(orderData.created_at || Date.now())

    // Create revenue data point
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'revenue',
        value: orderValue,
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          currency: orderData.currency,
          customerEmail: orderData.email,
          financialStatus: orderData.financial_status,
          fulfillmentStatus: orderData.fulfillment_status,
          action,
          source: 'shopify_webhook'
        },
        dateRecorded: orderDate
      }
    })
    processed++

    // Create order count data point
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'orders',
        value: 1,
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          status: orderData.financial_status,
          action,
          source: 'shopify_webhook'
        },
        dateRecorded: orderDate
      }
    })
    processed++

    // If this is a new customer, track it
    if (orderData.customer && orderData.customer.id) {
      // Check if we've seen this customer before
      const existingCustomer = await prisma.dataPoint.findFirst({
        where: {
          integrationId,
          metricType: 'customers',
          metadata: {
            path: ['customerId'],
            equals: orderData.customer.id
          }
        }
      })

      if (!existingCustomer) {
        await prisma.dataPoint.create({
          data: {
            integrationId,
            metricType: 'customers',
            value: 1,
            metadata: {
              customerId: orderData.customer.id,
              customerEmail: orderData.customer.email,
              firstName: orderData.customer.first_name,
              lastName: orderData.customer.last_name,
              source: 'shopify_webhook'
            },
            dateRecorded: new Date(orderData.customer.created_at || orderDate)
          }
        })
        processed++
      }
    }

    return { success: true, processed }
  } catch (error) {
    console.error('Error processing order webhook:', error)
    throw error
  }
}

/**
 * Process order cancellation
 */
async function processOrderCancellation(
  integrationId: string,
  orderData: any
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'order_cancelled',
        value: parseFloat(orderData.total_price || '0'),
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          cancelReason: orderData.cancel_reason,
          cancelledAt: orderData.cancelled_at,
          source: 'shopify_webhook'
        },
        dateRecorded: new Date(orderData.cancelled_at || Date.now())
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing order cancellation:', error)
    throw error
  }
}

/**
 * Process order fulfillment
 */
async function processOrderFulfillment(
  integrationId: string,
  orderData: any
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'order_fulfilled',
        value: 1,
        metadata: {
          orderId: orderData.id,
          orderNumber: orderData.order_number,
          fulfillmentStatus: orderData.fulfillment_status,
          source: 'shopify_webhook'
        },
        dateRecorded: new Date(orderData.updated_at || Date.now())
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing order fulfillment:', error)
    throw error
  }
}

/**
 * Process order refund
 */
async function processOrderRefund(
  integrationId: string,
  refundData: any
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'order_refunded',
        value: parseFloat(refundData.refund?.amount || '0'),
        metadata: {
          orderId: refundData.order_id,
          refundId: refundData.id,
          refundAmount: refundData.refund?.amount,
          reason: refundData.note,
          source: 'shopify_webhook'
        },
        dateRecorded: new Date(refundData.created_at || Date.now())
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing order refund:', error)
    throw error
  }
}

/**
 * Process customer creation
 */
async function processCustomerCreation(
  integrationId: string,
  customerData: any
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'customers',
        value: 1,
        metadata: {
          customerId: customerData.id,
          email: customerData.email,
          firstName: customerData.first_name,
          lastName: customerData.last_name,
          acceptsMarketing: customerData.accepts_marketing,
          source: 'shopify_webhook'
        },
        dateRecorded: new Date(customerData.created_at || Date.now())
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing customer creation:', error)
    throw error
  }
}

/**
 * Process app uninstallation
 */
async function processAppUninstall(
  integrationId: string,
  webhookData: any
): Promise<{ success: boolean; processed: number }> {
  try {
    // Deactivate the integration
    const integration = await prisma.integration.update({
      where: { id: integrationId },
      data: {
        status: 'inactive',
        accessToken: null,
        refreshToken: null,
        metadata: {
          uninstalledAt: new Date().toISOString(),
          uninstallReason: 'app_uninstalled',
          finalShopData: webhookData
        }
      }
    })

    // Log the uninstall event
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'integration_uninstalled',
        value: 1,
        metadata: {
          platform: 'shopify',
          reason: 'app_uninstalled',
          shopDomain: webhookData.domain,
          source: 'shopify_webhook'
        },
        dateRecorded: new Date()
      }
    })

    console.log(`Shopify app uninstalled for integration ${integrationId}`)
    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Error processing app uninstall:', error)
    throw error
  }
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ access_token: string; scope: string }> {
  const response = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      code
    })
  })

  if (!response.ok) {
    throw new Error(`Failed to exchange code for token: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(shop: string, state: string): string {
  const scopes = 'read_orders,read_customers,read_products,read_analytics'
  const redirectUri = `${process.env.APP_URL}/api/integrations/shopify/callback`
  
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_CLIENT_ID!,
    scope: scopes,
    redirect_uri: redirectUri,
    state,
    'grant_options[]': 'per-user'
  })

  return `https://${shop}.myshopify.com/admin/oauth/authorize?${params.toString()}`
}