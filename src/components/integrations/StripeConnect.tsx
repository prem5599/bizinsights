// src/components/integrations/StripeConnect.tsx
'use client'

import { useState } from 'react'
import { X, Loader2, CreditCard, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StripeConnectProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (integration: any) => void
  organizationId: string
}

export function StripeConnect({ isOpen, onClose, onSuccess, organizationId }: StripeConnectProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'connect' | 'connecting' | 'success'>('connect')

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    setStep('connecting')

    try {
      // Initiate Stripe OAuth flow
      const response = await fetch('/api/integrations/stripe/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate Stripe connection')
      }

      // Redirect to Stripe OAuth
      window.location.href = data.authUrl

    } catch (error) {
      console.error('Stripe connection error:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect to Stripe')
      setStep('connect')
      setLoading(false)
    }
  }

  const handleCancel = () => {
    if (!loading) {
      onClose()
      // Reset state
      setStep('connect')
      setError(null)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg mr-3">
              <CreditCard className="h-6 w-6 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Connect Stripe Account</h2>
          </div>
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'connect' && (
            <>
              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  Connect your Stripe account to automatically sync payment data, customers, and subscription metrics.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">What we'll sync:</h4>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-blue-600 mr-2" />
                      Payment transactions and revenue
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-blue-600 mr-2" />
                      Customer information and profiles
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-blue-600 mr-2" />
                      Subscription data and MRR
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-blue-600 mr-2" />
                      Invoice and billing information
                    </li>
                    <li className="flex items-center">
                      <Check className="h-4 w-4 text-blue-600 mr-2" />
                      Real-time payment events via webhooks
                    </li>
                  </ul>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Security & Privacy</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li>• We use Stripe Connect for secure authentication</li>
                    <li>• Your Stripe credentials are never stored by us</li>
                    <li>• You can disconnect at any time</li>
                    <li>• Only read access to your data is granted</li>
                  </ul>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </>
          )}

          {step === 'connecting' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Redirecting to Stripe</h3>
              <p className="text-gray-600">Please authorize the connection in the new window...</p>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  If the popup is blocked, please allow popups for this site and try again.
                </p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Stripe Connected!</h3>
              <p className="text-gray-600">Your Stripe account has been successfully connected.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'connect' && (
          <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={loading}
              className={cn(
                "px-4 py-2 text-sm font-medium text-white rounded-md",
                "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center"
              )}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <span>Connect with Stripe</span>
              <ExternalLink className="h-4 w-4 ml-2" />
            </button>
          </div>
        )}

        {step === 'connecting' && (
          <div className="px-6 py-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Complete the authorization on Stripe's website to finish connecting your account.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Alternative simplified version for testing
export function SimpleStripeConnect({ 
  organizationId, 
  onSuccess, 
  className 
}: {
  organizationId: string
  onSuccess?: (integration: any) => void
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/integrations/stripe/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate Stripe connection')
      }

      // Redirect to Stripe OAuth
      window.location.href = data.authUrl

    } catch (error) {
      console.error('Stripe connection error:', error)
      setError(error instanceof Error ? error.message : 'Failed to connect to Stripe')
      setLoading(false)
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <button
        onClick={handleConnect}
        disabled={loading}
        className={cn(
          "w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors",
          "bg-indigo-600 text-white hover:bg-indigo-700",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <CreditCard className="h-4 w-4 mr-2" />
        )}
        {loading ? 'Connecting...' : 'Connect Stripe Account'}
        {!loading && <ExternalLink className="h-4 w-4 ml-2" />}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Secure connection via Stripe Connect
      </div>
    </div>
  )
}

export default StripeConnect