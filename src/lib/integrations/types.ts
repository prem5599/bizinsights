// lib/integrations/types.ts

export interface IntegrationConfig {
  platform: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes: string[]
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

export interface ShopifyOrder {
  id: string
  orderNumber: string
  totalPrice: number
  currency: string
  createdAt: Date
  customerId?: string
  customerEmail?: string
  lineItems: ShopifyLineItem[]
  shippingAddress?: Address
  billingAddress?: Address
  financialStatus: string
  fulfillmentStatus?: string
}

export interface ShopifyLineItem {
  productId: string
  variantId: string
  quantity: number
  price: number
  title: string
}

export interface Address {
  firstName?: string
  lastName?: string
  company?: string
  address1: string
  address2?: string
  city: string
  province?: string
  country: string
  zip: string
}

export interface StripePayment {
  id: string
  amount: number
  currency: string
  status: string
  createdAt: Date
  customerId?: string
  description?: string
  metadata?: Record<string, string>
}

export interface GoogleAnalyticsData {
  sessions: number
  users: number
  pageviews: number
  bounceRate: number
  avgSessionDuration: number
  source: string
  medium: string
  date: Date
}

export interface SyncResult {
  success: boolean
  recordsProcessed: number
  errors?: string[]
  lastSyncAt: Date
}

export interface DataPoint {
  integrationId: string
  metricType: 'revenue' | 'orders' | 'sessions' | 'customers' | 'pageviews'
  value: number
  metadata: Record<string, any>
  dateRecorded: Date
}