// src/lib/integrations/shopify-currency.ts
import { ShopifyCurrencyUtils, convertCurrencyLive } from '@/lib/currency/utils'
import { getCurrency, DEFAULT_CURRENCY } from '@/lib/currency/config'
import { prisma } from '@/lib/prisma'

interface ShopifyOrderCurrency {
  orderId: string
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  baseCurrency: string
  exchangeRate: number
  conversionDate: Date
}

interface ShopifyProductPrice {
  productId: string
  variantId: string
  price: number
  currency: string
  convertedPrice: number
  baseCurrency: string
}

export class ShopifyCurrencyIntegration {
  private accessToken: string
  private shopDomain: string
  private baseCurrency: string
  private apiVersion: string = '2023-10'

  constructor(accessToken: string, shopDomain: string, baseCurrency: string = DEFAULT_CURRENCY) {
    this.accessToken = accessToken
    this.shopDomain = shopDomain.replace('.myshopify.com', '')
    this.baseCurrency = baseCurrency
  }

  /**
   * Get shop's primary currency from Shopify
   */
  async getShopCurrency(): Promise<string> {
    try {
      const response = await fetch(`https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}/shop.json`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to fetch shop data')

      const data = await response.json()
      return data.shop.currency || 'INR'
    } catch (error) {
      console.error('Error fetching shop currency:', error)
      return 'INR'
    }
  }

  /**
   * Get enabled currencies for the shop
   */
  async getEnabledCurrencies(): Promise<string[]> {
    try {
      const response = await fetch(`https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}/currencies.json`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // Fallback to shop currency if currencies endpoint not available
        const shopCurrency = await this.getShopCurrency()
        return [shopCurrency]
      }

      const data = await response.json()
      return data.currencies?.map((c: any) => c.currency) || ['INR']
    } catch (error) {
      console.error('Error fetching enabled currencies:', error)
      return ['INR']
    }
  }

  /**
   * Process order with currency conversion
   */
  async processOrderWithCurrency(order: any): Promise<ShopifyOrderCurrency> {
    const originalAmount = parseFloat(order.total_price || '0')
    const originalCurrency = order.currency || 'INR'
    
    let convertedAmount = originalAmount
    let exchangeRate = 1

    // Convert to base currency if different
    if (originalCurrency !== this.baseCurrency) {
      try {
        const conversion = await convertCurrencyLive(originalAmount, originalCurrency, this.baseCurrency)
        convertedAmount = conversion.convertedAmount
        exchangeRate = conversion.rate
      } catch (error) {
        console.warn(`Currency conversion failed for order ${order.id}:`, error)
        // Use fallback rate from config
        const rate = await ShopifyCurrencyUtils.getShopifyConversionRate(originalCurrency, this.baseCurrency)
        convertedAmount = originalAmount * rate
        exchangeRate = rate
      }
    }

    return {
      orderId: order.id.toString(),
      originalAmount,
      originalCurrency,
      convertedAmount,
      baseCurrency: this.baseCurrency,
      exchangeRate,
      conversionDate: new Date()
    }
  }

  /**
   * Sync orders with currency conversion and store in database
   */
  async syncOrdersWithCurrency(integrationId: string, sinceDate?: Date): Promise<{ processed: number; errors: string[] }> {
      const errors: string[] = []
      let processed = 0
      let hasMore = true
      let sinceId: string | undefined

      // Define the type for a data point
      type DataPointInput = {
          integrationId: string;
          metricType: string;
          value: number;
          metadata: Record<string, any>;
          dateRecorded: Date;
      };

      while (hasMore) {
          try {
              const params = new URLSearchParams({
                  limit: '50',
                  status: 'any',
                  ...(sinceDate && { created_at_min: sinceDate.toISOString() }),
                  ...(sinceId && { since_id: sinceId })
              })

              const response = await fetch(
                  `https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}/orders.json?${params}`,
                  {
                      headers: {
                          'X-Shopify-Access-Token': this.accessToken,
                          'Content-Type': 'application/json'
                      }
                  }
              )

              if (!response.ok) {
                  throw new Error(`Shopify API error: ${response.status}`)
              }

              const data = await response.json()
              const orders = data.orders || []

              if (orders.length === 0) {
                  hasMore = false
                  break
              }

              // Process each order with currency conversion
              for (const order of orders) {
                  try {
                      const currencyData = await this.processOrderWithCurrency(order)
                      
                      // Create data points with currency conversion
                      const dataPoints: DataPointInput[] = []

                      // Order count data point
                      dataPoints.push({
                          integrationId,
                          metricType: 'orders',
                          value: 1,
                          metadata: {
                              orderId: order.id,
                              orderNumber: order.number,
                              customerId: order.customer?.id,
                              originalAmount: currencyData.originalAmount,
                              originalCurrency: currencyData.originalCurrency,
                              convertedAmount: currencyData.convertedAmount,
                              baseCurrency: currencyData.baseCurrency,
                              exchangeRate: currencyData.exchangeRate,
                              financialStatus: order.financial_status,
                              fulfillmentStatus: order.fulfillment_status,
                              source: 'shopify_currency_sync'
                          },
                          dateRecorded: new Date(order.created_at)
                      })

                      // Revenue data point (in base currency)
                      if (order.financial_status === 'paid' || order.financial_status === 'partially_paid') {
                          dataPoints.push({
                              integrationId,
                              metricType: 'revenue',
                              value: currencyData.convertedAmount,
                              metadata: {
                                  orderId: order.id,
                                  orderNumber: order.number,
                                  customerId: order.customer?.id,
                                  originalAmount: currencyData.originalAmount,
                                  originalCurrency: currencyData.originalCurrency,
                                  convertedAmount: currencyData.convertedAmount,
                                  baseCurrency: currencyData.baseCurrency,
                                  exchangeRate: currencyData.exchangeRate,
                                  financialStatus: order.financial_status,
                                  source: 'shopify_currency_sync'
                              },
                              dateRecorded: new Date(order.created_at)
                          })
                      }

                      // Save data points
                      await prisma.dataPoint.createMany({ data: dataPoints })
                      processed++

                  } catch (orderError) {
                      errors.push(`Order ${order.id}: ${orderError instanceof Error ? orderError.message : 'Unknown error'}`)
                  }
              }

              // Check if there are more orders
              hasMore = orders.length === 50
              if (hasMore) {
                  sinceId = orders[orders.length - 1].id.toString()
              }

          } catch (error) {
              errors.push(`Batch sync error: ${error instanceof Error ? error.message : 'Unknown error'}`)
              hasMore = false
          }
      }

      return { processed, errors }
  }

  /**
   * Get product prices with currency conversion
   */
  async getProductPricesWithCurrency(productIds?: string[]): Promise<ShopifyProductPrice[]> {
    const prices: ShopifyProductPrice[] = []
    
    try {
      const params = new URLSearchParams({
        limit: '250',
        fields: 'id,title,variants'
      })

      if (productIds?.length) {
        params.append('ids', productIds.join(','))
      }

      const response = await fetch(
        `https://${this.shopDomain}.myshopify.com/admin/api/${this.apiVersion}/products.json?${params}`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      )

      if (!response.ok) throw new Error(`Shopify API error: ${response.status}`)

      const data = await response.json()
      const products = data.products || []

      // Get shop currency for price conversion
      const shopCurrency = await this.getShopCurrency()

      for (const product of products) {
        for (const variant of product.variants || []) {
          const price = parseFloat(variant.price || '0')
          let convertedPrice = price

          // Convert to base currency if needed
          if (shopCurrency !== this.baseCurrency) {
            try {
              const conversion = await convertCurrencyLive(price, shopCurrency, this.baseCurrency)
              convertedPrice = conversion.convertedAmount
            } catch (error) {
              console.warn(`Price conversion failed for variant ${variant.id}:`, error)
            }
          }

          prices.push({
            productId: product.id.toString(),
            variantId: variant.id.toString(),
            price,
            currency: shopCurrency,
            convertedPrice,
            baseCurrency: this.baseCurrency
          })
        }
      }

    } catch (error) {
      console.error('Error fetching product prices:', error)
    }

    return prices
  }

  /**
   * Update integration settings with currency preferences
   */
  async updateCurrencySettings(integrationId: string, settings: {
    baseCurrency: string
    autoConvert: boolean
    enabledCurrencies: string[]
  }): Promise<void> {
    try {
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          settings: {
            ...settings,
            currencyUpdatedAt: new Date().toISOString()
          }
        }
      })
    } catch (error) {
      console.error('Error updating currency settings:', error)
      throw error
    }
  }

  /**
   * Get currency analytics for dashboard
   */
  async getCurrencyAnalytics(integrationId: string, dateRange: { start: Date; end: Date }) {
    try {
      const dataPoints = await prisma.dataPoint.findMany({
        where: {
          integrationId,
          metricType: 'revenue',
          dateRecorded: {
            gte: dateRange.start,
            lte: dateRange.end
          }
        },
        orderBy: { dateRecorded: 'desc' }
      })

      // Group by original currency
      const byCurrency: Record<string, { total: number; orders: number; avgRate: number }> = {}
      
      dataPoints.forEach(point => {
        const metadata = point.metadata as any
        const currency = metadata.originalCurrency || this.baseCurrency
        
        if (!byCurrency[currency]) {
          byCurrency[currency] = { total: 0, orders: 0, avgRate: 0 }
        }
        
        byCurrency[currency].total += metadata.originalAmount || point.value
        byCurrency[currency].orders += 1
        byCurrency[currency].avgRate += metadata.exchangeRate || 1
      })

      // Calculate averages
      Object.keys(byCurrency).forEach(currency => {
        byCurrency[currency].avgRate = byCurrency[currency].avgRate / byCurrency[currency].orders
      })

      return {
        totalRevenue: dataPoints.reduce((sum, point) => sum + point.value, 0),
        currencyBreakdown: byCurrency,
        baseCurrency: this.baseCurrency,
        conversionCount: dataPoints.length
      }

    } catch (error) {
      console.error('Error getting currency analytics:', error)
      return {
        totalRevenue: 0,
        currencyBreakdown: {},
        baseCurrency: this.baseCurrency,
        conversionCount: 0
      }
    }
  }
}