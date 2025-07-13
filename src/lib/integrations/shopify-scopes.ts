// src/lib/integrations/shopify-scopes.ts

/**
 * Shopify Admin API Access Scopes Configuration
 * Based on Shopify Admin API 2025-07 version
 */

export interface ShopifyScope {
  id: string
  name: string
  description: string
  category: string
  required: boolean
  riskLevel: 'low' | 'medium' | 'high'
  dataAccess: string[]
  dependencies?: string[]
}

export interface ScopeCategory {
  id: string
  name: string
  description: string
  icon: string
  priority: number
}

/**
 * Shopify Access Scope Categories
 */
export const SHOPIFY_SCOPE_CATEGORIES: ScopeCategory[] = [
  {
    id: 'orders',
    name: 'Orders & Sales',
    description: 'Access to order data, revenue, and sales analytics',
    icon: '🛒',
    priority: 1
  },
  {
    id: 'products',
    name: 'Products & Inventory',
    description: 'Product catalog, inventory levels, and variants',
    icon: '📦',
    priority: 2
  },
  {
    id: 'customers',
    name: 'Customer Data',
    description: 'Customer profiles, contact info, and purchase history',
    icon: '👥',
    priority: 3
  },
  {
    id: 'analytics',
    name: 'Analytics & Reports',
    description: 'Store analytics, reports, and business insights',
    icon: '📊',
    priority: 4
  },
  {
    id: 'marketing',
    name: 'Marketing & Campaigns',
    description: 'Marketing campaigns, discounts, and promotions',
    icon: '📢',
    priority: 5
  },
  {
    id: 'fulfillment',
    name: 'Fulfillment & Shipping',
    description: 'Order fulfillment, shipping, and logistics',
    icon: '🚚',
    priority: 6
  },
  {
    id: 'financial',
    name: 'Financial Data',
    description: 'Payment information, taxes, and financial records',
    icon: '💰',
    priority: 7
  },
  {
    id: 'content',
    name: 'Content & Media',
    description: 'Store content, pages, blogs, and media files',
    icon: '📝',
    priority: 8
  },
  {
    id: 'settings',
    name: 'Store Settings',
    description: 'Store configuration and administrative settings',
    icon: '⚙️',
    priority: 9
  },
  {
    id: 'advanced',
    name: 'Advanced Features',
    description: 'Advanced integrations and specialized features',
    icon: '🔧',
    priority: 10
  }
]

/**
 * Complete Shopify Admin API Scopes Configuration
 */
