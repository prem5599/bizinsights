// src/lib/integrations/shopify.ts
import { prisma } from '@/lib/prisma'
import { Decimal } from '@prisma/client/runtime/library'

interface ShopifyConfig {
  shopDomain: string
  accessToken: string
  apiVersion?: string
}

interface ShopifyOrder {
  id: number
  name: string
  created_at: string
  updated_at: string
  total_price: string
  subtotal_price: string
  total_tax: string
  currency: string
  financial_status: string
  fulfillment_status: string | null
  customer?: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
  line_items: Array<{
    id: number
    product_id: number
    variant_id: number
    title: string
    quantity: number
    price: string
  }>
  shipping_address?: {
    country: string
    province: string
    city: string
  }
}

interface ShopifyProduct {
  id: number
  title: string
  handle: string
  created_at: string
  updated_at: string
  product_type: string
  vendor: string
  status: string
  variants: Array<{
    id: number
    title: string
    price: string
    inventory_quantity: number
    sku: string
  }>
}

interface ShopifyCustomer {
  id: number
  email: string
  first_name: string
  last_name: string
  created_at: string
  updated_at: string
  total_spent: string
  orders_count: number
  state: string
}

export class ShopifyConnector {
  private config: ShopifyConfig
  private baseUrl: string

  constructor(config: ShopifyConfig) {
    this.config = {
      ...config,
      apiVersion: config.apiVersion || '2023-10'
    }
    this.baseUrl = `https://${config.shopDomain}/admin/api/${this.config.apiVersion}`
  }

