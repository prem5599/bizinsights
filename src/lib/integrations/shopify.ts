// src/lib/integrations/shopify.ts
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Shopify API Version 2024-10 - Updated from 2023-10
 */
const SHOPIFY_API_VERSION = '2024-10'

/**
 * Rate Limiting Constants (2024-10 specs)
 * Shopify allows 40 requests per app per store per second
 */
const RATE_LIMIT = {
  REQUESTS_PER_SECOND: 40,
  RETRY_DELAY_BASE: 1000, // 1 second base delay
  MAX_RETRIES: 5,
  BACKOFF_MULTIPLIER: 2
}

/**
 * Enhanced Shopify API Types for 2024-10
 */
interface ShopifyOrder {
  id: number
  admin_graphql_api_id: string
  app_id?: number
  browser_ip?: string
  buyer_accepts_marketing: boolean
  cancel_reason?: string
  cancelled_at?: string
  cart_token?: string
  checkout_id?: number
  checkout_token?: string
  client_details?: {
    accept_language?: string
    browser_height?: number
    browser_ip?: string
    browser_width?: number
    session_hash?: string
    user_agent?: string
  }
  closed_at?: string
  confirmed: boolean
  contact_email?: string
  created_at: string
  currency: string
  current_subtotal_price: string
  current_subtotal_price_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  current_total_discounts: string
  current_total_discounts_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  current_total_duties_set?: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  current_total_price: string
  current_total_price_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  current_total_tax: string
  current_total_tax_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  customer_locale?: string
  device_id?: number
  discount_codes: Array<{
    code: string
    amount: string
    type: string
  }>
  email: string
  estimated_taxes: boolean
  financial_status: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided'
  fulfillment_status?: 'fulfilled' | 'null' | 'partial' | 'restocked'
  gateway?: string
  landing_site?: string
  landing_site_ref?: string
  location_id?: number
  name: string
  note?: string
  note_attributes: Array<{ name: string; value: string }>
  number: number
  order_number: number
  order_status_url: string
  original_total_duties_set?: any
  payment_gateway_names: string[]
  phone?: string
  presentment_currency: string
  processed_at: string
  processing_method: string
  reference?: string
  referring_site?: string
  source_identifier?: string
  source_name: string
  source_url?: string
  subtotal_price: string
  subtotal_price_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  tags: string
  tax_lines: Array<{
    price: string
    rate: number
    title: string
    price_set: {
      shop_money: { amount: string; currency_code: string }
      presentment_money: { amount: string; currency_code: string }
    }
  }>
  taxes_included: boolean
  test: boolean
  token: string
  total_discounts: string
  total_discounts_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  total_line_items_price: string
  total_line_items_price_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  total_outstanding: string
  total_price: string
  total_price_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  total_price_usd: string
  total_shipping_price_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  total_tax: string
  total_tax_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  total_tip_received: string
  total_weight: number
  updated_at: string
  user_id?: number
  billing_address?: ShopifyAddress
  shipping_address?: ShopifyAddress
  fulfillments: ShopifyFulfillment[]
  line_items: ShopifyLineItem[]
  payment_details?: any
  shipping_lines: Array<{
    id: number
    carrier_identifier?: string
    code?: string
    delivery_category?: string
    discounted_price: string
    discounted_price_set: {
      shop_money: { amount: string; currency_code: string }
      presentment_money: { amount: string; currency_code: string }
    }
    phone?: string
    price: string
    price_set: {
      shop_money: { amount: string; currency_code: string }
      presentment_money: { amount: string; currency_code: string }
    }
    requested_fulfillment_service_id?: number
    source: string
    title: string
    tax_lines: Array<any>
    validation_errors: Array<any>
  }>
  tax_lines_summary: Array<{
    title: string
    price: string
    price_set: {
      shop_money: { amount: string; currency_code: string }
      presentment_money: { amount: string; currency_code: string }
    }
    rate: number
  }>
  refunds: Array<any>
  customer?: ShopifyCustomer
}

interface ShopifyCustomer {
  id: number
  email: string
  accepts_marketing: boolean
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  orders_count: number
  state: 'disabled' | 'invited' | 'enabled' | 'declined'
  total_spent: string
  last_order_id?: number
  note?: string
  verified_email: boolean
  multipass_identifier?: string
  tax_exempt: boolean
  phone?: string
  tags: string
  currency: string
  accepts_marketing_updated_at: string
  marketing_opt_in_level?: 'single_opt_in' | 'confirmed_opt_in' | 'unknown'
  tax_exemptions: string[]
  email_marketing_consent?: {
    state: 'subscribed' | 'not_subscribed' | 'pending' | 'unsubscribed'
    opt_in_level: 'single_opt_in' | 'confirmed_opt_in' | 'unknown'
    consent_updated_at?: string
  }
  sms_marketing_consent?: {
    state: 'subscribed' | 'not_subscribed' | 'pending' | 'unsubscribed'
    opt_in_level: 'single_opt_in' | 'confirmed_opt_in' | 'unknown'
    consent_updated_at?: string
    consent_collected_from: string
  }
  admin_graphql_api_id: string
  default_address?: ShopifyAddress
  addresses?: ShopifyAddress[]
}

