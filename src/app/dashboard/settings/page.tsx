// src/app/dashboard/settings/pageComplete.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  Building2, 
  Bell, 
  Shield, 
  CreditCard, 
  Upload, 
  Globe, 
  Clock, 
  Check,
  Key,
  Mail,
  Phone,
  Lock,
  CreditCard as CardIcon,
  Download,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useCurrencyContext } from '@/contexts/CurrencyContext'

interface OrganizationSettings {
  name: string
  email: string
  website: string
  phone: string
  address: string
  timezone: string
  logo: string | null
  industry: string
  companySize: string
}

const SUPPORTED_CURRENCIES = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' }
]

export default function CompleteSettingsPage() {
  const [activeTab, setActiveTab] = useState('organization')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const { currency, setCurrency, formatCurrency } = useCurrencyContext()
  
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: 'BizInsights India',
    email: 'admin@bizinsights.in',
    website: 'https://bizinsights.in',
    phone: '+91 98765 43210',
    address: 'Mumbai, Maharashtra, India',
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
    integrationUpdates: true,
    marketingEmails: false,
    securityAlerts: true
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: false,
    passwordLastChanged: '30 days ago',
    activeSessions: 3,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [billingInfo, setBillingInfo] = useState({
    currentPlan: 'Free',
    billingCycle: 'monthly',
    nextBilling: '2024-02-15',
    paymentMethod: '**** **** **** 1234',
    billingAddress: 'Same as organization address'
  })

  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1000)
  }, [])

  const handleSaveOrganization = async () => {
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      console.log('Organization settings saved:', orgSettings)
      alert('Organization settings saved successfully!')
    } catch (error) {
      console.error('Failed to save settings')
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Notification settings saved:', notificationSettings)
      alert('Notification preferences saved!')
    } catch (error) {
      console.error('Failed to save notifications')
      alert('Failed to save notification preferences')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCurrencyChange = async (newCurrency: string) => {
    try {
      await setCurrency(newCurrency)
      alert(`Currency changed to ${newCurrency}. This will reflect across all pages.`)
    } catch (error) {
      console.error('Failed to update currency:', error)
      alert('Failed to update currency')
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB')
      return
    }

    try {
      const formData = new FormData()
      formData.append('logo', file)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setOrgSettings(prev => ({ ...prev, logo: URL.createObjectURL(file) }))
      alert('Logo uploaded successfully!')
    } catch (error) {
      console.error('Failed to upload logo')
      alert('Failed to upload logo')
    }
  }

  const handlePasswordChange = async () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    if (securitySettings.newPassword.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      alert('Password changed successfully!')
      setSecuritySettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        passwordLastChanged: 'Just now'
      }))
    } catch (error) {
      alert('Failed to change password')
    } finally {
      setIsSaving(false)
    }
  }

  const toggle2FA = async () => {
    setIsSaving(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSecuritySettings(prev => ({
        ...prev,
        twoFactorEnabled: !prev.twoFactorEnabled
      }))
      alert(`Two-factor authentication ${!securitySettings.twoFactorEnabled ? 'enabled' : 'disabled'}`)
    } catch (error) {
      alert('Failed to update two-factor authentication')
    } finally {
      setIsSaving(false)
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
        {/* Header */}
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

              {/* Currency & Regional Settings */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Currency & Regional Settings
                </h3>
                
                {/* Currency Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Primary Currency
                  </label>
                  <p className="text-sm text-gray-500 mb-4">
                    This currency will be used for all revenue calculations and reports across the entire application.
                    <br />
                    <span className="font-medium">Current example: {formatCurrency(10000)}</span>
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <button
                        key={curr.code}
                        onClick={() => handleCurrencyChange(curr.code)}
                        className={`relative flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors ${
                          currency === curr.code
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <span className="text-xl">{curr.flag}</span>
                          <div className="text-left">
                            <div className="font-medium text-sm">{curr.code}</div>
                            <div className="text-xs text-gray-500">{curr.symbol}</div>
                          </div>
                          <div className="text-xs text-gray-600 flex-1">{curr.name}</div>
                        </div>
                        {currency === curr.code && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timezone */}
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

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Logo Upload */}
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

              {/* Currency Preview */}
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium mb-4">Currency Preview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sample Revenue:</span>
                    <span className="font-medium">{formatCurrency(125000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sample AOV:</span>
                    <span className="font-medium">{formatCurrency(450)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Large Amount:</span>
                    <span className="font-medium">{formatCurrency(2500000)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Current Currency:</span>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {SUPPORTED_CURRENCIES.find(c => c.code === currency)?.flag} {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-6">Notification Preferences</h3>
            <div className="space-y-6">
              {Object.entries(notificationSettings).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {key === 'emailNotifications' && 'Receive email notifications for important updates'}
                      {key === 'pushNotifications' && 'Get browser push notifications'}
                      {key === 'weeklyReports' && 'Weekly summary of your business metrics'}
                      {key === 'monthlyReports' && 'Monthly detailed analytics report'}
                      {key === 'alertThresholds' && 'Alerts when metrics exceed thresholds'}
                      {key === 'integrationUpdates' && 'Updates about your connected integrations'}
                      {key === 'marketingEmails' && 'Product updates and marketing content'}
                      {key === 'securityAlerts' && 'Important security and login alerts'}
                    </p>
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
              
              <div className="pt-4 border-t">
                <button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Notification Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            {/* Two-Factor Authentication */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Two-Factor Authentication</h3>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    2FA Status: {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Add an extra layer of security to your account with two-factor authentication
                  </p>
                </div>
                <button
                  onClick={toggle2FA}
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    securitySettings.twoFactorEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50`}
                >
                  {isSaving ? 'Processing...' : securitySettings.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                </button>
              </div>
            </div>

            {/* Password Change */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Change Password</h3>
              <p className="text-sm text-gray-600 mb-4">
                Last changed: {securitySettings.passwordLastChanged}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Password</label>
                  <div className="mt-1 relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={securitySettings.currentPassword}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <div className="mt-1 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={securitySettings.newPassword}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={securitySettings.confirmPassword}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <button
                  onClick={handlePasswordChange}
                  disabled={isSaving || !securitySettings.currentPassword || !securitySettings.newPassword || !securitySettings.confirmPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Active Sessions</h3>
              <p className="text-sm text-gray-600 mb-4">
                You have {securitySettings.activeSessions} active sessions across different devices
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">Current Session</div>
                    <div className="text-xs text-gray-500">Chrome on Windows • India</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Current
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">Mobile Session</div>
                    <div className="text-xs text-gray-500">Safari on iPhone • 2 hours ago</div>
                  </div>
                  <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                    Revoke
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="text-sm font-medium">Tablet Session</div>
                    <div className="text-xs text-gray-500">Chrome on iPad • 1 day ago</div>
                  </div>
                  <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                    Revoke
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <button className="text-red-600 hover:text-red-800 text-sm font-medium">
                  Revoke All Other Sessions
                </button>
              </div>
            </div>

            {/* Security Alerts */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Recent Security Activity</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2"></div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Successful login</div>
                    <div className="text-xs text-gray-500">Chrome on Windows • 2 minutes ago</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Password changed</div>
                    <div className="text-xs text-gray-500">30 days ago</div>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Email verification</div>
                    <div className="text-xs text-gray-500">45 days ago</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Current Plan</h3>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{billingInfo.currentPlan} Plan</h4>
                  <p className="text-gray-600">Perfect for getting started</p>
                  <div className="mt-2">
                    <span className="text-2xl font-bold text-green-600">{formatCurrency(0)}</span>
                    <span className="text-gray-500 ml-1">/ month</span>
                  </div>
                </div>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700">
                  Upgrade Plan
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h5 className="font-medium text-gray-900 mb-3">Plan Features</h5>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Up to 2 integrations
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Basic analytics
                  </li>
                  <li className="flex items-center text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mr-2" />
                    Email support
                  </li>
                  <li className="flex items-center text-sm text-gray-500">
                    <AlertTriangle className="h-4 w-4 text-gray-400 mr-2" />
                    Advanced AI insights (Pro feature)
                  </li>
                  <li className="flex items-center text-sm text-gray-500">
                    <AlertTriangle className="h-4 w-4 text-gray-400 mr-2" />
                    Custom reports (Pro feature)
                  </li>
                </ul>
              </div>
            </div>

            {/* Billing Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Billing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <CardIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-sm">{billingInfo.paymentMethod}</span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-auto">
                      Update
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label>
                  <select 
                    value={billingInfo.billingCycle}
                    onChange={(e) => setBillingInfo(prev => ({ ...prev, billingCycle: e.target.value }))}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly (Save 20%)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Billing Address</label>
                <p className="text-sm text-gray-600">{billingInfo.billingAddress}</p>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-1">
                  Update Address
                </button>
              </div>
            </div>

            {/* Billing History */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Billing History</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                  <div>
                    <div className="text-sm font-medium">Free Plan</div>
                    <div className="text-xs text-gray-500">Jan 15, 2024 - Current</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-green-600">{formatCurrency(0)}</span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No billing history available</p>
                  <p className="text-xs">Upgrade to a paid plan to see billing history</p>
                </div>
              </div>
            </div>

            {/* Usage & Limits */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Usage & Limits</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Integrations</span>
                    <span className="text-sm text-gray-600">1 / 2</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Data Points (This Month)</span>
                    <span className="text-sm text-gray-600">1,250 / 10,000</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '12.5%' }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">API Calls (This Month)</span>
                    <span className="text-sm text-gray-600">3,420 / 50,000</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '6.84%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white shadow rounded-lg p-6 border-l-4 border-red-500">
              <h3 className="text-lg font-medium mb-4 text-red-900">Danger Zone</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-red-900">Cancel Subscription</h4>
                    <p className="text-sm text-red-700">Cancel your current subscription and downgrade to free plan</p>
                  </div>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700">
                    Cancel Plan
                  </button>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t border-red-200">
                  <div>
                    <h4 className="text-sm font-medium text-red-900">Delete Account</h4>
                    <p className="text-sm text-red-700">Permanently delete your account and all associated data</p>
                  </div>
                  <button className="px-4 py-2 bg-red-700 text-white rounded-md text-sm font-medium hover:bg-red-800">
                    Delete Account
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