export const SHOPIFY_SCOPES: ShopifyScope[] = [
  // Orders & Sales
  {
    id: 'read_orders',
    name: 'Read Orders',
    description: 'View order information, customer details, and sales data',
    category: 'orders',
    required: true,
    riskLevel: 'medium',
    dataAccess: ['Order details', 'Customer info', 'Payment status', 'Shipping info']
  },
  {
    id: 'read_order_edits',
    name: 'Read Order Edits',
    description: 'View order modification history and changes',
    category: 'orders',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Order edit history', 'Change logs']
  },
  {
    id: 'read_draft_orders',
    name: 'Read Draft Orders',
    description: 'Access draft orders and incomplete transactions',
    category: 'orders',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Draft orders', 'Incomplete checkouts']
  },

  // Products & Inventory
  {
    id: 'read_products',
    name: 'Read Products',
    description: 'Access product catalog, descriptions, and basic info',
    category: 'products',
    required: true,
    riskLevel: 'low',
    dataAccess: ['Product titles', 'Descriptions', 'Images', 'Basic details']
  },
  {
    id: 'read_product_listings',
    name: 'Read Product Listings',
    description: 'View published products and availability',
    category: 'products',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Published products', 'Availability status']
  },
  {
    id: 'read_product_feeds',
    name: 'Read Product Feeds',
    description: 'Access product feed data for external platforms',
    category: 'products',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Product feeds', 'External platform data']
  },
  {
    id: 'read_inventory',
    name: 'Read Inventory',
    description: 'View inventory levels and stock information',
    category: 'products',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Stock levels', 'Inventory tracking']
  },
  {
    id: 'read_inventory_shipments',
    name: 'Read Inventory Shipments',
    description: 'View inventory shipment and receiving data',
    category: 'products',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Shipment records', 'Receiving data']
  },
  {
    id: 'read_inventory_transfers',
    name: 'Read Inventory Transfers',
    description: 'View inventory transfers between locations',
    category: 'products',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Transfer records', 'Location data']
  },

  // Customer Data
  {
    id: 'read_customers',
    name: 'Read Customers',
    description: 'Access customer profiles and contact information',
    category: 'customers',
    required: true,
    riskLevel: 'high',
    dataAccess: ['Customer profiles', 'Email addresses', 'Phone numbers', 'Addresses']
  },
  {
    id: 'read_customer_events',
    name: 'Read Customer Events',
    description: 'View customer activity and behavior data',
    category: 'customers',
    required: false,
    riskLevel: 'medium',
    dataAccess: ['Customer activity', 'Behavior patterns']
  },
  {
    id: 'read_customer_data_erasure',
    name: 'Read Customer Data Erasure',
    description: 'View customer data deletion requests',
    category: 'customers',
    required: false,
    riskLevel: 'medium',
    dataAccess: ['Deletion requests', 'Privacy compliance']
  },
  {
    id: 'read_customer_merge',
    name: 'Read Customer Merge',
    description: 'View customer profile merge operations',
    category: 'customers',
    required: false,
    riskLevel: 'medium',
    dataAccess: ['Merge history', 'Profile consolidation']
  },

  // Analytics & Reports
  {
    id: 'read_analytics',
    name: 'Read Analytics',
    description: 'Access store analytics and performance metrics',
    category: 'analytics',
    required: true,
    riskLevel: 'low',
    dataAccess: ['Sales analytics', 'Performance metrics', 'Traffic data']
  },
  {
    id: 'read_reports',
    name: 'Read Reports',
    description: 'View generated reports and business insights',
    category: 'analytics',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Business reports', 'Performance insights']
  },

  // Marketing & Campaigns
  {
    id: 'read_marketing_events',
    name: 'Read Marketing Events',
    description: 'View marketing campaigns and events',
    category: 'marketing',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Campaign data', 'Marketing events']
  },
  {
    id: 'read_discounts',
    name: 'Read Discounts',
    description: 'Access discount codes and promotion rules',
    category: 'marketing',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Discount codes', 'Promotion rules']
  },
  {
    id: 'read_price_rules',
    name: 'Read Price Rules',
    description: 'View pricing rules and automatic discounts',
    category: 'marketing',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Pricing rules', 'Automatic discounts']
  },

  // Fulfillment & Shipping
  {
    id: 'read_fulfillments',
    name: 'Read Fulfillments',
    description: 'View order fulfillment status and tracking',
    category: 'fulfillment',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Fulfillment status', 'Tracking information']
  },
  {
    id: 'read_assigned_fulfillment_orders',
    name: 'Read Assigned Fulfillment Orders',
    description: 'View fulfillment orders assigned to your service',
    category: 'fulfillment',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Assigned orders', 'Fulfillment assignments']
  },
  {
    id: 'read_merchant_managed_fulfillment_orders',
    name: 'Read Merchant Managed Fulfillment Orders',
    description: 'View merchant-managed fulfillment orders',
    category: 'fulfillment',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Merchant fulfillment', 'Order management']
  },
  {
    id: 'read_third_party_fulfillment_orders',
    name: 'Read Third Party Fulfillment Orders',
    description: 'View third-party fulfillment service orders',
    category: 'fulfillment',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Third-party fulfillment', 'External services']
  },
  {
    id: 'read_shipping',
    name: 'Read Shipping',
    description: 'Access shipping rates and carrier information',
    category: 'fulfillment',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Shipping rates', 'Carrier data']
  },
  {
    id: 'read_delivery_customizations',
    name: 'Read Delivery Customizations',
    description: 'View custom delivery options and settings',
    category: 'fulfillment',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Delivery options', 'Custom settings']
  },

  // Financial Data
  {
    id: 'read_shopify_payments',
    name: 'Read Shopify Payments',
    description: 'Access Shopify Payments transaction data',
    category: 'financial',
    required: false,
    riskLevel: 'high',
    dataAccess: ['Payment transactions', 'Financial records']
  },
  {
    id: 'read_shopify_payments_accounts',
    name: 'Read Shopify Payments Accounts',
    description: 'View Shopify Payments account information',
    category: 'financial',
    required: false,
    riskLevel: 'high',
    dataAccess: ['Account details', 'Payment settings']
  },
  {
    id: 'read_shopify_payments_bank_accounts',
    name: 'Read Shopify Payments Bank Accounts',
    description: 'Access linked bank account information',
    category: 'financial',
    required: false,
    riskLevel: 'high',
    dataAccess: ['Bank account details', 'Financial connections']
  },
  {
    id: 'read_shopify_payments_disputes',
    name: 'Read Shopify Payments Disputes',
    description: 'View payment disputes and chargebacks',
    category: 'financial',
    required: false,
    riskLevel: 'high',
    dataAccess: ['Dispute records', 'Chargeback data']
  },
  {
    id: 'read_shopify_payments_payouts',
    name: 'Read Shopify Payments Payouts',
    description: 'Access payout information and schedules',
    category: 'financial',
    required: false,
    riskLevel: 'high',
    dataAccess: ['Payout details', 'Payment schedules']
  },

  // Content & Media
  {
    id: 'read_content',
    name: 'Read Content',
    description: 'Access store content, pages, and blog posts',
    category: 'content',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Store pages', 'Blog content', 'Media files']
  },
  {
    id: 'read_files',
    name: 'Read Files',
    description: 'Access uploaded files and media assets',
    category: 'content',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Uploaded files', 'Media assets']
  },

  // Store Settings
  {
    id: 'read_locales',
    name: 'Read Locales',
    description: 'View store language and locale settings',
    category: 'settings',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Language settings', 'Locale configuration']
  },
  {
    id: 'read_locations',
    name: 'Read Locations',
    description: 'Access store locations and address information',
    category: 'settings',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Store locations', 'Address data']
  },
  {
    id: 'read_markets',
    name: 'Read Markets',
    description: 'View market settings and geographical data',
    category: 'settings',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Market settings', 'Geographic data']
  },
  {
    id: 'read_themes',
    name: 'Read Themes',
    description: 'Access store theme information and assets',
    category: 'settings',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Theme data', 'Design assets']
  },
  {
    id: 'read_translations',
    name: 'Read Translations',
    description: 'View store translations and multilingual content',
    category: 'settings',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Translations', 'Multilingual content']
  },

  // Advanced Features
  {
    id: 'read_script_tags',
    name: 'Read Script Tags',
    description: 'View custom scripts and tracking codes',
    category: 'advanced',
    required: false,
    riskLevel: 'medium',
    dataAccess: ['Custom scripts', 'Tracking codes']
  },
  {
    id: 'read_apps',
    name: 'Read Apps',
    description: 'View installed apps and their permissions',
    category: 'advanced',
    required: false,
    riskLevel: 'medium',
    dataAccess: ['Installed apps', 'App permissions']
  },
  {
    id: 'read_custom_pixels',
    name: 'Read Custom Pixels',
    description: 'Access custom pixel tracking configuration',
    category: 'advanced',
    required: false,
    riskLevel: 'medium',
    dataAccess: ['Pixel tracking', 'Analytics configuration']
  },
  {
    id: 'read_checkout_branding_settings',
    name: 'Read Checkout Branding Settings',
    description: 'View checkout page branding and customization',
    category: 'advanced',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Checkout branding', 'Custom styling']
  },
  {
    id: 'read_discovery',
    name: 'Read Discovery',
    description: 'Access product discovery and recommendation data',
    category: 'advanced',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Product discovery', 'Recommendations']
  },
  {
    id: 'read_metaobjects',
    name: 'Read Metaobjects',
    description: 'View custom metaobjects and structured data',
    category: 'advanced',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Custom objects', 'Structured data']
  },
  {
    id: 'read_metaobject_definitions',
    name: 'Read Metaobject Definitions',
    description: 'Access metaobject type definitions and schemas',
    category: 'advanced',
    required: false,
    riskLevel: 'low',
    dataAccess: ['Object definitions', 'Data schemas']
  }
]

