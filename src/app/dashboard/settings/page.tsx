// src/app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Building2, Bell, Shield, CreditCard, Upload, Globe, Clock } from 'lucide-react'
// import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCurrency } from '@/hooks/useCurrency'
import { CurrencySelector } from '@/components/CurrencySelector'


interface OrganizationSettings {
  name: string
  email: string
  website: string
  phone: string
  address: string
  currency: string
  timezone: string
  logo: string | null
  industry: string
  companySize: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('organization')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { selectedCurrency, setCurrency } = useCurrency('INR')
  
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: 'BizInsights India',
    email: 'admin@bizinsights.in',
    website: 'https://bizinsights.in',
    phone: '+91 98765 43210',
    address: 'Mumbai, Maharashtra, India',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    logo: null,
    industry: 'E-commerce',
    companySize: '10-50'
  })

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: true,
    monthlyReports: true,
    alertThresholds: true,
    integrationUpdates: true
  })

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 1000)
  }, [])

  const handleSaveOrganization = async () => {
    setIsSaving(true)
    try {
      // Update currency in hook
      setCurrency(orgSettings.currency)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      console.log('Organization settings saved:', orgSettings)
    } catch (error) {
      console.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('logo', file)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setOrgSettings(prev => ({ ...prev, logo: URL.createObjectURL(file) }))
    } catch (error) {
      console.error('Failed to upload logo')
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
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your organization preferences and configurations
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'organization', icon: <Building2 className="h-4 w-4 mr-2" />, label: 'Organization' },
              { id: 'notifications', icon: <Bell className="h-4 w-4 mr-2" />, label: 'Notifications' },
              { id: 'security', icon: <Shield className="h-4 w-4 mr-2" />, label: 'Security' },
              { id: 'billing', icon: <CreditCard className="h-4 w-4 mr-2" />, label: 'Billing' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Organization Tab */}
        {activeTab === 'organization' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Basic Information</h3>
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
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={orgSettings.email}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, email: e.target.value }))}
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
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={orgSettings.phone}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, phone: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    value={orgSettings.address}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Regional Settings */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Regional Settings
                </h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Currency
                    </label>
                    <CurrencySelector
                      value={orgSettings.currency}
                      onChange={(currency) => setOrgSettings(prev => ({ ...prev, currency }))}
                      showFlag={true}
                      showFullName={false}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This will be used for all revenue calculations and reports
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      <Clock className="inline h-4 w-4 mr-1" />
                      Timezone
                    </label>
                    <select
                      value={orgSettings.timezone}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, timezone: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="Asia/Kolkata">India Standard Time (IST)</option>
                      <option value="America/New_York">Eastern Time (EST)</option>
                      <option value="America/Chicago">Central Time (CST)</option>
                      <option value="America/Denver">Mountain Time (MST)</option>
                      <option value="America/Los_Angeles">Pacific Time (PST)</option>
                      <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                      <option value="UTC">Coordinated Universal Time (UTC)</option>
                      <option value="Asia/Dubai">Gulf Standard Time (GST)</option>
                      <option value="Asia/Singapore">Singapore Time (SGT)</option>
                      <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Business Details</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Services">Services</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Education">Education</option>
                      <option value="Finance">Finance</option>
                      <option value="Real Estate">Real Estate</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company Size</label>
                    <select
                      value={orgSettings.companySize}
                      onChange={(e) => setOrgSettings(prev => ({ ...prev, companySize: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="1-10">1-10 employees</option>
                      <option value="10-50">10-50 employees</option>
                      <option value="50-200">50-200 employees</option>
                      <option value="200-1000">200-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveOrganization}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Organization Logo</h3>
                <div className="text-center">
                  {orgSettings.logo ? (
                    <img
                      src={orgSettings.logo}
                      alt="Organization logo"
                      className="mx-auto h-24 w-24 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="mx-auto h-24 w-24 rounded-lg bg-gray-200 flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Logo
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-6">Notification Preferences</h3>
            <div className="space-y-4">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </h4>
                  </div>
                  <button
                    onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !value }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      value ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}