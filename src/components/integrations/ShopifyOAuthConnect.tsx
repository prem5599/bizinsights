// src/components/integrations/ShopifyOAuthConnect.tsx
'use client'

import { useState } from 'react'
import { X, Loader2, ShoppingBag, Check, ExternalLink, Key, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ShopifyOAuthConnectProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (integration: any) => void
}

export function ShopifyOAuthConnect({ isOpen, onClose, onSuccess }: ShopifyOAuthConnectProps) {
  const [shopDomain, setShopDomain] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'method' | 'domain' | 'token' | 'connecting' | 'success'>('method')
  const [authMethod, setAuthMethod] = useState<'oauth' | 'private'>('oauth')

  const handleMethodSelect = (method: 'oauth' | 'private') => {
    setAuthMethod(method)
    setStep('domain')
  }

  const handleDomainSubmit = () => {
    if (!shopDomain.trim()) {
      setError('Please enter your shop domain')
      return
    }

    if (authMethod === 'oauth') {
      handleOAuthFlow()
    } else {
      setStep('token')
    }
  }

  const handleOAuthFlow = async () => {
    setLoading(true)
    setError(null)
    setStep('connecting')

    try {
      const cleanDomain = shopDomain.trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\.myshopify\.com\/?$/, '')

      // Generate OAuth URL
      const response = await fetch('/api/integrations/shopify/oauth-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopDomain: cleanDomain })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate OAuth URL')
      }

      // Redirect to Shopify OAuth
      window.location.href = data.authUrl

    } catch (error) {
      console.error('OAuth flow error:', error)
      setError(error instanceof Error ? error.message : 'OAuth flow failed')
      setStep('domain')
      setLoading(false)
    }
  }

  const handleTokenConnect = async () => {
    const trimmedToken = accessToken.trim()
    
    if (!trimmedToken) {
      setError('Please enter your access token')
      return
    }

    if (!trimmedToken.startsWith('shpat_')) {
      setError('Access token must start with "shpat_". Please check your token.')
      return
    }

    setLoading(true)
    setError(null)
    setStep('connecting')

    try {
      console.log('🔄 Connecting with token:', {
        domainOriginal: shopDomain,
        domainTrimmed: shopDomain.trim(),
        tokenLength: trimmedToken.length,
        tokenStart: trimmedToken.substring(0, 10),
        tokenEnd: trimmedToken.substring(-5)
      })

      const response = await fetch('/api/integrations/shopify/private-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: shopDomain.trim(),
          accessToken: trimmedToken
        })
      })

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      let data
      try {
        const responseText = await response.text()
        console.log('📝 Raw response text:', responseText)
        
        if (responseText) {
          data = JSON.parse(responseText)
          console.log('📊 Parsed response data:', data)
        } else {
          console.error('❌ Empty response body')
          data = { error: 'Empty response from server' }
        }
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError)
        data = { error: 'Invalid response format from server' }
      }

      if (!response.ok) {
        console.error('❌ API Error:', {
          status: response.status,
          statusText: response.statusText,
          data,
          url: response.url
        })
        
        // Provide more specific error messages
        if (response.status === 401) {
          throw new Error('Invalid access token. Please check your token and try again.')
        } else if (response.status === 404) {
          throw new Error('Shop not found. Please check your shop domain.')
        } else if (response.status === 500) {
          throw new Error(data?.details || data?.error || 'Internal server error. Please try again.')
        } else {
          throw new Error(data?.error || `HTTP ${response.status}: ${response.statusText}`)
        }
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Connection failed - no success confirmation')
      }

      console.log('✅ Connection successful:', data)
      setStep('success')
      
      setTimeout(() => {
        onSuccess(data.integration)
        onClose()
        resetForm()
      }, 2000)

    } catch (error) {
      console.error('❌ Connection error:', error)
      
      let errorMessage = 'Connection failed'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setError(errorMessage)
      setStep('token')
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep('method')
    setShopDomain('')
    setAccessToken('')
    setError(null)
    setLoading(false)
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <ShoppingBag className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Connect Shopify Store
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Method Selection */}
          {step === 'method' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Choose Connection Method
                </h3>
                <p className="text-gray-600 mb-6">
                  Select how you want to connect your Shopify store
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => handleMethodSelect('oauth')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 text-left transition-colors"
                >
                  <div className="flex items-start">
                    <Globe className="h-6 w-6 text-blue-600 mt-1 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">OAuth (Recommended)</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Secure authentication through Shopify. Works for any store.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleMethodSelect('private')}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 text-left transition-colors"
                >
                  <div className="flex items-start">
                    <Key className="h-6 w-6 text-green-600 mt-1 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900">Private App Token</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Use an access token from your Shopify admin. For your own store only.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Domain Input */}
          {step === 'domain' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Shopify Store Domain
                </h3>
                <p className="text-gray-600 mb-4">
                  Enter your shop domain in any of these formats:
                </p>
                <ul className="text-sm text-gray-500 space-y-1 mb-6">
                  <li>• <code className="bg-gray-100 px-1 rounded">mystore.myshopify.com</code></li>
                  <li>• <code className="bg-gray-100 px-1 rounded">mystore</code> (just the store name)</li>
                  <li>• <code className="bg-gray-100 px-1 rounded">https://mystore.myshopify.com</code></li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Domain
                </label>
                <input
                  type="text"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  placeholder="mystore.myshopify.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('method')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  ← Back
                </button>
                <button
                  onClick={handleDomainSubmit}
                  disabled={loading || !shopDomain.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {authMethod === 'oauth' ? 'Continue with OAuth' : 'Next'}
                </button>
              </div>
            </div>
          )}

          {/* Token Input (Private App) */}
          {step === 'token' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Private App Access Token
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                  <h4 className="font-medium text-blue-900 mb-2">How to get your access token:</h4>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Go to your Shopify admin → Apps → "App and sales channel settings"</li>
                    <li>2. Click "Develop apps" → "Create an app"</li>
                    <li>3. Configure API scopes: read_orders, read_products, read_customers</li>
                    <li>4. Install the app and copy the access token</li>
                  </ol>
                  <a
                    href={`https://${shopDomain.replace(/\.myshopify\.com$/, '')}.myshopify.com/admin/settings/apps`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-2 text-blue-600 hover:text-blue-800"
                  >
                    Open Shopify Admin <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Token
                </label>
                <input
                  type="text"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="shpat_..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                  disabled={loading}
                  style={{ fontFamily: 'monospace' }}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your token will be encrypted and stored securely
                </p>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep('domain')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={loading}
                >
                  ← Back
                </button>
                <button
                  onClick={handleTokenConnect}
                  disabled={loading || !accessToken.trim()}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Connect Store
                </button>
              </div>
            </div>
          )}

          {/* Connecting State */}
          {step === 'connecting' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {authMethod === 'oauth' ? 'Redirecting to Shopify...' : 'Connecting to your store...'}
              </h3>
              <p className="text-gray-600">
                {authMethod === 'oauth' 
                  ? 'You will be redirected to Shopify to authorize the connection'
                  : 'Verifying your access token and setting up the integration'
                }
              </p>
            </div>
          )}

          {/* Success State */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Store Connected!</h3>
              <p className="text-gray-600">
                Your Shopify store has been successfully connected. We'll start syncing your data now.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}