/**
 * Default scope configurations for different use cases
 */
export const DEFAULT_SCOPE_SETS = {
  basic: {
    name: 'Basic Analytics',
    description: 'Essential data for basic analytics and reporting',
    scopes: ['read_orders', 'read_products', 'read_customers', 'read_analytics']
  },
  ecommerce: {
    name: 'E-commerce Analytics',
    description: 'Comprehensive data for e-commerce insights',
    scopes: [
      'read_orders', 'read_products', 'read_customers', 'read_analytics',
      'read_inventory', 'read_fulfillments', 'read_reports'
    ]
  },
  marketing: {
    name: 'Marketing & Customer Intelligence',
    description: 'Data for marketing campaigns and customer analysis',
    scopes: [
      'read_orders', 'read_customers', 'read_customer_events', 'read_analytics',
      'read_marketing_events', 'read_discounts', 'read_price_rules'
    ]
  },
  comprehensive: {
    name: 'Comprehensive Analytics',
    description: 'Full access for advanced analytics and insights',
    scopes: [
      'read_orders', 'read_products', 'read_customers', 'read_analytics',
      'read_inventory', 'read_fulfillments', 'read_reports', 'read_marketing_events',
      'read_discounts', 'read_customer_events', 'read_files', 'read_locations'
    ]
  }
}