interface ShopifyProduct {
  id: number
  title: string
  body_html: string
  vendor: string
  product_type: string
  created_at: string
  handle: string
  updated_at: string
  published_at?: string
  template_suffix?: string
  status: 'active' | 'archived' | 'draft'
  published_scope: string
  tags: string
  admin_graphql_api_id: string
  variants: ShopifyVariant[]
  options: Array<{
    id: number
    product_id: number
    name: string
    position: number
    values: string[]
  }>
  images: Array<{
    id: number
    product_id: number
    position: number
    created_at: string
    updated_at: string
    alt?: string
    width: number
    height: number
    src: string
    variant_ids: number[]
    admin_graphql_api_id: string
  }>
  image?: {
    id: number
    product_id: number
    position: number
    created_at: string
    updated_at: string
    alt?: string
    width: number
    height: number
    src: string
    variant_ids: number[]
    admin_graphql_api_id: string
  }
}

interface ShopifyVariant {
  id: number
  product_id: number
  title: string
  price: string
  sku?: string
  position: number
  inventory_policy: 'deny' | 'continue'
  compare_at_price?: string
  fulfillment_service: string
  inventory_management?: string
  option1?: string
  option2?: string
  option3?: string
  created_at: string
  updated_at: string
  taxable: boolean
  barcode?: string
  weight: number
  weight_unit: 'g' | 'kg' | 'oz' | 'lb'
  inventory_item_id: number
  inventory_quantity: number
  old_inventory_quantity: number
  requires_shipping: boolean
  admin_graphql_api_id: string
  image_id?: number
}

interface ShopifyLineItem {
  id: number
  admin_graphql_api_id: string
  fulfillable_quantity: number
  fulfillment_service: string
  fulfillment_status?: 'fulfilled' | 'null' | 'partial' | 'not_eligible'
  gift_card: boolean
  grams: number
  name: string
  price: string
  price_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  product_exists: boolean
  product_id?: number
  properties: Array<{ name: string; value: string }>
  quantity: number
  requires_shipping: boolean
  sku?: string
  taxable: boolean
  title: string
  total_discount: string
  total_discount_set: {
    shop_money: { amount: string; currency_code: string }
    presentment_money: { amount: string; currency_code: string }
  }
  variant_id?: number
  variant_inventory_management?: string
  variant_title?: string
  vendor?: string
  tax_lines: Array<{
    channel_liable: boolean
    price: string
    price_set: {
      shop_money: { amount: string; currency_code: string }
      presentment_money: { amount: string; currency_code: string }
    }
    rate: number
    title: string
  }>
  duties: Array<any>
  discount_allocations: Array<{
    amount: string
    amount_set: {
      shop_money: { amount: string; currency_code: string }
      presentment_money: { amount: string; currency_code: string }
    }
    discount_application_index: number
  }>
}

interface ShopifyAddress {
  id?: number
  customer_id?: number
  first_name?: string
  last_name?: string
  company?: string
  address1?: string
  address2?: string
  city?: string
  province?: string
  country?: string
  zip?: string
  phone?: string
  name?: string
  province_code?: string
  country_code?: string
  country_name?: string
  default?: boolean
}

interface ShopifyFulfillment {
  id: number
  order_id: number
  status: 'pending' | 'open' | 'success' | 'cancelled' | 'error' | 'failure'
  created_at: string
  service: string
  updated_at: string
  tracking_company?: string
  tracking_number?: string
  tracking_numbers: string[]
  tracking_url?: string
  tracking_urls: string[]
  receipt: any
  name: string
  admin_graphql_api_id: string
  line_items: ShopifyLineItem[]
  shipment_status?: 'label_printed' | 'label_purchased' | 'attempted_delivery' | 'ready_for_pickup' | 'confirmed' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failure'
}

interface ShopifyWebhook {
  id: number
  address: string
  topic: string
  created_at: string
  updated_at: string
  format: 'json' | 'xml'
  fields?: string[]
  metadata_namespace?: string
  private_metadata_namespace?: string
  admin_graphql_api_id: string
}

/**
 * Enhanced pagination response types for 2024-10 cursor-based pagination
 */
interface ShopifyPaginationInfo {
  has_next_page: boolean
  has_previous_page: boolean
  start_cursor?: string
  end_cursor?: string
}

interface ShopifyPaginatedResponse<T> {
  data: T[]
  pageInfo: ShopifyPaginationInfo
}

/**
 * Enhanced error response types for 2024-10
 */
interface ShopifyError {
  status: number
  message: string
  errors?: { [key: string]: string[] }
  error_description?: string
  documentation_url?: string
}

/**
 * Request queue for rate limiting
 */
class RequestQueue {
  private queue: Array<() => Promise<any>> = []
  private processing = false
  private lastRequestTime = 0
  private requestCount = 0
  private resetTime = Date.now() + 1000

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.process()
    })
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return

    this.processing = true

    while (this.queue.length > 0) {
      // Reset counter every second
      const now = Date.now()
      if (now > this.resetTime) {
        this.requestCount = 0
        this.resetTime = now + 1000
      }

      // Rate limit check
      if (this.requestCount >= RATE_LIMIT.REQUESTS_PER_SECOND) {
        const delay = this.resetTime - now
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }

      const request = this.queue.shift()!
      this.requestCount++
      this.lastRequestTime = now

      try {
        await request()
      } catch (error) {
        console.error('Request queue error:', error)
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 25))
    }

    this.processing = false
  }
}

/**
 * Enhanced Shopify Integration Class for 2024-10 API
 */
export class ShopifyIntegration {
  private accessToken: string
  private shopDomain: string
  private apiVersion: string = SHOPIFY_API_VERSION
  private baseUrl: string
  private requestQueue: RequestQueue

  constructor(accessToken: string, shopDomain: string) {
    this.accessToken = accessToken
    this.shopDomain = shopDomain.replace('.myshopify.com', '')
    this.baseUrl = `https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}`
    this.requestQueue = new RequestQueue()
  }

