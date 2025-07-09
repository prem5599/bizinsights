// app/dashboard/integrations/page.tsx
'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { PlusCircle, CheckCircle, AlertCircle, Settings } from 'lucide-react'

export default function IntegrationsPage() {
  const integrations = [
    { 
      name: 'Shopify', 
      description: 'Connect your Shopify store to sync orders and products',
      icon: '🛍️',
      status: 'disconnected',
      color: 'bg-green-500'
    },
    { 
      name: 'Stripe', 
      description: 'Sync payment data and customer information',
      icon: '💳',
      status: 'disconnected',
      color: 'bg-blue-500'
    },
    { 
      name: 'Google Analytics', 
      description: 'Import website traffic and user behavior data',
      icon: '📊',
      status: 'disconnected',
      color: 'bg-orange-500'
    }
  ]

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

        {/* Status Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-sm font-medium text-slate-600">Connected</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">0</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
              <span className="text-sm font-medium text-slate-600">Available</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{integrations.length}</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <div className="flex items-center">
              <Settings className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-sm font-medium text-slate-600">Total</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{integrations.length}</p>
          </div>
        </div>

        {/* Available Integrations */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Available Integrations</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => (
              <div key={integration.name} className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{integration.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{integration.name}</h3>
                      <div className="flex items-center mt-1">
                        <div className="h-2 w-2 rounded-full bg-slate-400 mr-2"></div>
                        <span className="text-sm text-slate-500">Not connected</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-slate-600 mb-4">{integration.description}</p>
                
                <button
                  onClick={() => alert(`${integration.name} integration coming soon!`)}
                  className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-700 mb-4">
            Follow our step-by-step guides to connect your business tools and start getting insights.
          </p>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View Integration Guides →
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}