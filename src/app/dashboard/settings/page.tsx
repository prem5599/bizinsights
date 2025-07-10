// src/app/dashboard/settings/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Building2, 
  Bell, 
  Shield, 
  CreditCard, 
  Trash2, 
  Upload, 
  Save,
  AlertTriangle,
  Check,
  X,
  Mail,
  Calendar,
  Globe,
  Lock
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface OrganizationSettings {
  name: string
  slug: string
  description: string
  website: string
  industry: string
  size: string
  timezone: string
  logo?: string
}

interface NotificationSettings {
  emailReports: boolean
  slackNotifications: boolean
  anomalyAlerts: boolean
  weeklyDigest: boolean
  monthlyReports: boolean
  teamUpdates: boolean
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeout: number
  ipWhitelist: string[]
  apiKeyRotation: boolean
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('organization')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)

  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: '',
    slug: '',
    description: '',
    website: '',
    industry: '',
    size: '',
    timezone: '',
    logo: ''
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailReports: true,
    slackNotifications: false,
    anomalyAlerts: true,
    weeklyDigest: true,
    monthlyReports: true,
    teamUpdates: false
  })

  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 24,
    ipWhitelist: [],
    apiKeyRotation: false
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      // Mock data - replace with actual API calls
      setOrgSettings({
        name: 'BizInsights Demo',
        slug: 'bizinsights-demo',
        description: 'Analytics platform for small businesses',
        website: 'https://bizinsights.com',
        industry: 'technology',
        size: '11-50',
        timezone: 'America/New_York',
        logo: '/logo.png'
      })
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      // In a real app we'd use the toast library here
      console.log('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveOrganization = async () => {
    try {
      setIsSaving(true)
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Organization settings saved')
    } catch (error) {
      console.log('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true)
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Notification preferences saved')
    } catch (error) {
      console.log('Failed to save notification settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSecurity = async () => {
    try {
      setIsSaving(true)
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Security settings saved')
    } catch (error) {
      console.log('Failed to save security settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOrganization = async () => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      console.log('Organization deleted')
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.log('Failed to delete organization')
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
    )
  }

  return (
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
                  <label htmlFor="logo" className="cursor-pointer">
                    <div className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-500">
                      <Upload className="h-4 w-4" />
                      <span>Upload Logo</span>
                    </div>
                  </label>
                  <input
                    id="logo"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">Organization Name</label>
                  <input
                    id="org-name"
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="org-slug" className="block text-sm font-medium text-gray-700">URL Slug</label>
                  <input
                    id="org-slug"
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={orgSettings.slug}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="your-company"
                  />
                  <p className="text-xs text-gray-500">
                    bizinsights.com/{orgSettings.slug}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  id="description"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  value={orgSettings.description}
                  onChange={(e) => setOrgSettings(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of your organization"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">Website</label>
                  <input
                    id="website"
                    type="url"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={orgSettings.website}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourcompany.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="industry" className="block text-sm font-medium text-gray-700">Industry</label>
                  <select
                    id="industry"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={orgSettings.industry}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, industry: e.target.value }))}
                  >
                    <option value="">Select industry</option>
                    <option value="technology">Technology</option>
                    <option value="retail">Retail</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="finance">Finance</option>
                    <option value="education">Education</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="company-size" className="block text-sm font-medium text-gray-700">Company Size</label>
                  <select
                    id="company-size"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={orgSettings.size}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, size: e.target.value }))}
                  >
                    <option value="">Select company size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">Timezone</label>
                  <select
                    id="timezone"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={orgSettings.timezone}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  >
                    <option value="">Select timezone</option>
                    <option value="America/New_York">Eastern Time (EST)</option>
                    <option value="America/Chicago">Central Time (CST)</option>
                    <option value="America/Denver">Mountain Time (MST)</option>
                    <option value="America/Los_Angeles">Pacific Time (PST)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Europe/Paris">Paris (CET)</option>
                    <option value="Asia/Tokyo">Tokyo (JST)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveOrganization}
                  disabled={isSaving}
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

        {/* Notification Settings */}
        {activeTab === 'notifications' && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Email Notifications</h3>
              <p className="mt-1 text-sm text-gray-500">
                Configure when and how you receive email notifications
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium text-gray-900">Weekly Reports</label>
                    <p className="text-sm text-gray-500">
                      Receive weekly performance summaries every Monday
                    </p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id="weekly-digest"
                      checked={notifications.weeklyDigest}
                      onChange={(e) => setNotifications(prev => ({ ...prev, weeklyDigest: e.target.checked }))}
                      className="sr-only"
                    />
                    <label
                      htmlFor="weekly-digest"
                      className={cn(
                        "block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out",
                        notifications.weeklyDigest ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out",
                          notifications.weeklyDigest ? "translate-x-4" : "translate-x-0"
                        )}
                      ></span>
                    </label>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium text-gray-900">Monthly Reports</label>
                    <p className="text-sm text-gray-500">
                      Comprehensive monthly business insights
                    </p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id="monthly-reports"
                      checked={notifications.monthlyReports}
                      onChange={(e) => setNotifications(prev => ({ ...prev, monthlyReports: e.target.checked }))}
                      className="sr-only"
                    />
                    <label
                      htmlFor="monthly-reports"
                      className={cn(
                        "block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out",
                        notifications.monthlyReports ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out",
                          notifications.monthlyReports ? "translate-x-4" : "translate-x-0"
                        )}
                      ></span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium text-gray-900">Anomaly Alerts</label>
                    <p className="text-sm text-gray-500">
                      Get notified when unusual patterns are detected
                    </p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id="anomaly-alerts"
                      checked={notifications.anomalyAlerts}
                      onChange={(e) => setNotifications(prev => ({ ...prev, anomalyAlerts: e.target.checked }))}
                      className="sr-only"
                    />
                    <label
                      htmlFor="anomaly-alerts"
                      className={cn(
                        "block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out",
                        notifications.anomalyAlerts ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out",
                          notifications.anomalyAlerts ? "translate-x-4" : "translate-x-0"
                        )}
                      ></span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium text-gray-900">Team Updates</label>
                    <p className="text-sm text-gray-500">
                      Notifications about team member activity
                    </p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id="team-updates"
                      checked={notifications.teamUpdates}
                      onChange={(e) => setNotifications(prev => ({ ...prev, teamUpdates: e.target.checked }))}
                      className="sr-only"
                    />
                    <label
                      htmlFor="team-updates"
                      className={cn(
                        "block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out",
                        notifications.teamUpdates ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out",
                          notifications.teamUpdates ? "translate-x-4" : "translate-x-0"
                        )}
                      ></span>
                    </label>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Integration Notifications</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium text-gray-900">Slack Notifications</label>
                    <p className="text-sm text-gray-500">
                      Send alerts to your Slack workspace
                    </p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id="slack-notifications"
                      checked={notifications.slackNotifications}
                      onChange={(e) => setNotifications(prev => ({ ...prev, slackNotifications: e.target.checked }))}
                      className="sr-only"
                    />
                    <label
                      htmlFor="slack-notifications"
                      className={cn(
                        "block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out",
                        notifications.slackNotifications ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out",
                          notifications.slackNotifications ? "translate-x-4" : "translate-x-0"
                        )}
                      ></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveNotifications}
                  disabled={isSaving}
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Security & Access</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage your account security and access controls
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium text-gray-900">Two-Factor Authentication</label>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {security.twoFactorEnabled && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check className="h-3 w-3 mr-1" />
                        Enabled
                      </span>
                    )}
                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                      <input 
                        type="checkbox" 
                        id="two-factor"
                        checked={security.twoFactorEnabled}
                        onChange={(e) => setSecurity(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                        className="sr-only"
                      />
                      <label
                        htmlFor="two-factor"
                        className={cn(
                          "block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out",
                          security.twoFactorEnabled ? "bg-blue-600" : "bg-gray-200"
                        )}
                      >
                        <span
                          className={cn(
                            "block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out",
                            security.twoFactorEnabled ? "translate-x-4" : "translate-x-0"
                          )}
                        ></span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="session-timeout" className="block text-sm font-medium text-gray-700">Session Timeout</label>
                  <select
                    id="session-timeout"
                    className="mt-1 block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={security.sessionTimeout.toString()}
                    onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                  >
                    <option value="1">1 hour</option>
                    <option value="8">8 hours</option>
                    <option value="24">24 hours</option>
                    <option value="168">7 days</option>
                    <option value="720">30 days</option>
                  </select>
                  <p className="text-xs text-gray-500">
                    Automatically log out users after period of inactivity
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-base font-medium text-gray-900">Automatic API Key Rotation</label>
                    <p className="text-sm text-gray-500">
                      Rotate API keys automatically every 90 days
                    </p>
                  </div>
                  <div className="relative inline-block w-10 mr-2 align-middle select-none">
                    <input 
                      type="checkbox" 
                      id="api-key-rotation"
                      checked={security.apiKeyRotation}
                      onChange={(e) => setSecurity(prev => ({ ...prev, apiKeyRotation: e.target.checked }))}
                      className="sr-only"
                    />
                    <label
                      htmlFor="api-key-rotation"
                      className={cn(
                        "block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out",
                        security.apiKeyRotation ? "bg-blue-600" : "bg-gray-200"
                      )}
                    >
                      <span
                        className={cn(
                          "block h-6 w-6 rounded-full bg-white shadow transform transition-transform duration-200 ease-in-out",
                          security.apiKeyRotation ? "translate-x-4" : "translate-x-0"
                        )}
                      ></span>
                    </label>
                  </div>
                </div>
              </div>

              <hr className="border-gray-200" />

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">API Access</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Current API Key</span>
                    <button
                      type="button"
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Regenerate
                    </button>
                  </div>
                  <div className="bg-white p-2 rounded border block">
                    <code className="text-xs">biz_sk_test_1234...7890</code>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Last used: 2 hours ago
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSecurity}
                  disabled={isSaving}
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Security Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing Settings */}
        {activeTab === 'billing' && (
          <>
            <div className="bg-white shadow-sm rounded-lg border border-gray-200">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Subscription & Billing</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your subscription plan and billing information
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6 space-y-6">
                {/* Current Plan */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Pro Plan</h3>
                      <p className="text-sm text-gray-600">
                        Perfect for growing businesses
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Current Plan
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="font-semibold">$29/month</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Data Sources</p>
                      <p className="font-semibold">3 integrations</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Team Members</p>
                      <p className="font-semibold">Up to 5 users</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Next Billing</p>
                      <p className="font-semibold">Aug 10, 2025</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Change Plan
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Manage Billing
                    </button>
                  </div>
                </div>

                {/* Usage */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Current Usage</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Data Sources</span>
                        <span>2 of 3 used</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '66%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Team Members</span>
                        <span>3 of 5 used</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>API Calls</span>
                        <span>8,432 of 50,000 used</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '17%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Payment Method</h4>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CreditCard className="h-8 w-8 text-gray-400" />
                        <div>
                          <p className="font-medium">•••• •••• •••• 4242</p>
                          <p className="text-sm text-gray-500">Expires 12/27</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                </div>

                {/* Billing History */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Billing History</h4>
                  <div className="space-y-2">
                    {[
                      { date: 'Jul 10, 2025', amount: '$29.00', status: 'Paid' },
                      { date: 'Jun 10, 2025', amount: '$29.00', status: 'Paid' },
                      { date: 'May 10, 2025', amount: '$29.00', status: 'Paid' }
                    ].map((invoice, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{invoice.date}</p>
                            <p className="text-xs text-gray-500">Monthly subscription</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{invoice.amount}</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white shadow-sm rounded-lg border border-red-200">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium leading-6 text-red-600">Danger Zone</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Irreversible and destructive actions
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-red-600">Delete Organization</h4>
                    <p className="text-sm text-gray-600">
                      Permanently delete this organization and all its data
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete confirmation dialog */}
        {isDeleteDialogOpen && (
          <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Delete Organization
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          This action cannot be undone. This will permanently delete your organization
                          and remove all data associated with it.
                        </p>
                        <div className="mt-4">
                          <p className="text-sm">
                            Please type <strong>{orgSettings.name}</strong> to confirm:
                          </p>
                          <input
                            type="text"
                            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            placeholder="Organization name"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleDeleteOrganization}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    I understand, delete organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}