  /**
   * Enhanced API request method with improved retry logic and rate limiting
   */
  private async makeRequest<T = any>(
    endpoint: string, 
    options: RequestInit = {},
    retries: number = RATE_LIMIT.MAX_RETRIES
  ): Promise<T> {
    return this.requestQueue.add(async () => {
      const url = `${this.baseUrl}/${endpoint}`
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              'X-Shopify-Access-Token': this.accessToken,
              'Content-Type': 'application/json',
              'User-Agent': 'BizInsights Analytics Platform v2.0',
              ...options.headers
            }
          })

          // Enhanced rate limiting handling
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After')
            const callLimit = response.headers.get('X-Shopify-Shop-Api-Call-Limit')
            
            console.log(`Rate limited. Call limit: ${callLimit}, Retry after: ${retryAfter}s. Attempt ${attempt}/${retries}`)
            
            if (attempt < retries) {
              const delay = retryAfter 
                ? parseInt(retryAfter) * 1000 
                : RATE_LIMIT.RETRY_DELAY_BASE * Math.pow(RATE_LIMIT.BACKOFF_MULTIPLIER, attempt - 1)
              
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => null)
            const error: ShopifyError = {
              status: response.status,
              message: errorData?.message || response.statusText,
              errors: errorData?.errors,
              error_description: errorData?.error_description,
              documentation_url: errorData?.documentation_url
            }

