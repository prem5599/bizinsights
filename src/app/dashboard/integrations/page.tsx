// src/app/dashboard/integrations/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { ShopifyOAuthConnect } from '@/components/integrations/ShopifyOAuthConnect'
import { 
  Puzzle, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Settings,
  ShoppingBag,
  CreditCard,
  BarChart3,
  Mail,
  Facebook,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Integration {
  id: string
  platform: string
  platformAccountId: string
  status: 'active' | 'inactive' | 'error'
  lastSyncAt: string | null
  createdAt: string
  updatedAt: string
  isConnected?: boolean
  platformDisplayName?: string
  statusText?: string
}

interface IntegrationData {
  integrations: Integration[]
  totalCount: number
  connectedCount: number
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function IntegrationsPage() {
  const { data: session, status } = useSession()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [data, setData] = useState<IntegrationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showShopifyConnect, setShowShopifyConnect] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchOrganizationAndIntegrations()
    } else if (status === 'unauthenticated') {
      setError('Please sign in to view integrations')
      setLoading(false)
    }
  }, [session, status])

  const fetchOrganizationAndIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First, get user's default organization
      const orgResponse = await fetch('/api/organizations/me')
      if (!orgResponse.ok) {
        throw new Error('Failed to fetch organization')
      }
      
      const orgData = await orgResponse.json()
      const defaultOrg = orgData.organizations?.[0] // Get first/default organization
      
      if (!defaultOrg) {
        throw new Error('No organization found')
      }
      
      setOrganization(defaultOrg)
      
      // Then fetch integrations for this organization
      await fetchIntegrations(defaultOrg.id)
      
    } catch (error) {
      console.error('Error fetching organization and integrations:', error)
      setError(error instanceof Error ? error.message : 'Failed to load data')
      // Provide fallback data
      setData({
        integrations: [],
        totalCount: 0,
        connectedCount: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchIntegrations = async (organizationId: string) => {
    try {
      setError(null)
      
      const response = await fetch(`/api/integrations?orgId=${organizationId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          // No integrations found - this is ok
          setData({
            integrations: [],
            totalCount: 0,
            connectedCount: 0
          })
          return
        }
        throw new Error(`Failed to fetch integrations: ${response.status}`)
      }

      const integrationsData = await response.json()
      setData(integrationsData)
    } catch (error) {
      console.error('Error fetching integrations:', error)
      // Provide fallback data but don't show error for missing integrations
      setData({
        integrations: [],
        totalCount: 0,
        connectedCount: 0
      })
    }
  }

  const handleRefresh = async () => {
    if (!organization) return
    
    setRefreshing(true)
    await fetchIntegrations(organization.id)
    setRefreshing(false)
  }

  const handleShopifySuccess = (integration: Integration) => {
    console.log('Shopify integration successful:', integration)
    
    // Add the new integration to the list
    setData(prev => prev ? {
      ...prev,
      integrations: [...prev.integrations, integration],
      totalCount: prev.totalCount + 1,
      connectedCount: prev.connectedCount + 1
    } : {
      integrations: [integration],
      totalCount: 1,
      connectedCount: 1
    })
  }

  const getIntegrationIcon = (platform: string) => {
    switch (platform) {
      case 'shopify':
        return ShoppingBag
      case 'stripe':
        return CreditCard
      case 'google_analytics':
        return BarChart3
      case 'mailchimp':
        return Mail
      case 'facebook_ads':
        return Facebook
      default:
        return Puzzle
    }
  }

  const getIntegrationName = (platform: string) => {
    switch (platform) {
      case 'shopify':
        return 'Shopify'
      case 'stripe':
        return 'Stripe'
      case 'google_analytics':
        return 'Google Analytics'
      case 'mailchimp':
        return 'Mailchimp'
      case 'facebook_ads':
        return 'Facebook Ads'
      default:
        return platform
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'inactive':
        return 'text-gray-600 bg-gray-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Connected'
      case 'inactive':
        return 'Disconnected'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  const isIntegrationConnected = (platform: string) => {
    return data?.integrations.some(integration => 
      integration.platform === platform && integration.status === 'active'
    )
  }

  const availableIntegrations = [
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Connect your Shopify store to sync order data and customer information',
      icon: ShoppingBag,
      category: 'E-commerce',
      features: ['Order data', 'Customer info', 'Product catalog', 'Real-time updates'],
      onClick: () => setShowShopifyConnect(true)
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Sync payment data and subscription metrics from your Stripe account',
      icon: CreditCard,
      category: 'Payments',
      features: ['Payment data', 'Subscription metrics', 'Customer analytics', 'Revenue tracking'],
      onClick: () => console.log('Stripe integration coming soon')
    },
    {
      id: 'google_analytics',
      name: 'Google Analytics',
      description: 'Import website traffic and conversion data from Google Analytics',
      icon: BarChart3,
      category: 'Analytics',
      features: ['Traffic data', 'Conversion tracking', 'Audience insights', 'Goal tracking'],
      onClick: () => console.log('Google Analytics integration coming soon')
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      description: 'Connect your email marketing campaigns and subscriber data',
      icon: Mail,
      category: 'Marketing',
      features: ['Campaign data', 'Subscriber metrics', 'Open rates', 'Click tracking'],
      onClick: () => console.log('Mailchimp integration coming soon')
    }
  ]

  if (loading || status === 'loading') {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center">
              <Puzzle className="h-8 w-8 text-blue-500 mr-3" />
              Integrations
            </h1>
            <p className="mt-2 text-sm text-slate-600">Loading integrations...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 p-6 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
                <div className="h-10 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="border-b border-slate-200 pb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center">
              <Puzzle className="h-8 w-8 text-blue-500 mr-3" />
              Integrations
            </h1>
          </div>
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Unable to load integrations</h3>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={fetchOrganizationAndIntegrations}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center">
                <Puzzle className="h-8 w-8 text-blue-500 mr-3" />
                Integrations
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                {organization?.name && `Connected integrations for ${organization.name}`}
                {data && ` • ${data.connectedCount} of ${data.totalCount} active`}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Connected Integrations */}
        {data && data.integrations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Connected Integrations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.integrations.map((integration) => {
                const Icon = getIntegrationIcon(integration.platform)
                return (
                  <div key={integration.id} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mr-3">
                          <Icon className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">
                            {getIntegrationName(integration.platform)}
                          </h3>
                          <p className="text-sm text-slate-500">
                            {integration.platformAccountId}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        getStatusColor(integration.status)
                      )}>
                        {getStatusText(integration.status)}
                      </span>
                    </div>
                    
                    {integration.lastSyncAt && (
                      <p className="text-xs text-slate-500">
                        Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                    
                    <div className="mt-3 flex items-center justify-between">
                      <button className="text-sm text-blue-600 hover:text-blue-700">
                        View Details
                      </button>
                      <button className="text-sm text-slate-400 hover:text-slate-600">
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Available Integrations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Available Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableIntegrations.map((integration) => {
              const Icon = integration.icon
              const isConnected = isIntegrationConnected(integration.id)
              
              return (
                <div key={integration.id} className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mr-4">
                        <Icon className="h-6 w-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-slate-900">{integration.name}</h3>
                        <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          {integration.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                    {integration.description}
                  </p>
                  
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Features:</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      {integration.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <Check className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button
                      onClick={integration.onClick}
                      disabled={isConnected}
                      className={cn(
                        "inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        isConnected
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      )}
                    >
                      {isConnected ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Connected
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Connect {integration.name}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Empty State */}
        {data && data.integrations.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <Puzzle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No integrations yet</h3>
            <p className="text-slate-600 mb-6">
              Connect your first integration to start analyzing your business data.
            </p>
            <button
              onClick={() => setShowShopifyConnect(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect Shopify
            </button>
          </div>
        )}
      </div>

      {/* Shopify Connect Modal */}
      <ShopifyOAuthConnect
        isOpen={showShopifyConnect}
        onClose={() => setShowShopifyConnect(false)}
        onSuccess={handleShopifySuccess}
      />
    </DashboardLayout>
  )
} 