// src/app/dashboard/integrations/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { 
  PlusCircle, 
  CheckCircle, 
  AlertCircle, 
  Settings, 
  ExternalLink,
  RefreshCw,
  Clock,
  AlertTriangle,
  Zap,
  Trash2,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Integration {
  id: string
  platform: string
  accountName: string
  platformAccountId: string
  status: 'active' | 'error' | 'pending'
  connectedAt: string
  lastSyncAt: string | null
  metadata?: any
}

interface IntegrationTemplate {
  id: string
  name: string
  description: string
  icon: string
  color: string
  status: 'available' | 'connected' | 'error'
  features: string[]
  setupSteps: string[]
  integration?: Integration
}

export default function IntegrationsPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [syncingIntegrations, setSyncingIntegrations] = useState<Set<string>>(new Set())
  const [shopDomain, setShopDomain] = useState('')
  const [showShopifyModal, setShowShopifyModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Handle URL parameters for success/error messages
  useEffect(() => {
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')

    if (successParam === 'shopify_connected') {
      setSuccess('Shopify store connected successfully! Data sync has started.')
      // Clear URL parameters
      window.history.replaceState({}, '', '/dashboard/integrations')
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        'unauthorized': 'You must be signed in to connect integrations',
        'missing_parameters': 'Missing required parameters from Shopify',
        'invalid_signature': 'Invalid request signature',
        'invalid_state': 'Invalid or expired authorization state',
        'access_denied': 'You do not have permission to add integrations',
        'connection_failed': 'Failed to connect to Shopify',
        'connection_error': 'An error occurred during connection'
      }
      setError(errorMessages[errorParam] || 'An error occurred while connecting the integration')
      window.history.replaceState({}, '', '/dashboard/integrations')
    }
  }, [searchParams])

  useEffect(() => {
    fetchIntegrations()
  }, [])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      const orgId = 'temp-org-id' // In real app, get from context/route
      const response = await fetch(`/api/organizations/${orgId}/integrations`)
      
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.integrations || [])
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectShopify = async () => {
    if (!shopDomain.trim()) {
      setError('Please enter your Shopify store domain')
      return
    }

    try {
      setConnectingPlatform('shopify')
      setError(null)

      const orgId = 'temp-org-id' // In real app, get from context/route
      const response = await fetch('/api/integrations/shopify/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shopDomain: shopDomain.trim(),
          organizationId: orgId
        })
      })

      const data = await response.json()

      if (response.ok && data.authUrl) {
        // Redirect to Shopify OAuth
        window.location.href = data.authUrl
      } else {
        setError(data.message || 'Failed to connect to Shopify')
      }
    } catch (error) {
      setError('Failed to connect to Shopify. Please try again.')
      console.error('Shopify connection error:', error)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleSyncIntegration = async (integrationId: string) => {
    try {
      setSyncingIntegrations(prev => new Set(prev).add(integrationId))
      setError(null)

      const orgId = 'temp-org-id'
      const response = await fetch('/api/integrations/shopify/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: orgId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Data sync completed successfully')
        await fetchIntegrations() // Refresh integration status
      } else {
        setError(data.message || 'Failed to sync data')
      }
    } catch (error) {
      setError('Failed to sync integration data')
      console.error('Sync error:', error)
    } finally {
      setSyncingIntegrations(prev => {
        const newSet = new Set(prev)
        newSet.delete(integrationId)
        return newSet
      })
    }
  }

  const handleDisconnectIntegration = async (integrationId: string) => {
    if (!confirm('Are you sure you want to disconnect this integration? This will stop data syncing.')) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccess('Integration disconnected successfully')
        await fetchIntegrations()
      } else {
        setError('Failed to disconnect integration')
      }
    } catch (error) {
      setError('Failed to disconnect integration')
      console.error('Disconnect error:', error)
    }
  }

  // Define available integrations with their current status
  const integrationTemplates: IntegrationTemplate[] = [
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Connect your Shopify store to sync orders, products, and customer data',
      icon: '🛍️',
      color: 'bg-green-500',
      status: integrations.find(i => i.platform === 'shopify') ? 
        (integrations.find(i => i.platform === 'shopify')?.status === 'active' ? 'connected' : 'error') : 
        'available',
      features: ['Orders', 'Products', 'Customers', 'Revenue'],
      setupSteps: [
        'Enter your shop domain (e.g., mystore.myshopify.com)',
        'Authorize BizInsights in your Shopify admin',
        'We\'ll automatically sync your store data'
      ],
      integration: integrations.find(i => i.platform === 'shopify')
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Connect your Stripe account to sync payments and customer data',
      icon: '💳',
      color: 'bg-blue-500',
      status: 'available',
      features: ['Payments', 'Customers', 'Revenue', 'Subscriptions'],
      setupSteps: [
        'Click connect to authorize with Stripe',
        'Grant BizInsights read access to your account',
        'We\'ll sync your payment data automatically'
      ]
    },
    {
      id: 'google_analytics',
      name: 'Google Analytics',
      description: 'Connect Google Analytics to track website traffic and user behavior',
      icon: '📊',
      color: 'bg-orange-500',
      status: 'available',
      features: ['Sessions', 'Users', 'Page Views', 'Traffic Sources'],
      setupSteps: [
        'Authorize with your Google account',
        'Select the Analytics property to connect',
        'We\'ll sync your website analytics data'
      ]
    }
  ]

  const connectedCount = integrationTemplates.filter(i => i.status === 'connected').length
  const availableCount = integrationTemplates.filter(i => i.status === 'available').length
  const errorCount = integrationTemplates.filter(i => i.status === 'error').length

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
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
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center">
                <PlusCircle className="h-8 w-8 text-blue-500 mr-3" />
                Integrations
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Connect your business tools to get comprehensive insights
              </p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="rounded-md bg-green-50 p-4 border border-green-200">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="ml-auto text-green-400 hover:text-green-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-slate-600">Connected</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{connectedCount}</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
              <span className="text-sm font-medium text-slate-600">Available</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{availableCount}</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-sm font-medium text-slate-600">Errors</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{errorCount}</p>
          </div>
        </div>

        {/* Available Integrations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Available Integrations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrationTemplates.map((template) => (
              <div key={template.id} className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn("flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg", template.color)}>
                      {template.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-900">{template.name}</h3>
                      <div className="flex items-center mt-1">
                        {template.status === 'connected' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Connected
                          </span>
                        )}
                        {template.status === 'error' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Error
                          </span>
                        )}
                        {template.status === 'available' && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mt-3">{template.description}</p>
                
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-700 mb-2">Features:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.features.map((feature, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-100 text-slate-700">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Integration-specific content */}
                {template.status === 'connected' && template.integration && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm">
                      <p className="font-medium text-green-800">{template.integration.accountName}</p>
                      <p className="text-green-600">Connected {new Date(template.integration.connectedAt).toLocaleDateString()}</p>
                      {template.integration.lastSyncAt && (
                        <p className="text-green-600">Last sync: {new Date(template.integration.lastSyncAt).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => handleSyncIntegration(template.integration!.id)}
                        disabled={syncingIntegrations.has(template.integration!.id)}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded hover:bg-green-200 disabled:opacity-50"
                      >
                        {syncingIntegrations.has(template.integration!.id) ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3 mr-1" />
                        )}
                        Sync Now
                      </button>
                      <button
                        onClick={() => handleDisconnectIntegration(template.integration!.id)}
                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded hover:bg-red-200"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}

                {template.status === 'available' && (
                  <div className="mt-4">
                    {template.id === 'shopify' ? (
                      <button
                        onClick={() => setShowShopifyModal(true)}
                        disabled={connectingPlatform === 'shopify'}
                        className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {connectingPlatform === 'shopify' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <PlusCircle className="w-4 h-4 mr-2" />
                        )}
                        Connect {template.name}
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-400 bg-gray-100 border border-gray-300 rounded-md cursor-not-allowed"
                      >
                        Coming Soon
                      </button>
                    )}
                  </div>
                )}

                {template.status === 'error' && template.integration && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-red-800">Connection error - please reconnect</p>
                    <button
                      onClick={() => template.id === 'shopify' && setShowShopifyModal(true)}
                      className="mt-2 inline-flex items-center px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-200 rounded hover:bg-red-200"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Reconnect
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Shopify Connection Modal */}
        {showShopifyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Connect Shopify Store</h2>
                <button
                  onClick={() => {
                    setShowShopifyModal(false)
                    setShopDomain('')
                    setError(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shopify Store Domain
                  </label>
                  <input
                    type="text"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    placeholder="mystore.myshopify.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter your shop domain (e.g., mystore.myshopify.com)
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">What we'll sync:</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Order data and revenue</li>
                    <li>• Customer information</li>
                    <li>• Product catalog</li>
                    <li>• Real-time order updates</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowShopifyModal(false)
                      setShopDomain('')
                      setError(null)
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnectShopify}
                    disabled={!shopDomain.trim() || connectingPlatform === 'shopify'}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {connectingPlatform === 'shopify' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4 mr-2" />
                    )}
                    Connect Store
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}