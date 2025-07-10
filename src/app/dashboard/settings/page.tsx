// src/app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { 
  Building2, 
  Bell, 
  Shield, 
  CreditCard, 
  Upload, 
  Save,
  Trash2,
  Mail,
  Lock,
  Globe,
  Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OrganizationSettings {
  name: string
  website: string
  industry: string
  timezone: string
  currency: string
  logo?: string
}

interface NotificationSettings {
  email: {
    insights: boolean
    reports: boolean
    alerts: boolean
    updates: boolean
  }
  browser: {
    enabled: boolean
    insights: boolean
    reports: boolean
  }
}

interface SecuritySettings {
  twoFactorAuth: boolean
  sessionTimeout: number
  ipWhitelist: string[]
  lastPasswordChange: string
}

interface BillingInfo {
  plan: string
  status: string
  nextBilling: string
  usage: {
    integrations: number
    maxIntegrations: number
    dataPoints: number
    maxDataPoints: number
  }
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('organization')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: 'My Business',
    website: 'https://mybusiness.com',
    industry: 'E-commerce',
    timezone: 'America/New_York',
    currency: 'USD',
    logo: undefined
  })

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      insights: true,
      reports: true,
      alerts: true,
      updates: false
    },
    browser: {
      enabled: true,
      insights: true,
      reports: false
    }
  })

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorAuth: false,
    sessionTimeout: 720, // minutes
    ipWhitelist: [],
    lastPasswordChange: '2024-01-15'
  })

  const [billingInfo, setBillingInfo] = useState<BillingInfo>({
    plan: 'Free Plan',
    status: 'Active',
    nextBilling: '2024-08-10',
    usage: {
      integrations: 1,
      maxIntegrations: 3,
      dataPoints: 2450,
      maxDataPoints: 10000
    }
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveOrganization = async () => {
    try {
      setIsSaving(true)
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Organization settings saved successfully')
    } catch (error) {
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // Mock upload - replace with actual file upload logic
      const formData = new FormData()
      formData.append('logo', file)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setOrgSettings(prev => ({ ...prev, logo: URL.createObjectURL(file) }))
      console.log('Logo uploaded successfully')
    } catch (error) {
      console.log('Failed to upload logo')
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
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
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your organization preferences and configurations
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {[
              { id: 'organization', icon: <Building2 className="h-4 w-4 mr-2" />, label: 'Organization' },
              { id: 'notifications', icon: <Bell className="h-4 w-4 mr-2" />, label: 'Notifications' },
              { id: 'security', icon: <Shield className="h-4 w-4 mr-2" />, label: 'Security' },
              { id: 'billing', icon: <CreditCard className="h-4 w-4 mr-2" />, label: 'Billing' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm",
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content based on active tab */}
        <div className="space-y-6">
          {/* Organization Settings */}
          {activeTab === 'organization' && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Organization Information</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Update your organization's basic information and branding
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
                {/* Logo Upload */}
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                    {orgSettings.logo ? (
                      <img src={orgSettings.logo} alt="Organization logo" className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Organization Logo</h4>
                    <p className="text-sm text-gray-500">Upload a logo for your organization</p>
                    <label className="mt-2 cursor-pointer inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                      <input type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organization Name</label>
                    <input
                      type="text"
                      value={orgSettings.name}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Website</label>
                    <input
                      type="url"
                      value={orgSettings.website}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, website: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Industry</label>
                    <select
                      value={orgSettings.industry}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, industry: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="E-commerce">E-commerce</option>
                      <option value="SaaS">SaaS</option>
                      <option value="Retail">Retail</option>
                      <option value="Services">Services</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timezone</label>
                    <select
                      value={orgSettings.timezone}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, timezone: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency</label>
                    <select
                      value={orgSettings.currency}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, currency: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="CAD">CAD (C$)</option>
                    </select>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleSaveOrganization}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Notification Preferences</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure how and when you receive notifications
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
                {/* Email Notifications */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Notifications
                  </h4>
                  <div className="mt-4 space-y-4">
                    {Object.entries(notificationSettings.email).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium text-gray-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                          </label>
                          <p className="text-xs text-gray-500">
                            Receive email notifications for {key.toLowerCase()}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) => setNotificationSettings(prev => ({
                            ...prev,
                            email: { ...prev.email, [key]: e.target.checked }
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Browser Notifications */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center">
                    <Globe className="h-4 w-4 mr-2" />
                    Browser Notifications
                  </h4>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Enable Browser Notifications</label>
                        <p className="text-xs text-gray-500">Allow notifications in your browser</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings.browser.enabled}
                        onChange={(e) => setNotificationSettings(prev => ({
                          ...prev,
                          browser: { ...prev.browser, enabled: e.target.checked }
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    
                    {notificationSettings.browser.enabled && (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Insights</label>
                            <p className="text-xs text-gray-500">New insights and discoveries</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notificationSettings.browser.insights}
                            onChange={(e) => setNotificationSettings(prev => ({
                              ...prev,
                              browser: { ...prev.browser, insights: e.target.checked }
                            }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Reports</label>
                            <p className="text-xs text-gray-500">Report generation completion</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={notificationSettings.browser.reports}
                            onChange={(e) => setNotificationSettings(prev => ({
                              ...prev,
                              browser: { ...prev.browser, reports: e.target.checked }
                            }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Security Settings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your account security and access controls
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
                {/* Two-Factor Authentication */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      Two-Factor Authentication
                    </h4>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    {securitySettings.twoFactorAuth ? 'Disable' : 'Enable'}
                  </button>
                </div>

                {/* Session Timeout */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-sm font-medium text-gray-900">Session Timeout</h4>
                  <p className="text-sm text-gray-500 mb-4">Automatically log out after period of inactivity</p>
                  <select
                    value={securitySettings.sessionTimeout}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    className="block w-full max-w-xs border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={240}>4 hours</option>
                    <option value={480}>8 hours</option>
                    <option value={720}>12 hours</option>
                  </select>
                </div>

                {/* Password */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Password</h4>
                      <p className="text-sm text-gray-500">
                        Last changed: {new Date(securitySettings.lastPasswordChange).toLocaleDateString()}
                      </p>
                    </div>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Settings */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              {/* Current Plan */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Current Plan</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Manage your subscription and billing information
                  </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{billingInfo.plan}</h4>
                      <p className="text-sm text-gray-500">Status: {billingInfo.status}</p>
                      {billingInfo.plan !== 'Free Plan' && (
                        <p className="text-sm text-gray-500">Next billing: {billingInfo.nextBilling}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700">
                        {billingInfo.plan === 'Free Plan' ? 'Upgrade Plan' : 'Manage Subscription'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage */}
              <div className="bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Usage</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Current usage against your plan limits
                  </p>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
                  {/* Integrations Usage */}
                  <div>
                    <div className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Integrations</span>
                      <span>{billingInfo.usage.integrations} / {billingInfo.usage.maxIntegrations}</span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(billingInfo.usage.integrations / billingInfo.usage.maxIntegrations) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Data Points Usage */}
                  <div>
                    <div className="flex justify-between text-sm font-medium text-gray-700">
                      <span>Data Points (this month)</span>
                      <span>{billingInfo.usage.dataPoints.toLocaleString()} / {billingInfo.usage.maxDataPoints.toLocaleString()}</span>
                    </div>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${(billingInfo.usage.dataPoints / billingInfo.usage.maxDataPoints) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}