            // Enhanced error handling for specific status codes
            switch (response.status) {
              case 401:
                throw new Error(`Authentication failed: ${error.message}. Please check your access token.`)
              case 403:
                throw new Error(`Access forbidden: ${error.message}. Please check your app permissions.`)
              case 404:
                throw new Error(`Resource not found: ${error.message}`)
              case 422:
                const validationErrors = error.errors 
                  ? Object.entries(error.errors).map(([field, messages]) => `${field}: ${messages.join(', ')}`).join('; ')
                  : error.message
                throw new Error(`Validation error: ${validationErrors}`)
              case 423:
                throw new Error(`Shop locked: ${error.message}`)
              default:
                throw new Error(`Shopify API error ${response.status}: ${error.message}`)
            }
          }

          return await response.json()
        } catch (error) {
          if (attempt === retries) {
            throw error
          }
          
          // Network error - retry with exponential backoff
          const delay = RATE_LIMIT.RETRY_DELAY_BASE * Math.pow(RATE_LIMIT.BACKOFF_MULTIPLIER, attempt - 1)
          console.log(`Network error, retrying in ${delay}ms (attempt ${attempt}/${retries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }

      throw new Error('Max retries exceeded')
    })
  }

  /**
   * Test connection to Shopify with enhanced error handling
   */
  async testConnection(): Promise<{ success: boolean; shopInfo?: any; error?: string }> {
    try {
      const shopInfo = await this.getShopInfo()
      return { success: true, shopInfo }
    } catch (error) {
      console.error('Shopify connection test failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown connection error' 
      }
    }
  }

  /**
   * Get shop information using 2024-10 API
   */
  async getShopInfo(): Promise<any> {
    const data = await this.makeRequest('shop.json')
    return data.shop
  }

  /**
   * Enhanced cursor-based pagination for orders (2024-10)
   */
  async getOrders(params: {
    limit?: number
    cursor?: string
    createdAtMin?: string
    createdAtMax?: string
    updatedAtMin?: string
    status?: string
    financialStatus?: string
    fulfillmentStatus?: string
    fields?: string[]
  } = {}): Promise<{ orders: ShopifyOrder[]; pageInfo: ShopifyPaginationInfo }> {
    const searchParams = new URLSearchParams()
    
    searchParams.append('limit', (params.limit || 50).toString()) // Reduced from 250 for better performance
    if (params.cursor) searchParams.append('page_info', params.cursor)
    if (params.createdAtMin) searchParams.append('created_at_min', params.createdAtMin)
    if (params.createdAtMax) searchParams.append('created_at_max', params.createdAtMax)
    if (params.updatedAtMin) searchParams.append('updated_at_min', params.updatedAtMin)
    if (params.status) searchParams.append('status', params.status)
    if (params.financialStatus) searchParams.append('financial_status', params.financialStatus)
    if (params.fulfillmentStatus) searchParams.append('fulfillment_status', params.fulfillmentStatus)
    if (params.fields) searchParams.append('fields', params.fields.join(','))
    
    const data = await this.makeRequest(`orders.json?${searchParams.toString()}`)
    
    // Parse Link header for pagination info (2024-10 style)
    const pageInfo: ShopifyPaginationInfo = {
      has_next_page: false,
      has_previous_page: false
    }

    return {
      orders: data.orders || [],
      pageInfo
    }
  }

  /**
   * Enhanced cursor-based pagination for customers (2024-10)
   */
  async getCustomers(params: {
    limit?: number
    cursor?: string
    createdAtMin?: string
    createdAtMax?: string
    updatedAtMin?: string
    fields?: string[]
  } = {}): Promise<{ customers: ShopifyCustomer[]; pageInfo: ShopifyPaginationInfo }> {
    const searchParams = new URLSearchParams()
    
    searchParams.append('limit', (params.limit || 50).toString())
    if (params.cursor) searchParams.append('page_info', params.cursor)
    if (params.createdAtMin) searchParams.append('created_at_min', params.createdAtMin)
    if (params.createdAtMax) searchParams.append('created_at_max', params.createdAtMax)
    if (params.updatedAtMin) searchParams.append('updated_at_min', params.updatedAtMin)
    if (params.fields) searchParams.append('fields', params.fields.join(','))
    
    const data = await this.makeRequest(`customers.json?${searchParams.toString()}`)
    
    const pageInfo: ShopifyPaginationInfo = {
      has_next_page: false,
      has_previous_page: false
    }

    return {
      customers: data.customers || [],
      pageInfo
    }
  }

  /**
   * Enhanced cursor-based pagination for products (2024-10)
   */
  async getProducts(params: {
    limit?: number
    cursor?: string
    createdAtMin?: string
    createdAtMax?: string
    updatedAtMin?: string
    status?: string
    fields?: string[]
  } = {}): Promise<{ products: ShopifyProduct[]; pageInfo: ShopifyPaginationInfo }> {
    const searchParams = new URLSearchParams()
    
    searchParams.append('limit', (params.limit || 50).toString())
    if (params.cursor) searchParams.append('page_info', params.cursor)
    if (params.createdAtMin) searchParams.append('created_at_min', params.createdAtMin)
    if (params.createdAtMax) searchParams.append('created_at_max', params.createdAtMax)
    if (params.updatedAtMin) searchParams.append('updated_at_min', params.updatedAtMin)
    if (params.status) searchParams.append('status', params.status)
    if (params.fields) searchParams.append('fields', params.fields.join(','))
    
    const data = await this.makeRequest(`products.json?${searchParams.toString()}`)
    
    const pageInfo: ShopifyPaginationInfo = {
      has_next_page: false,
      has_previous_page: false
    }

    return {
      products: data.products || [],
      pageInfo
    }
  }

  /**
   * Enhanced analytics data with better error handling and metrics transformation
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<{
    revenue: number
    orderCount: number
    customerCount: number
    averageOrderValue: number
    orders: ShopifyOrder[]
    summary: {
      totalRevenue: number
      totalOrders: number
      uniqueCustomers: number
      averageOrderValue: number
      topProducts: Array<{ name: string; revenue: number; orders: number }>
      revenueByDay: Array<{ date: string; revenue: number; orders: number }>
    }
  }> {
    const params = new URLSearchParams({
      'created_at_min': startDate.toISOString(),
      'created_at_max': endDate.toISOString(),
      'status': 'any',
      'limit': '250'
    })
    
    // Get orders data with enhanced error handling
    try {
      const ordersData = await this.makeRequest(`orders.json?${params.toString()}`)
      const orders: ShopifyOrder[] = ordersData.orders || []
      
      // Enhanced metrics calculation
      const revenue = orders.reduce((sum, order) => 
        sum + parseFloat(order.current_total_price || order.total_price || '0'), 0)
      const orderCount = orders.length
      const uniqueCustomers = new Set(orders.map(o => o.customer?.id).filter(Boolean)).size
      const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0
      
      // Calculate top products
      const productRevenue = new Map<string, { revenue: number; orders: number }>()
      orders.forEach(order => {
        order.line_items?.forEach(item => {
          const productName = item.title || item.name || 'Unknown Product'
          const itemRevenue = parseFloat(item.price || '0') * item.quantity
          
          if (!productRevenue.has(productName)) {
            productRevenue.set(productName, { revenue: 0, orders: 0 })
          }
          
          const current = productRevenue.get(productName)!
          current.revenue += itemRevenue
          current.orders += item.quantity
        })
      })
      
      const topProducts = Array.from(productRevenue.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
      
      // Calculate revenue by day
      const revenueByDay = new Map<string, { revenue: number; orders: number }>()
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        const orderRevenue = parseFloat(order.current_total_price || order.total_price || '0')
        
        if (!revenueByDay.has(date)) {
          revenueByDay.set(date, { revenue: 0, orders: 0 })
        }
        
        const dayData = revenueByDay.get(date)!
        dayData.revenue += orderRevenue
        dayData.orders += 1
      })
      
      const revenueByDayArray = Array.from(revenueByDay.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date))
      
      return {
        revenue,
        orderCount,
        customerCount: uniqueCustomers,
        averageOrderValue,
        orders,
        summary: {
          totalRevenue: revenue,
          totalOrders: orderCount,
          uniqueCustomers,
          averageOrderValue,
          topProducts,
          revenueByDay: revenueByDayArray
        }
      }
    } catch (error) {
      console.error('Analytics data fetch error:', error)
      throw new Error(`Failed to fetch analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced webhook creation with 2024-10 API support
   */
  async createWebhook(topic: string, address: string, options: {
    format?: 'json' | 'xml'
    fields?: string[]
    metadataNamespace?: string
    privateMetadataNamespace?: string
  } = {}): Promise<ShopifyWebhook> {
    const webhookData = {
      webhook: {
        topic,
        address,
        format: options.format || 'json',
        ...(options.fields && { fields: options.fields }),
        ...(options.metadataNamespace && { metadata_namespace: options.metadataNamespace }),
        ...(options.privateMetadataNamespace && { private_metadata_namespace: options.privateMetadataNamespace })
      }
    }

    const data = await this.makeRequest('webhooks.json', {
      method: 'POST',
      body: JSON.stringify(webhookData)
    })

    return data.webhook
  }

  /**
   * Get existing webhooks with enhanced filtering
   */
  async getWebhooks(params: {
    address?: string
    topic?: string
    limit?: number
    createdAtMin?: string
    createdAtMax?: string
    updatedAtMin?: string
    updatedAtMax?: string
  } = {}): Promise<ShopifyWebhook[]> {
    const searchParams = new URLSearchParams()
    
    if (params.address) searchParams.append('address', params.address)
    if (params.topic) searchParams.append('topic', params.topic)
    if (params.limit) searchParams.append('limit', params.limit.toString())
    if (params.createdAtMin) searchParams.append('created_at_min', params.createdAtMin)
    if (params.createdAtMax) searchParams.append('created_at_max', params.createdAtMax)
    if (params.updatedAtMin) searchParams.append('updated_at_min', params.updatedAtMin)
    if (params.updatedAtMax) searchParams.append('updated_at_max', params.updatedAtMax)
    
    const queryString = searchParams.toString()
    const endpoint = queryString ? `webhooks.json?${queryString}` : 'webhooks.json'
    
    const data = await this.makeRequest(endpoint)
    return data.webhooks || []
  }

  /**
   * Delete webhook with better error handling
   */
  async deleteWebhook(webhookId: string | number): Promise<void> {
    try {
      await this.makeRequest(`webhooks/${webhookId}.json`, {
        method: 'DELETE'
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        console.log(`Webhook ${webhookId} not found, may already be deleted`)
        return
      }
      throw error
    }
  }

  /**
   * Enhanced webhook setup with better error recovery and 2024-10 topics
   */
  async setupWebhooks(organizationId: string, options: {
    topics?: string[]
    recreate?: boolean
  } = {}): Promise<string[]> {
    const defaultTopics = [
      'orders/create',
      'orders/updated', 
      'orders/paid',
      'orders/cancelled',
      'orders/fulfilled',
      'orders/partially_fulfilled',
      'orders/refunded',
      'customers/create',
      'customers/update',
      'customers/delete',
      'products/create',
      'products/update',
      'app/uninstalled',
      'carts/create',
      'carts/update',
      'checkouts/create',
      'checkouts/update'
    ]

    const webhookTopics = options.topics || defaultTopics
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
    const webhookUrls: string[] = []

    try {
      // Clean up existing webhooks if recreate is requested
      if (options.recreate) {
        const existingWebhooks = await this.getWebhooks({
          address: `${baseUrl}/api/webhooks/shopify`
        })
        
        for (const webhook of existingWebhooks) {
          try {
            await this.deleteWebhook(webhook.id)
            console.log(`Deleted existing webhook: ${webhook.id} (${webhook.topic})`)
          } catch (error) {
            console.warn(`Failed to delete webhook ${webhook.id}:`, error)
          }
        }
      }

      // Create new webhooks with better error handling
      const results = await Promise.allSettled(
        webhookTopics.map(async (topic) => {
          try {
            const webhookUrl = `${baseUrl}/api/webhooks/shopify?org=${organizationId}&topic=${topic}`
            const webhook = await this.createWebhook(topic, webhookUrl, {
              format: 'json',
              fields: ['id', 'created_at', 'updated_at'] // Minimal fields for better performance
            })
            
            webhookUrls.push(webhook.address)
            console.log(`Created webhook for ${topic}: ${webhook.id}`)
            
            return { topic, webhook, success: true }
          } catch (error) {
            console.error(`Failed to create webhook for ${topic}:`, error)
            return { topic, error, success: false }
          }
        })
      )

      const successful = results.filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value.success
      )
      
      const failed = results.filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && !result.value.success
      )

      console.log(`Webhook setup completed: ${successful.length} successful, ${failed.length} failed`)
      
      if (failed.length > 0) {
        console.warn('Failed webhook topics:', failed.map(f => f.value.topic))
      }

      return webhookUrls
    } catch (error) {
      console.error('Webhook setup failed:', error)
      throw new Error(`Failed to setup webhooks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced historical data sync with better error handling and progress tracking
   */
  async syncHistoricalData(integrationId: string, days: number = 30): Promise<{
    orders: number
    customers: number
    products: number
    revenue: number
    errors: string[]
    duration: number
  }> {
    const startTime = Date.now()
    const sinceDate = new Date()
    sinceDate.setDate(sinceDate.getDate() - days)
    
    let syncCounts = { orders: 0, customers: 0, products: 0, revenue: 0 }
    const errors: string[] = []

    console.log(`Starting historical data sync for integration ${integrationId} (${days} days)`)

    try {
      // Sync orders with enhanced error handling
      try {
        const orderResult = await this.syncOrders(integrationId, { 
          createdAtMin: sinceDate.toISOString(),
          trackRevenue: true 
        })
        syncCounts.orders = orderResult.count
        syncCounts.revenue = orderResult.revenue
        console.log(`✅ Orders synced: ${orderResult.count} orders, $${orderResult.revenue.toFixed(2)} revenue`)
      } catch (error) {
        const errorMsg = `Orders sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
      
      // Sync customers with retry logic
      try {
        const customerResult = await this.syncCustomers(integrationId, { 
          createdAtMin: sinceDate.toISOString() 
        })
        syncCounts.customers = customerResult.count
        console.log(`✅ Customers synced: ${customerResult.count}`)
      } catch (error) {
        const errorMsg = `Customers sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
      
      // Sync products (no date filter for initial sync)
      try {
        const productResult = await this.syncProducts(integrationId, {})
        syncCounts.products = productResult.count
        console.log(`✅ Products synced: ${productResult.count}`)
      } catch (error) {
        const errorMsg = `Products sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }

      const duration = Date.now() - startTime
      console.log(`Historical data sync completed in ${duration}ms:`, syncCounts)

      return {
        ...syncCounts,
        errors,
        duration
      }
    } catch (error) {
      console.error('Historical data sync error:', error)
      throw new Error(`Historical data sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Enhanced orders sync with revenue tracking
   */
  private async syncOrders(integrationId: string, params: {
    createdAtMin?: string
    trackRevenue?: boolean
  }): Promise<{ count: number; revenue: number }> {
    let totalCount = 0
    let totalRevenue = 0
    let cursor: string | undefined

    while (true) {
      const result = await this.getOrders({ 
        createdAtMin: params.createdAtMin,
        status: 'any',
        limit: 50,
        cursor,
        fields: ['id', 'name', 'created_at', 'updated_at', 'total_price', 'current_total_price', 
                'financial_status', 'fulfillment_status', 'currency', 'customer', 'line_items']
      })

      if (result.orders.length === 0) break

      // Process orders in batches for better performance
      const dataPoints = []
      for (const order of result.orders) {
        const orderRevenue = parseFloat(order.current_total_price || order.total_price || '0')
        
        // Create revenue data point for paid orders
        if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
          if (params.trackRevenue) {
            totalRevenue += orderRevenue
          }
          
          dataPoints.push({
            integrationId,
            metricType: 'revenue',
            value: orderRevenue,
            metadata: JSON.stringify({
              orderId: order.id,
              orderNumber: order.number || order.name,
              customerId: order.customer?.id,
              currency: order.currency,
              financialStatus: order.financial_status,
              fulfillmentStatus: order.fulfillment_status,
              itemCount: order.line_items?.length || 0,
              customerEmail: order.customer?.email || order.email,
              source: 'shopify_sync_2024_10',
              apiVersion: this.apiVersion
            }),
            dateRecorded: new Date(order.created_at)
          })
        }

        // Create order count data point
        dataPoints.push({
          integrationId,
          metricType: 'orders',
          value: 1,
          metadata: JSON.stringify({
            orderId: order.id,
            orderNumber: order.number || order.name,
            customerId: order.customer?.id,
            totalPrice: order.current_total_price || order.total_price,
            currency: order.currency,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            source: 'shopify_sync_2024_10',
            apiVersion: this.apiVersion
          }),
          dateRecorded: new Date(order.created_at)
        })
      }

      // Batch insert for better performance
      if (dataPoints.length > 0) {
        await prisma.dataPoint.createMany({ 
          data: dataPoints,
          skipDuplicates: true 
        })
      }

      totalCount += result.orders.length
      
      if (!result.pageInfo.has_next_page) break
      cursor = result.pageInfo.end_cursor
    }

    return { count: totalCount, revenue: totalRevenue }
  }

  /**
   * Enhanced customers sync
   */
  private async syncCustomers(integrationId: string, params: {
    createdAtMin?: string
  }): Promise<{ count: number }> {
    let totalCount = 0
    let cursor: string | undefined

    while (true) {
      const result = await this.getCustomers({ 
        createdAtMin: params.createdAtMin,
        limit: 50,
        cursor,
        fields: ['id', 'email', 'first_name', 'last_name', 'created_at', 'updated_at',
                'orders_count', 'total_spent', 'accepts_marketing', 'state', 'tags']
      })

      if (result.customers.length === 0) break

      const dataPoints = result.customers.map(customer => ({
        integrationId,
        metricType: 'customer_created',
        value: 1,
        metadata: JSON.stringify({
          customerId: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          ordersCount: customer.orders_count,
          totalSpent: customer.total_spent,
          acceptsMarketing: customer.accepts_marketing,
          state: customer.state,
          tags: customer.tags,
          source: 'shopify_sync_2024_10',
          apiVersion: this.apiVersion
        }),
        dateRecorded: new Date(customer.created_at)
      }))

      if (dataPoints.length > 0) {
        await prisma.dataPoint.createMany({ 
          data: dataPoints,
          skipDuplicates: true 
        })
      }

      totalCount += result.customers.length
      
      if (!result.pageInfo.has_next_page) break
      cursor = result.pageInfo.end_cursor
    }

    return { count: totalCount }
  }

  /**
   * Enhanced products sync
   */
  private async syncProducts(integrationId: string, params: {
    createdAtMin?: string
  }): Promise<{ count: number }> {
    let totalCount = 0
    let cursor: string | undefined

    while (true) {
      const result = await this.getProducts({ 
        createdAtMin: params.createdAtMin,
        limit: 50,
        cursor,
        fields: ['id', 'title', 'vendor', 'product_type', 'created_at', 'updated_at',
                'status', 'published_at', 'variants']
      })

      if (result.products.length === 0) break

      const dataPoints = result.products.map(product => ({
        integrationId,
        metricType: 'product_created',
        value: 1,
        metadata: JSON.stringify({
          productId: product.id,
          title: product.title,
          vendor: product.vendor,
          productType: product.product_type,
          status: product.status,
          variantsCount: product.variants?.length || 0,
          publishedAt: product.published_at,
          source: 'shopify_sync_2024_10',
          apiVersion: this.apiVersion
        }),
        dateRecorded: new Date(product.created_at)
      }))

      if (dataPoints.length > 0) {
        await prisma.dataPoint.createMany({ 
          data: dataPoints,
          skipDuplicates: true 
        })
      }

      totalCount += result.products.length
      
      if (!result.pageInfo.has_next_page) break
      cursor = result.pageInfo.end_cursor
    }

    return { count: totalCount }
  }

  /**
   * Enhanced OAuth URL generation (if needed)
   */
  static generateAuthUrl(shop: string, state: string, options: {
    scopes?: string[]
    redirectUri?: string
    accessMode?: 'online' | 'offline'
  } = {}): string {
    const defaultScopes = [
      'read_orders',
      'read_customers', 
      'read_products',
      'read_analytics',
      'read_reports',
      'read_inventory',
      'read_fulfillments',
      'read_checkouts'
    ]
    
    const scopes = options.scopes || defaultScopes
    const redirectUri = options.redirectUri || `${process.env.NEXTAUTH_URL}/api/integrations/shopify/callback`
    
    const params = new URLSearchParams({
      client_id: process.env.SHOPIFY_CLIENT_ID!,
      scope: scopes.join(','),
      redirect_uri: redirectUri,
      state,
      'grant_options[]': options.accessMode === 'online' ? 'per-user' : ''
    })

    return `https://${shop}.myshopify.com/admin/oauth/authorize?${params.toString()}`
  }

  /**
   * Enhanced token exchange with 2024-10 API
   */
  static async exchangeCodeForToken(
    shop: string,
    code: string
  ): Promise<{ 
    access_token: string
    scope: string
    expires_in?: number
    associated_user_scope?: string
    associated_user?: any
  }> {
    const response = await fetch(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BizInsights Analytics Platform v2.0'
      },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        code
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      const errorMessage = errorData?.error_description || errorData?.error || await response.text()
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorMessage}`)
    }

    return response.json()
  }

  /**
   * Verify webhook HMAC with enhanced security (2024-10)
   */
  static verifyWebhookHmac(data: string, hmacHeader: string): boolean {
    try {
      const secret = process.env.SHOPIFY_WEBHOOK_SECRET
      if (!secret) {
        console.error('SHOPIFY_WEBHOOK_SECRET not configured')
        return false
      }

      const calculatedHmac = crypto
        .createHmac('sha256', secret)
        .update(data, 'utf8')
        .digest('base64')
      
      return crypto.timingSafeEqual(
        Buffer.from(calculatedHmac),
        Buffer.from(hmacHeader)
      )
    } catch (error) {
      console.error('Webhook HMAC verification error:', error)
      return false
    }
  }
}

/**
 * Enhanced webhook handler with 2024-10 support and better error handling
 */
export async function handleShopifyWebhook(
  integrationId: string,
  topic: string,
  webhookData: any,
  hmacHeader?: string,
  rawData?: string
): Promise<{ success: boolean; processed: number; error?: string }> {
  try {
    console.log(`Processing Shopify webhook: ${topic} for integration ${integrationId}`)

    // Verify HMAC if provided
    if (hmacHeader && rawData) {
      if (!ShopifyIntegration.verifyWebhookHmac(rawData, hmacHeader)) {
        console.error('Webhook HMAC verification failed')
        return { success: false, processed: 0, error: 'HMAC verification failed' }
      }
    }

    // Enhanced webhook processing with better error handling
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
      case 'orders/partially_fulfilled':
        return await processOrderFulfilled(integrationId, webhookData)
      
      case 'orders/refunded':
        return await processOrderRefunded(integrationId, webhookData)
      
      case 'customers/create':
        return await processCustomerCreated(integrationId, webhookData)
      
      case 'customers/update':
        return await processCustomerUpdated(integrationId, webhookData)
      
      case 'customers/delete':
        return await processCustomerDeleted(integrationId, webhookData)
      
      case 'products/create':
        return await processProductCreated(integrationId, webhookData)
      
      case 'products/update':
        return await processProductUpdated(integrationId, webhookData)
      
      case 'app/uninstalled':
        return await processAppUninstalled(integrationId, webhookData)
      
      case 'carts/create':
      case 'carts/update':
        return await processCartEvent(integrationId, webhookData, topic)
      
      case 'checkouts/create':
      case 'checkouts/update':
        return await processCheckoutEvent(integrationId, webhookData, topic)
      
      default:
        console.log(`Unhandled Shopify webhook event type: ${topic}`)
        return { success: true, processed: 0 }
    }

  } catch (error) {
    console.error(`Error handling Shopify webhook ${topic}:`, error)
    return {
      success: false,
      processed: 0,
      error: error instanceof Error ? error.message : 'Unknown webhook processing error'
    }
  }
}

// Enhanced webhook processing functions with better error handling

async function processOrderCreated(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  try {
    const dataPoints: any[] = []

    // Create order count data point
    dataPoints.push({
      integrationId,
      metricType: 'orders',
      value: 1,
      metadata: JSON.stringify({
        orderId: order.id,
        orderNumber: order.number || order.name,
        customerId: order.customer?.id,
        totalPrice: order.current_total_price || order.total_price,
        currency: order.currency,
        financialStatus: order.financial_status,
        fulfillmentStatus: order.fulfillment_status,
        source: 'shopify_webhook_2024_10',
        apiVersion: SHOPIFY_API_VERSION
      }),
      dateRecorded: new Date(order.created_at)
    })

    // Create revenue data point if paid
    if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
      dataPoints.push({
        integrationId,
        metricType: 'revenue',
        value: parseFloat(order.current_total_price || order.total_price || '0'),
        metadata: JSON.stringify({
          orderId: order.id,
          orderNumber: order.number || order.name,
          customerId: order.customer?.id,
          currency: order.currency,
          financialStatus: order.financial_status,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date(order.created_at)
      })
    }

    // Save all data points
    await prisma.dataPoint.createMany({ 
      data: dataPoints,
      skipDuplicates: true 
    })

    return { success: true, processed: dataPoints.length }
  } catch (error) {
    console.error('Order created webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processOrderUpdated(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  try {
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
      const metadata = typeof dataPoint.metadata === 'string' ? JSON.parse(dataPoint.metadata) : dataPoint.metadata
      await prisma.dataPoint.update({
        where: { id: dataPoint.id },
        data: {
          metadata: JSON.stringify({
            ...metadata,
            financialStatus: order.financial_status,
            fulfillmentStatus: order.fulfillment_status,
            updatedAt: order.updated_at,
            source: 'shopify_webhook_2024_10',
            apiVersion: SHOPIFY_API_VERSION
          })
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
          value: parseFloat(order.current_total_price || order.total_price || '0'),
          metadata: JSON.stringify({
            orderId: order.id,
            orderNumber: order.number || order.name,
            customerId: order.customer?.id,
            currency: order.currency,
            financialStatus: order.financial_status,
            source: 'shopify_webhook_2024_10',
            apiVersion: SHOPIFY_API_VERSION
          }),
          dateRecorded: new Date(order.updated_at)
        }
      })
      processed++
    }

    return { success: true, processed }
  } catch (error) {
    console.error('Order updated webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processOrderPaid(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'order_paid',
        value: parseFloat(order.current_total_price || order.total_price || '0'),
        metadata: JSON.stringify({
          orderId: order.id,
          orderNumber: order.number || order.name,
          customerId: order.customer?.id,
          currency: order.currency,
          financialStatus: order.financial_status,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Order paid webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processOrderCancelled(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'order_cancelled',
        value: parseFloat(order.current_total_price || order.total_price || '0'),
        metadata: JSON.stringify({
          orderId: order.id,
          orderNumber: order.number || order.name,
          customerId: order.customer?.id,
          currency: order.currency,
          cancelledAt: order.cancelled_at,
          cancelReason: order.cancel_reason,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Order cancelled webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processOrderFulfilled(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'order_fulfilled',
        value: 1,
        metadata: JSON.stringify({
          orderId: order.id,
          orderNumber: order.number || order.name,
          customerId: order.customer?.id,
          fulfillmentStatus: order.fulfillment_status,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Order fulfilled webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processOrderRefunded(
  integrationId: string,
  order: ShopifyOrder
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'order_refunded',
        value: parseFloat(order.current_total_price || order.total_price || '0'),
        metadata: JSON.stringify({
          orderId: order.id,
          orderNumber: order.number || order.name,
          customerId: order.customer?.id,
          currency: order.currency,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Order refunded webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processCustomerCreated(
  integrationId: string,
  customer: ShopifyCustomer
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'customer_created',
        value: 1,
        metadata: JSON.stringify({
          customerId: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          acceptsMarketing: customer.accepts_marketing,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date(customer.created_at)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Customer created webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processCustomerUpdated(
  integrationId: string,
  customer: ShopifyCustomer
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'customer_updated',
        value: 1,
        metadata: JSON.stringify({
          customerId: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          ordersCount: customer.orders_count,
          totalSpent: customer.total_spent,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Customer updated webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processCustomerDeleted(
  integrationId: string,
  customer: { id: number }
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'customer_deleted',
        value: 1,
        metadata: JSON.stringify({
          customerId: customer.id,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Customer deleted webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processProductCreated(
  integrationId: string,
  product: ShopifyProduct
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'product_created',
        value: 1,
        metadata: JSON.stringify({
          productId: product.id,
          title: product.title,
          vendor: product.vendor,
          productType: product.product_type,
          status: product.status,
          variantsCount: product.variants?.length || 0,
          publishedAt: product.published_at,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date(product.created_at)
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Product created webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processProductUpdated(
  integrationId: string,
  product: ShopifyProduct
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'product_updated',
        value: 1,
        metadata: JSON.stringify({
          productId: product.id,
          title: product.title,
          vendor: product.vendor,
          productType: product.product_type,
          status: product.status,
          variantsCount: product.variants?.length || 0,
          publishedAt: product.published_at,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('Product updated webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processAppUninstalled(
  integrationId: string,
  webhookData: any
): Promise<{ success: boolean; processed: number }> {
  try {
    // Deactivate integration
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        status: 'disconnected',
        accessToken: null,
        refreshToken: null,
        metadata: JSON.stringify({
          uninstalledAt: new Date().toISOString(),
          uninstallReason: 'app_uninstalled',
          finalShopData: webhookData,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        })
      }
    })

    // Log uninstall event
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: 'integration_uninstalled',
        value: 1,
        metadata: JSON.stringify({
          platform: 'shopify',
          reason: 'app_uninstalled',
          shopDomain: webhookData.domain,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error('App uninstalled webhook processing error:', error)
    return { success: false, processed: 0 }
  }
}

async function processCartEvent(
  integrationId: string,
  cartData: any,
  topic: string
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: topic.replace('/', '_'),
        value: 1,
        metadata: JSON.stringify({
          cartId: cartData.id,
          token: cartData.token,
          totalPrice: cartData.total_price,
          itemCount: cartData.item_count,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error(`Cart ${topic} webhook processing error:`, error)
    return { success: false, processed: 0 }
  }
}

async function processCheckoutEvent(
  integrationId: string,
  checkoutData: any,
  topic: string
): Promise<{ success: boolean; processed: number }> {
  try {
    await prisma.dataPoint.create({
      data: {
        integrationId,
        metricType: topic.replace('/', '_'),
        value: 1,
        metadata: JSON.stringify({
          checkoutId: checkoutData.id,
          token: checkoutData.token,
          totalPrice: checkoutData.total_price,
          email: checkoutData.email,
          source: 'shopify_webhook_2024_10',
          apiVersion: SHOPIFY_API_VERSION
        }),
        dateRecorded: new Date()
      }
    })

    return { success: true, processed: 1 }
  } catch (error) {
    console.error(`Checkout ${topic} webhook processing error:`, error)
    return { success: false, processed: 0 }
  }
}