/**
 * Utility functions for scope management
 */
export class ShopifyScopeManager {
  
  /**
   * Get scopes by category
   */
  static getScopesByCategory(categoryId: string): ShopifyScope[] {
    return SHOPIFY_SCOPES.filter(scope => scope.category === categoryId)
  }

  /**
   * Get required scopes
   */
  static getRequiredScopes(): ShopifyScope[] {
    return SHOPIFY_SCOPES.filter(scope => scope.required)
  }

  /**
   * Build scope string for OAuth
   */
  static buildScopeString(scopeIds: string[]): string {
    return scopeIds.join(',')
  }

  /**
   * Validate scope selection
   */
  static validateScopes(selectedScopes: string[]): { 
    valid: boolean; 
    missing: string[]; 
    invalid: string[] 
  } {
    const requiredScopes = this.getRequiredScopes().map(s => s.id)
    const validScopes = SHOPIFY_SCOPES.map(s => s.id)
    
    const missing = requiredScopes.filter(scope => !selectedScopes.includes(scope))
    const invalid = selectedScopes.filter(scope => !validScopes.includes(scope))
    
    return {
      valid: missing.length === 0 && invalid.length === 0,
      missing,
      invalid
    }
  }

  /**
   * Get scope details by ID
   */
  static getScopeById(scopeId: string): ShopifyScope | undefined {
    return SHOPIFY_SCOPES.find(scope => scope.id === scopeId)
  }

  /**
   * Get scopes with dependencies
   */
  static getResolveDependencies(scopeIds: string[]): string[] {
    const resolvedScopes = new Set(scopeIds)
    
    for (const scopeId of scopeIds) {
      const scope = this.getScopeById(scopeId)
      if (scope?.dependencies) {
        scope.dependencies.forEach(dep => resolvedScopes.add(dep))
      }
    }
    
    return Array.from(resolvedScopes)
  }

  /**
   * Estimate data usage based on scopes
   */
  static estimateDataUsage(scopeIds: string[]): {
    level: 'low' | 'medium' | 'high';
    details: string[];
  } {
    const scopes = scopeIds.map(id => this.getScopeById(id)).filter(Boolean) as ShopifyScope[]
    const dataTypes = new Set<string>()
    
    scopes.forEach(scope => {
      scope.dataAccess.forEach(data => dataTypes.add(data))
    })
    
    const dataCount = dataTypes.size
    let level: 'low' | 'medium' | 'high' = 'low'
    
    if (dataCount > 15) level = 'high'
    else if (dataCount > 8) level = 'medium'
    
    return {
      level,
      details: Array.from(dataTypes)
    }
  }
}