// src/app/[orgSlug]/integrations/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Plus,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Zap,
  ShoppingBag,
  CreditCard,
  BarChart3,
  Users,
  Package,
  Globe,
  Smartphone,
  Mail,
  MessageSquare,
  Database,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Integration {
  id: string
  platform: string
  platformAccountId: string | null
  status: 'active' | 'inactive' | 'error' | 'syncing' | 'pending'
  lastSyncAt: string | null
  dataPointsCount: number
  createdAt: string
  metadata?: {
    shopName?: string
    shopInfo?: {
      name: string
      domain: string
      email: string
      planName: string
      currency: string
      country: string
    }
    scopes?: string[]
    error?: {
      message: string
      timestamp: string
    }
  }
}

interface AvailableIntegration {
  id: string
  name: string
  description: string
  platform: string
  icon: React.ReactNode
  category: 'ecommerce' | 'payments' | 'analytics' | 'marketing' | 'productivity'
  features: string[]
  isPopular?: boolean
  isComingSoon?: boolean
  setupTime: string
}

const AVAILABLE_INTEGRATIONS: AvailableIntegration[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect your Shopify store to track orders, customers, and revenue in real-time',
    platform: 'shopify',
    icon: <ShoppingBag className="h-6 w-6" />,
    category: 'ecommerce',
    features: ['Order tracking', 'Customer analytics', 'Revenue metrics', 'Product performance'],
    isPopular: true,
    setupTime: '2 minutes'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Monitor payment processing, subscription metrics, and financial performance',
    platform: 'stripe',
    icon: <CreditCard className="h-6 w-6" />,
    category: 'payments',
    features: ['Payment tracking', 'Subscription metrics', 'Chargeback monitoring', 'Revenue analytics'],
    isPopular: true,
    setupTime: '3 minutes'
  },
  {
    id: 'google_analytics',
    name: 'Google Analytics',
    description: 'Track website traffic, user behavior, and conversion metrics',
    platform: 'google_analytics',
    icon: <BarChart3 className="h-6 w-6" />,
    category: 'analytics',
    features: ['Traffic analytics', 'Conversion tracking', 'Audience insights', 'Goal monitoring'],
    setupTime: '5 minutes'
  },
  {
    id: 'mailchimp',
    name: 'Mailchimp',
    description: 'Monitor email campaign performance and subscriber engagement',
    platform: 'mailchimp',
    icon: <Mail className="h-6 w-6" />,
    category: 'marketing',
    features: ['Email metrics', 'Subscriber growth', 'Campaign performance', 'Automation tracking'],
    isComingSoon: true,
    setupTime: '4 minutes'
  },
  {
    id: 'facebook_ads',
    name: 'Facebook Ads',
    description: 'Track ad performance, ROAS, and social media marketing metrics',
    platform: 'facebook_ads',
    icon: <MessageSquare className="h-6 w-6" />,
    category: 'marketing',
    features: ['Ad performance', 'ROAS tracking', 'Audience insights', 'Campaign optimization'],
    isComingSoon: true,
    setupTime: '6 minutes'
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync financial data, expenses, and accounting metrics',
    platform: 'quickbooks',
    icon: <FileText className="h-6 w-6" />,
    category: 'productivity',
    features: ['Financial tracking', 'Expense monitoring', 'P&L insights', 'Cash flow analysis'],
    isComingSoon: true,
    setupTime: '8 minutes'
  }
]

function getStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'text-green-600 bg-green-50 border-green-200'
    case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'syncing': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'error': return 'text-red-600 bg-red-50 border-red-200'
    case 'inactive': return 'text-gray-600 bg-gray-50 border-gray-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

function getStatusIcon(status: string): React.ReactNode {
  switch (status) {
    case 'active': return <CheckCircle className="h-4 w-4" />
    case 'pending': return <Clock className="h-4 w-4" />
    case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />
    case 'error': return <AlertCircle className="h-4 w-4" />
    case 'inactive': return <AlertCircle className="h-4 w-4" />
    default: return <Clock className="h-4 w-4" />
  }
}

function getPlatformIcon(platform: string): React.ReactNode {
  switch (platform) {
    case 'shopify': return <ShoppingBag className="h-5 w-5" />
    case 'stripe': return <CreditCard className="h-5 w-5" />
    case 'google_analytics': return <BarChart3 className="h-5 w-5" />
    case 'mailchimp': return <Mail className="h-5 w-5" />
    case 'facebook_ads': return <MessageSquare className="h-5 w-5" />
    case 'quickbooks': return <FileText className="h-5 w-5" />
    default: return <Database className="h-5 w-5" />
  }
}

function getPlatformName(platform: string): string {
  const names: Record<string, string> = {
    shopify: 'Shopify',
    stripe: 'Stripe',
    google_analytics: 'Google Analytics',
    mailchimp: 'Mailchimp',
    facebook_ads: 'Facebook Ads',
    quickbooks: 'QuickBooks'
  }
  return names[platform] || platform
}

