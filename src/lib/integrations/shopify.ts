// src/lib/integrations/shopify.ts
import { prisma } from '@/lib/prisma'

/**
 * Shopify API Types
 */
interface ShopifyOrder {
  id: number
  number: number
  email?: string
  created_at: string
  updated_at: string
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  financial_status: string
  fulfillment_status?: string
  cancelled_at?: string
  cancel_reason?: string
  customer?: {
    id: number
    email?: string
    first_name?: string
    last_name?: string
  }
  line_items: Array<{
    id: number
    product_id: number
    variant_id: number
    title: string
    quantity: number
    price: string
    total_discount: string
  }>
}

interface ShopifyCustomer {
  id: number
  email?: string
  first_name?: string
  last_name?: string
  created_at: string
  updated_at: string
  orders_count: number
  total_spent: string
  accepts_marketing: boolean
  state: string
  tags: string
}

interface ShopifyProduct {
  id: number
  title: string
  vendor: string
  product_type: string
  created_at: string
  updated_at: string
  published_at?: string
  status: string
  variants: Array<{
    id: number
    price: string
    inventory_quantity: number
    sku?: string
  }>
}

interface ShopifyWebhook {
  id: number
  topic: string
  address: string
  format: string
  created_at: string
  updated_at: string
}

/**
 * Shopify Integration Class
 */
export class ShopifyIntegration {
  private accessToken: string
  private shopDomain: string
  private apiVersion: string = '2023-10'
  private baseUrl: string

  constructor(accessToken: string, shopDomain: string) {
    this.accessToken = accessToken
    this.shopDomain = shopDomain.replace('.myshopify.com', '')
    this.baseUrl = `https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}`
  }