  // Main sync function
  async syncData(integrationId: string, lastSyncAt?: Date): Promise<{ success: boolean; error?: string; stats?: any }> {
    try {
      console.log(`Starting Shopify sync for integration ${integrationId}`)
      
      // Validate connection first
      const shopInfo = await this.getShopInfo()
      if (!shopInfo) {
        throw new Error('Failed to connect to Shopify store')
      }

      const stats = {
        orders: 0,
        customers: 0,
        products: 0,
        revenue: 0
      }

      // Sync orders (most important for analytics)
      const orderStats = await this.syncOrders(integrationId, lastSyncAt)
      stats.orders = orderStats.count
      stats.revenue = orderStats.revenue

      // Sync customers
      const customerStats = await this.syncCustomers(integrationId, lastSyncAt)
      stats.customers = customerStats.count

      // Sync products (less frequent, only if no recent sync)
      if (!lastSyncAt || this.shouldSyncProducts(lastSyncAt)) {
        const productStats = await this.syncProducts(integrationId)
        stats.products = productStats.count
      }

      // Update integration sync timestamp
      await prisma.integration.update({
        where: { id: integrationId },
        data: { 
          lastSyncAt: new Date(),
          status: 'active'
        }
      })

      console.log(`Shopify sync completed for integration ${integrationId}:`, stats)
      return { success: true, stats }

    } catch (error) {
      console.error(`Shopify sync failed for integration ${integrationId}:`, error)
      
      // Update integration status to error
      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: 'error' }
      })

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  }

  // Sync orders and create revenue/order data points
  private async syncOrders(integrationId: string, lastSyncAt?: Date): Promise<{ count: number; revenue: number }> {
    let allOrders: ShopifyOrder[] = []
    let pageInfo: string | null = null
    let totalRevenue = 0

    // Determine sync date range
    const sinceDate = lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Default: last 30 days
    
    try {
      do {
        const orders = await this.fetchOrders({
          limit: 250,
          status: 'any',
          created_at_min: sinceDate.toISOString(),
          page_info: pageInfo
        })

        allOrders = allOrders.concat(orders.orders)
        pageInfo = orders.pageInfo
        
        // Add delay to respect rate limits
        await this.delay(500)
        
      } while (pageInfo && allOrders.length < 5000) // Safety limit

      console.log(`Fetched ${allOrders.length} orders from Shopify`)

      // Process orders and create data points
      const dataPoints = []
      
      for (const order of allOrders) {
        const orderValue = parseFloat(order.total_price)
        totalRevenue += orderValue

        // Create revenue data point
        dataPoints.push({
          integrationId,
          metricType: 'revenue',
          value: new Decimal(orderValue),
          metadata: {
            orderId: order.id,
            orderName: order.name,
            currency: order.currency,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            customerEmail: order.customer?.email,
            itemCount: order.line_items.length
          },
          dateRecorded: new Date(order.created_at)
        })

        // Create order count data point
        dataPoints.push({
          integrationId,
          metricType: 'orders',
          value: new Decimal(1),
          metadata: {
            orderId: order.id,
            orderName: order.name,
            value: orderValue,
            currency: order.currency
          },
          dateRecorded: new Date(order.created_at)
        })

        // Create customer data point if new customer
        if (order.customer) {
          dataPoints.push({
            integrationId,
            metricType: 'customers',
            value: new Decimal(1),
            metadata: {
              customerId: order.customer.id,
              customerEmail: order.customer.email,
              orderId: order.id
            },
            dateRecorded: new Date(order.created_at)
          })
        }
      }

      // Batch create data points
      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return { count: allOrders.length, revenue: totalRevenue }

    } catch (error) {
      console.error('Error syncing Shopify orders:', error)
      throw error
    }
  }

  // Sync customers
  private async syncCustomers(integrationId: string, lastSyncAt?: Date): Promise<{ count: number }> {
    let allCustomers: ShopifyCustomer[] = []
    let pageInfo: string | null = null

    const sinceDate = lastSyncAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    try {
      do {
        const customers = await this.fetchCustomers({
          limit: 250,
          created_at_min: sinceDate.toISOString(),
          page_info: pageInfo
        })

        allCustomers = allCustomers.concat(customers.customers)
        pageInfo = customers.pageInfo

        await this.delay(500)
        
      } while (pageInfo && allCustomers.length < 3000)

      // Create customer session data points
      const dataPoints = allCustomers.map(customer => ({
        integrationId,
        metricType: 'customer_sessions',
        value: new Decimal(1),
        metadata: {
          customerId: customer.id,
          customerEmail: customer.email,
          totalSpent: customer.total_spent,
          ordersCount: customer.orders_count,
          state: customer.state
        },
        dateRecorded: new Date(customer.created_at)
      }))

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return { count: allCustomers.length }

    } catch (error) {
      console.error('Error syncing Shopify customers:', error)
      throw error
    }
  }

  // Sync products (less frequent)
  private async syncProducts(integrationId: string): Promise<{ count: number }> {
    let allProducts: ShopifyProduct[] = []
    let pageInfo: string | null = null

    try {
      do {
        const products = await this.fetchProducts({
          limit: 250,
          page_info: pageInfo
        })

        allProducts = allProducts.concat(products.products)
        pageInfo = products.pageInfo

        await this.delay(500)
        
      } while (pageInfo && allProducts.length < 2000)

      // Store product data for inventory insights
      const dataPoints = allProducts.flatMap(product => 
        product.variants.map(variant => ({
          integrationId,
          metricType: 'inventory',
          value: new Decimal(variant.inventory_quantity || 0),
          metadata: {
            productId: product.id,
            variantId: variant.id,
            productTitle: product.title,
            variantTitle: variant.title,
            price: variant.price,
            sku: variant.sku,
            productType: product.product_type,
            vendor: product.vendor
          },
          dateRecorded: new Date()
        }))
      )

      if (dataPoints.length > 0) {
        await this.batchCreateDataPoints(dataPoints)
      }

      return { count: allProducts.length }

    } catch (error) {
      console.error('Error syncing Shopify products:', error)
      throw error
    }
  }

  // API Methods
  private async fetchOrders(params: Record<string, any>): Promise<{ orders: ShopifyOrder[]; pageInfo: string | null }> {
    const url = new URL(`${this.baseUrl}/orders.json`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value.toString())
      }
    })

    const response = await this.makeRequest(url.toString())
    return {
      orders: response.orders || [],
      pageInfo: this.extractPageInfo(response.headers)
    }
  }

  private async fetchCustomers(params: Record<string, any>): Promise<{ customers: ShopifyCustomer[]; pageInfo: string | null }> {
    const url = new URL(`${this.baseUrl}/customers.json`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value.toString())
      }
    })

    const response = await this.makeRequest(url.toString())
    return {
      customers: response.customers || [],
      pageInfo: this.extractPageInfo(response.headers)
    }
  }

  private async fetchProducts(params: Record<string, any>): Promise<{ products: ShopifyProduct[]; pageInfo: string | null }> {
    const url = new URL(`${this.baseUrl}/products.json`)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value.toString())
      }
    })

    const response = await this.makeRequest(url.toString())
    return {
      products: response.products || [],
      pageInfo: this.extractPageInfo(response.headers)
    }
  }

  private async getShopInfo(): Promise<any> {
    try {
      const response = await this.makeRequest(`${this.baseUrl}/shop.json`)
      return response.shop
    } catch (error) {
      console.error('Failed to get shop info:', error)
      return null
    }
  }

  // Utility Methods
  private async makeRequest(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': this.config.accessToken,
        'Content-Type': 'application/json',
        'User-Agent': 'BizInsights/1.0'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    return { ...data, headers: response.headers }
  }

  private extractPageInfo(headers: Headers): string | null {
    const linkHeader = headers.get('Link')
    if (!linkHeader) return null

    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
    if (!nextMatch) return null

    const url = new URL(nextMatch[1])
    return url.searchParams.get('page_info')
  }

  private async batchCreateDataPoints(dataPoints: any[]): Promise<void> {
    const batchSize = 1000
    
    for (let i = 0; i < dataPoints.length; i += batchSize) {
      const batch = dataPoints.slice(i, i + batchSize)
      
      try {
        await prisma.dataPoint.createMany({
          data: batch,
          skipDuplicates: true
        })
      } catch (error) {
        console.error(`Failed to create batch ${i / batchSize + 1}:`, error)
        // Continue with next batch instead of failing completely
      }
    }
  }

  private shouldSyncProducts(lastSyncAt: Date): boolean {
    const hoursAgo = (Date.now() - lastSyncAt.getTime()) / (1000 * 60 * 60)
    return hoursAgo > 24 // Sync products only once per day
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Helper function to create Shopify connector instance
export function createShopifyConnector(config: ShopifyConfig): ShopifyConnector {
  return new ShopifyConnector(config)
}

// Webhook handler for real-time updates
export async function handleShopifyWebhook(
  integrationId: string,
  topic: string,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Handling Shopify webhook: ${topic} for integration ${integrationId}`)

    switch (topic) {
      case 'orders/create':
      case 'orders/updated':
        await handleOrderWebhook(integrationId, payload)
        break
      
      case 'orders/cancelled':
        await handleOrderCancellation(integrationId, payload)
        break
      
      case 'customers/create':
      case 'customers/update':
        await handleCustomerWebhook(integrationId, payload)
        break
      
      default:
        console.log(`Unhandled webhook topic: ${topic}`)
    }

    return { success: true }
    
  } catch (error) {
    console.error(`Webhook handling failed for ${topic}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

async function handleOrderWebhook(integrationId: string, order: ShopifyOrder): Promise<void> {
  const orderValue = parseFloat(order.total_price)

  const dataPoints = [
    {
      integrationId,
      metricType: 'revenue',
      value: new Decimal(orderValue),
      metadata: {
        orderId: order.id,
        orderName: order.name,
        currency: order.currency,
        financialStatus: order.financial_status,
        webhook: true
      },
      dateRecorded: new Date(order.created_at)
    },
    {
      integrationId,
      metricType: 'orders',
      value: new Decimal(1),
      metadata: {
        orderId: order.id,
        orderName: order.name,
        value: orderValue,
        webhook: true
      },
      dateRecorded: new Date(order.created_at)
    }
  ]

  await prisma.dataPoint.createMany({
    data: dataPoints,
    skipDuplicates: true
  })
}

async function handleOrderCancellation(integrationId: string, order: ShopifyOrder): Promise<void> {
  // Create negative data points for cancelled orders
  const orderValue = parseFloat(order.total_price)

  const dataPoints = [
    {
      integrationId,
      metricType: 'revenue',
      value: new Decimal(-orderValue),
      metadata: {
        orderId: order.id,
        orderName: order.name,
        currency: order.currency,
        status: 'cancelled',
        webhook: true
      },
      dateRecorded: new Date()
    },
    {
      integrationId,
      metricType: 'orders',
      value: new Decimal(-1),
      metadata: {
        orderId: order.id,
        orderName: order.name,
        status: 'cancelled',
        webhook: true
      },
      dateRecorded: new Date()
    }
  ]

  await prisma.dataPoint.createMany({
    data: dataPoints,
    skipDuplicates: true
  })
}

async function handleCustomerWebhook(integrationId: string, customer: ShopifyCustomer): Promise<void> {
  await prisma.dataPoint.create({
    data: {
      integrationId,
      metricType: 'customers',
      value: new Decimal(1),
      metadata: {
        customerId: customer.id,
        customerEmail: customer.email,
        totalSpent: customer.total_spent,
        ordersCount: customer.orders_count,
        webhook: true
      },
      dateRecorded: new Date(customer.created_at)
    }
  })
}