function formatLastSync(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'Never'
  
  const now = new Date()
  const sync = new Date(lastSyncAt)
  const diffMs = now.getTime() - sync.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export default function IntegrationsPage() {
  const { data: session } = useSession()
  const params = useParams()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const orgSlug = params.orgSlug as string

  useEffect(() => {
    fetchIntegrations()
    
    // Check for success/error messages from OAuth callbacks
    const success = searchParams.get('success')
    const errorParam = searchParams.get('error')
    const shop = searchParams.get('shop')
    
    if (success === 'shopify_connected' && shop) {
      // Show success notification
      console.log(`Successfully connected to Shopify store: ${shop}`)
      // You could add a toast notification here
    } else if (errorParam) {
      console.error('Integration connection error:', errorParam)
      // You could add an error toast notification here
    }
  }, [searchParams])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/integrations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch integrations: ${response.statusText}`)
      }

      const data = await response.json()
      setIntegrations(data.integrations || [])
      
    } catch (err) {
      console.error('Failed to fetch integrations:', err)
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (platform: string) => {
    if (platform === 'shopify') {
      handleShopifyConnect()
    } else {
      // Handle other platforms or show coming soon message
      console.log(`Connecting to ${platform} - coming soon!`)
    }
  }

  const handleShopifyConnect = () => {
    const shopName = prompt('Enter your Shopify store name (without .myshopify.com):')
    if (!shopName) return

    setConnecting('shopify')

    // Call the Shopify connect API
    fetch('/api/integrations/shopify/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        organizationId: orgSlug, // Assuming orgSlug is the organization ID
        shopName: shopName.trim(),
        returnUrl: window.location.href
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success && data.authUrl) {
        // Redirect to Shopify OAuth
        window.location.href = data.authUrl
      } else {
        throw new Error(data.error || 'Failed to initiate connection')
      }
    })
    .catch(error => {
      console.error('Shopify connection error:', error)
      setError(error.message)
      setConnecting(null)
    })
  }

  const handleDisconnect = async (integrationId: string, platform: string) => {
    if (!confirm(`Are you sure you want to disconnect ${getPlatformName(platform)}? This will stop data syncing.`)) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect integration')
      }

      // Refresh integrations list
      fetchIntegrations()
      
    } catch (err) {
      console.error('Failed to disconnect integration:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect integration')
    }
  }

  const handleRefreshSync = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to trigger sync')
      }

      // Refresh integrations list
      fetchIntegrations()
      
    } catch (err) {
      console.error('Failed to trigger sync:', err)
      setError(err instanceof Error ? err.message : 'Failed to trigger sync')
    }
  }

  const connectedPlatforms = new Set(integrations.map(i => i.platform))
  const availableIntegrations = AVAILABLE_INTEGRATIONS.filter(integration => 
    selectedCategory === 'all' || integration.category === selectedCategory
  )

  const categories = [
    { id: 'all', name: 'All', icon: <Globe className="h-4 w-4" /> },
    { id: 'ecommerce', name: 'E-commerce', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'payments', name: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
    { id: 'analytics', name: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'marketing', name: 'Marketing', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'productivity', name: 'Productivity', icon: <FileText className="h-4 w-4" /> }
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
          <p className="text-gray-600 mt-1">
            Connect your business tools to get unified insights and automated reporting
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setError(null)}
                    className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connected Integrations */}
        {integrations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Connected Integrations</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          {getPlatformIcon(integration.platform)}
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {getPlatformName(integration.platform)}
                          </CardTitle>
                          {integration.platformAccountId && (
                            <CardDescription className="text-sm">
                              {integration.metadata?.shopInfo?.name || integration.platformAccountId}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <div className={cn(
                        "inline-flex items-center space-x-1 rounded-full px-2 py-1 text-xs font-medium border",
                        getStatusColor(integration.status)
                      )}>
                        {getStatusIcon(integration.status)}
                        <span className="capitalize">{integration.status}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Data Points</div>
                        <div className="font-medium">{integration.dataPointsCount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Last Sync</div>
                        <div className="font-medium">{formatLastSync(integration.lastSyncAt)}</div>
                      </div>
                    </div>

                    {integration.status === 'error' && integration.metadata?.error && (
                      <div className="rounded-md bg-red-50 p-3">
                        <div className="text-sm text-red-800">
                          {integration.metadata.error.message}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => handleRefreshSync(integration.id)}
                        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                      >
                        <RefreshCw className="mr-1 h-4 w-4" />
                        Sync Now
                      </button>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {/* Handle settings */}}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDisconnect(integration.id, integration.platform)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Integrations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Available Integrations</h2>
            
            {/* Category Filter */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "inline-flex items-center space-x-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    selectedCategory === category.id
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  {category.icon}
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableIntegrations.map((integration) => {
              const isConnected = connectedPlatforms.has(integration.platform)
              const isConnecting = connecting === integration.platform

              return (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          {integration.icon}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            {integration.isPopular && (
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                                Popular
                              </span>
                            )}
                          </div>
                          <CardDescription className="text-sm mt-1">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Features:</div>
                      <div className="grid grid-cols-2 gap-1">
                        {integration.features.map((feature, index) => (
                          <div key={index} className="text-xs text-gray-600 flex items-center">
                            <CheckCircle className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
                            {feature}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {integration.setupTime} setup
                      </div>
                      
                      <button
                        onClick={() => handleConnect(integration.platform)}
                        disabled={isConnected || isConnecting || integration.isComingSoon}
                        className={cn(
                          "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isConnected
                            ? "bg-green-50 text-green-700 border border-green-200 cursor-not-allowed"
                            : integration.isComingSoon
                            ? "bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
                            : isConnecting
                            ? "bg-blue-50 text-blue-700 border border-blue-200 cursor-wait"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        )}
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Connecting...
                          </>
                        ) : isConnected ? (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Connected
                          </>
                        ) : integration.isComingSoon ? (
                          'Coming Soon'
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Connect
                          </>
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Help Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Need help setting up integrations?
                </h3>
                <p className="text-gray-600 mb-4">
                  Our setup guides walk you through connecting each integration step-by-step. 
                  Most integrations take less than 5 minutes to set up.
                </p>
                <div className="flex items-center space-x-4">
                  <button className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
                    <ExternalLink className="mr-1 h-4 w-4" />
                    View Setup Guides
                  </button>
                  <button className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">
                    <MessageSquare className="mr-1 h-4 w-4" />
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}