  /**
   * Make authenticated API request with retry logic
   */
  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {},
    retries: number = 3
  ): Promise<any> {
    const url = `${this.baseUrl}/${endpoint}`
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json',
            ...options.headers
          }
        })

        if (!response.ok) {
          // Handle rate limiting
          if (response.status === 429) {
            const callLimit = response.headers.get('X-Shopify-Shop-Api-Call-Limit')
            console.log(`Rate limited. Call limit: ${callLimit}`)
            
            if (attempt < retries) {
              const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
          }

          const errorText = await response.text().catch(() => 'Unknown error')
          throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`)
        }

        return response.json()
      } catch (error) {
        if (attempt === retries) throw error
        
        // Network error - retry with backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getShopInfo()
      return true
    } catch (error) {
      console.error('Shopify connection test failed:', error)
      return false
    }
  }

  /**
   * Get shop information
   */
  async getShopInfo(): Promise<any> {
    const data = await this.makeRequest('shop.json')
    return data.shop
  }

  /**
   * Get orders with pagination
   */
  async getOrders(params: {
    limit?: number
    sinceId?: string
    createdAtMin?: string
    createdAtMax?: string
    updatedAtMin?: string
    status?: string
    financialStatus?: string
    fulfillmentStatus?: string
  } = {}): Promise<{ orders: ShopifyOrder[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    
    searchParams.append('limit', (params.limit || 250).toString())
    if (params.sinceId) searchParams.append('since_id', params.sinceId)
    if (params.createdAtMin) searchParams.append('created_at_min', params.createdAtMin)
    if (params.createdAtMax) searchParams.append('created_at_max', params.createdAtMax)
    if (params.updatedAtMin) searchParams.append('updated_at_min', params.updatedAtMin)
    if (params.status) searchParams.append('status', params.status)
    if (params.financialStatus) searchParams.append('financial_status', params.financialStatus)
    if (params.fulfillmentStatus) searchParams.append('fulfillment_status', params.fulfillmentStatus)
    
    const data = await this.makeRequest(`orders.json?${searchParams.toString()}`)
    return {
      orders: data.orders || [],
      hasMore: (data.orders || []).length === (params.limit || 250)
    }
  }

  /**
   * Get customers with pagination
   */
  async getCustomers(params: {
    limit?: number
    sinceId?: string
    createdAtMin?: string
    createdAtMax?: string
    updatedAtMin?: string
  } = {}): Promise<{ customers: ShopifyCustomer[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    
    searchParams.append('limit', (params.limit || 250).toString())
    if (params.sinceId) searchParams.append('since_id', params.sinceId)
    if (params.createdAtMin) searchParams.append('created_at_min', params.createdAtMin)
    if (params.createdAtMax) searchParams.append('created_at_max', params.createdAtMax)
    if (params.updatedAtMin) searchParams.append('updated_at_min', params.updatedAtMin)
    
    const data = await this.makeRequest(`customers.json?${searchParams.toString()}`)
    return {
      customers: data.customers || [],
      hasMore: (data.customers || []).length === (params.limit || 250)
    }
  }

  /**
   * Get products with pagination
   */
  async getProducts(params: {
    limit?: number
    sinceId?: string
    createdAtMin?: string
    createdAtMax?: string
    updatedAtMin?: string
    status?: string
  } = {}): Promise<{ products: ShopifyProduct[]; hasMore: boolean }> {
    const searchParams = new URLSearchParams()
    
    searchParams.append('limit', (params.limit || 250).toString())
    if (params.sinceId) searchParams.append('since_id', params.sinceId)
    if (params.createdAtMin) searchParams.append('created_at_min', params.createdAtMin)
    if (params.createdAtMax) searchParams.append('created_at_max', params.createdAtMax)
    if (params.updatedAtMin) searchParams.append('updated_at_min', params.updatedAtMin)
    if (params.status) searchParams.append('status', params.status)
    
    const data = await this.makeRequest(`products.json?${searchParams.toString()}`)
    return {
      products: data.products || [],
      hasMore: (data.products || []).length === (params.limit || 250)
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const params = new URLSearchParams({
      'created_at_min': startDate.toISOString(),
      'created_at_max': endDate.toISOString()
    })
    
    // Get order analytics
    const ordersData = await this.makeRequest(`orders.json?${params.toString()}&status=any&limit=250`)
    const orders = ordersData.orders || []
    
    // Calculate metrics
    const totalRevenue = orders.reduce((sum: number, order: any) => 
      sum + parseFloat(order.total_price || '0'), 0)
    const orderCount = orders.length
    const uniqueCustomers = new Set(orders.map((o: any) => o.customer?.id).filter(Boolean)).size
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0
    
    return {
      revenue: totalRevenue,
      orderCount,
      customerCount: uniqueCustomers,
      averageOrderValue,
      orders
    }
  }

  /**
   * Create webhook
   */
  async createWebhook(topic: string, address: string): Promise<ShopifyWebhook> {
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
  async getWebhooks(): Promise<ShopifyWebhook[]> {
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
   * Setup required webhooks for integration
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
      'customers/update',
      'app/uninstalled'
    ]

    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
    const webhookUrls: string[] = []

    // Clean up existing webhooks first
    const existingWebhooks = await this.getWebhooks()
    for (const webhook of existingWebhooks) {
      if (webhook.address.includes('/api/webhooks/shopify')) {
        try {
          await this.deleteWebhook(webhook.id.toString())
          console.log(`Deleted existing webhook: ${webhook.id}`)
        } catch (error) {
          console.warn(`Failed to delete webhook ${webhook.id}:`, error)
        }
      }
    }

    // Create new webhooks
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
   * Sync historical data for initial setup
   */
  async syncHistoricalData(integrationId: string, days: number = 30): Promise<{
    orders: number
    customers: number
    products: number
  }> {
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)
    const sinceIso = sinceDate.toISOString()

    let syncCounts = { orders: 0, customers: 0, products: 0 }

    try {
      // Sync orders
      await this.syncOrders(integrationId, { createdAtMin: sinceIso })
      
      // Sync customers
      await this.syncCustomers(integrationId, { createdAtMin: sinceIso })
      
      // Sync products (no date filter for initial sync)
      await this.syncProducts(integrationId, {})

      // Count synced records
      const counts = await Promise.all([
        prisma.dataPoint.count({ 
          where: { 
            integrationId, 
            metricType: 'revenue',
            dateRecorded: { gte: sinceDate }
          } 
        }),
        prisma.dataPoint.count({ 
          where: { 
            integrationId, 
            metricType: 'customer_created',
            dateRecorded: { gte: sinceDate }
          } 
        }),
        prisma.dataPoint.count({ 
          where: { 
            integrationId, 
            metricType: 'product_created'
          } 
        })
      ])

      return {
        orders: counts[0],
        customers: counts[1],
        products: counts[2]
      }
    } catch (error) {
      console.error('Error syncing Shopify historical data:', error)
      throw error
    }
  }

  /**
   * Sync orders data
   */
  private async syncOrders(integrationId: string, params: any): Promise<void> {
    let hasMore = true
    let sinceId: string | undefined

    while (hasMore) {
      const result = await this.getOrders({ 
        ...params, 
        limit: 250, 
        sinceId,
        status: 'any' // Get all orders regardless of status
      })

      for (const order of result.orders) {
        // Create revenue data point for paid orders
        if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
          await prisma.dataPoint.create({
            data: {
              integrationId,
              metricType: 'revenue',
              value: parseFloat(order.total_price || '0'),
              metadata: {
                orderId: order.id,
                orderNumber: order.number,
                customerId: order.customer?.id,
                currency: order.currency,
                financialStatus: order.financial_status,
                fulfillmentStatus: order.fulfillment_status,
                itemCount: order.line_items?.length || 0,
                customerEmail: order.customer?.email || order.email,
                source: 'shopify_sync'
              },
              dateRecorded: new Date(order.created_at)
            }
          })
        }

        // Create order count data point
        await prisma.dataPoint.create({
          data: {
            integrationId,
            metricType: 'orders',
            value: 1,
            metadata: {
              orderId: order.id,
              orderNumber: order.number,
              customerId: order.customer?.id,
              totalPrice: order.total_price,
              currency: order.currency,
              financialStatus: order.financial_status,
              fulfillmentStatus: order.fulfillment_status,
              source: 'shopify_sync'
            },
            dateRecorded: new Date(order.created_at)
          }
        })
      }

      hasMore = result.hasMore
      if (hasMore && result.orders.length > 0) {
        sinceId = result.orders[result.orders.length - 1].id.toString()
      }
    }
  }

  /**
   * Sync customers data
   */
  private async syncCustomers(integrationId: string, params: any): Promise<void> {
    let hasMore = true
    let sinceId: string | undefined

    while (hasMore) {
      const result = await this.getCustomers({ 
        ...params, 
        limit: 250, 
        sinceId 
      })

      for (const customer of result.customers) {
        await prisma.dataPoint.create({
          data: {
            integrationId,
            metricType: 'customer_created',
            value: 1,
            metadata: {
              customerId: customer.id,
              email: customer.email,
              firstName: customer.first_name,
              lastName: customer.last_name,
              ordersCount: customer.orders_count,
              totalSpent: customer.total_spent,
              acceptsMarketing: customer.accepts_marketing,
              state: customer.state,
              tags: customer.tags,
              source: 'shopify_sync'
            },
            dateRecorded: new Date(customer.created_at)
          }
        })
      }

      hasMore = result.hasMore
      if (hasMore && result.customers.length > 0) {
        sinceId = result.customers[result.customers.length - 1].id.toString()
      }
    }
  }

  /**
   * Sync products data
   */
  private async syncProducts(integrationId: string, params: any): Promise<void> {
    let hasMore = true
    let sinceId: string | undefined

    while (hasMore) {
      const result = await this.getProducts({ 
        ...params, 
        limit: 250, 
        sinceId 
      })

      for (const product of result.products) {
        await prisma.dataPoint.create({
          data: {
            integrationId,
            metricType: 'product_created',
            value: 1,
            metadata: {
              productId: product.id,
              title: product.title,
              vendor: product.vendor,
              productType: product.product_type,
              status: product.status,
              variantsCount: product.variants?.length || 0,
              publishedAt: product.published_at,
              source: 'shopify_sync'
            },
            dateRecorded: new Date(product.created_at)
          }
        })
      }

      hasMore = result.hasMore
      if (hasMore && result.products.length > 0) {
        sinceId = result.products[result.products.length - 1].id.toString()
      }
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  static generateAuthUrl(shop: string, state: string): string {
    const scopes = 'read_orders,read_customers,read_products,read_analytics'
    const redirectUri = `${process.env.NEXTAUTH_URL || process.env.APP_URL}/api/integrations/shopify/callback`
    
    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      scope: scopes,
      redirect_uri: redirectUri,
      state,
      'grant_options[]': 'per-user'
    })

    return `https://${shop}.myshopify.com/admin/oauth/authorize?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  static async exchangeCodeForToken(
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
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(`Failed to exchange code for token: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return response.json()
  }
}

/**
 * Handle Shopify webhook events
 */
export async function handleShopifyWebhook(
  integrationId: string,
  topic: string,
  webhookData: any
): Promise<{ success: boolean; processed: number; error?: string }> {
  try {
    console.log(`Processing Shopify webhook: ${topic} for integration ${integrationId}`)

    switch (topic) {
      case 'orders/create':
        return await processOrderCreated(integrationId, webhookData)
      
      case 'orders/updated':
        return await processOrderUpdated(integrationId, webhookData)
      
      case 'orders/paid':
        return await processOrderPaid(integrationId, webhookData)
      
      case 'orders/cancelled':
        return await processOrderCancelled(integrationId, webhookData)
      
      case 'orders/fulfilled':
        return await processOrderFulfilled(integrationId, webhookData)
      
      case 'orders/refunded':
        return await processOrderRefunded(integrationId, webhookData)
      
      case 'customers/create':
        return await processCustomerCreated(integrationId, webhookData)
      
      case 'customers/update':
        return await processCustomerUpdated(integrationId, webhookData)
      
      case 'app/uninstalled':
        return await processAppUninstalled(integrationId, webhookData)
      
      default:
        console.log(`Unhandled Shopify webhook event type: ${topic}`)
        return { success: true, processed: 0 }
    }

  } catch (error) {
    console.error(`Error handling Shopify webhook ${topic}:`, error)
    return {
      success: false,
      processed: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Webhook processing functions
async function processOrderCreated(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  const dataPoints: any[] = []

  // Create order count data point
  dataPoints.push({
    integrationId,
    metricType: 'orders',
    value: 1,
    metadata: {
      orderId: order.id,
      orderNumber: order.number,
      customerId: order.customer?.id,
      totalPrice: order.total_price,
      currency: order.currency,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status,
      source: 'shopify_webhook'
    },
    dateRecorded: new Date(order.created_at)
  })

  // Create revenue data point if paid
  if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
    dataPoints.push({
      integrationId,
      metricType: 'revenue',
      value: parseFloat(order.total_price || '0'),
      metadata: {
        orderId: order.id,
        orderNumber: order.number,
        customerId: order.customer?.id,
        currency: order.currency,
        financialStatus: order.financial_status,
        source: 'shopify_webhook'
      },
      dateRecorded: new Date(order.created_at)
    })
  }

  // Save all data points
  await prisma.dataPoint.createMany({ data: dataPoints })

  return { success: true, processed: dataPoints.length }
}

async function processOrderUpdated(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  // Find existing order data points
  const existingDataPoints = await prisma.dataPoint.findMany({
    where: {
      integrationId,
      metadata: {
        path: ['orderId'],
        equals: order.id
      }
    }
  })

  let processed = 0

  // Update existing data points
  for (const dataPoint of existingDataPoints) {
    const metadata = dataPoint.metadata as any
    await prisma.dataPoint.update({
      where: { id: dataPoint.id },
      data: {
        metadata: {
          ...metadata,
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          updatedAt: order.updated_at,
          source: 'shopify_webhook'
        }
      }
    })
    processed++
  }

  // If order status changed to paid, create new revenue data point
  if ((order.financial_status === 'paid' || order.financial_status === 'partially_paid') &&
      !existingDataPoints.some(dp => dp.metricType === 'revenue')) {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'revenue',
        value: parseFloat(order.total_price || '0'),
        metadata: {
          orderId: order.id,
          orderNumber: order.number,
          customerId: order.customer?.id,
          currency: order.currency,
          financialStatus: order.financial_status,
          source: 'shopify_webhook'
        },
        dateRecorded: new Date(order.updated_at)
      }
    })
    processed++
  }

  return { success: true, processed }
}

async function processOrderPaid(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'order_paid',
      value: parseFloat(order.total_price || '0'),
      metadata: {
        orderId: order.id,
        orderNumber: order.number,
        customerId: order.customer?.id,
        currency: order.currency,
        financialStatus: order.financial_status,
        source: 'shopify_webhook'
      },
      dateRecorded: new Date()
    }
  })

  return { success: true, processed: 1 }
}

async function processOrderCancelled(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'order_cancelled',
      value: parseFloat(order.total_price || '0'),
      metadata: {
        orderId: order.id,
        orderNumber: order.number,
        customerId: order.customer?.id,
        currency: order.currency,
        cancelledAt: order.cancelled_at,
        cancelReason: order.cancel_reason,
        source: 'shopify_webhook'
      },
      dateRecorded: new Date()
    }
  })

  return { success: true, processed: 1 }
}

async function processOrderFulfilled(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'order_fulfilled',
      value: 1,
      metadata: {
        orderId: order.id,
        orderNumber: order.number,
        customerId: order.customer?.id,
        fulfillmentStatus: order.fulfillment_status,
        source: 'shopify_webhook'
      },
      dateRecorded: new Date()
    }
  })

  return { success: true, processed: 1 }
}

async function processOrderRefunded(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'order_refunded',
      value: parseFloat(order.total_price || '0'),
      metadata: {
        orderId: order.id,
        orderNumber: order.number,
        customerId: order.customer?.id,
        currency: order.currency,
        source: 'shopify_webhook'
      },
      dateRecorded: new Date()
    }
  })

  return { success: true, processed: 1 }
}

async function processCustomerCreated(
  integrationId: string,
  customer: ShopifyCustomer
): Promise<{ success: boolean; processed: number }> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'customer_created',
      value: 1,
      metadata: {
        customerId: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        acceptsMarketing: customer.accepts_marketing,
        source: 'shopify_webhook'
      },
      dateRecorded: new Date(customer.created_at)
    }
  })

  return { success: true, processed: 1 }
}

async function processCustomerUpdated(
  integrationId: string,
  customer: ShopifyCustomer
): Promise<{ success: boolean; processed: number }> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'customer_updated',
      value: 1,
      metadata: {
        customerId: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        ordersCount: customer.orders_count,
        totalSpent: customer.total_spent,
        source: 'shopify_webhook'
      },
      dateRecorded: new Date()
    }
  })

  return { success: true, processed: 1 }
}

async function processAppUninstalled(
  integrationId: string,
  webhookData: any
): Promise<{ success: boolean; processed: number }> {
  // Deactivate integration
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      status: 'disconnected',
      accessToken: null,
      refreshToken: null,
      metadata: {
        uninstalledAt: new Date().toISOString(),
        uninstallReason: 'app_uninstalled',
        finalShopData: webhookData
      }
    }
  })

  // Log uninstall event
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

  return { success: true, processed: 1 }
}