'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveOrganization = async () => {
    try {
      setIsSaving(true)
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Organization settings saved')
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true)
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Notification preferences saved')
    } catch (error) {
      toast.error('Failed to save notification settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveSecurity = async () => {
    try {
      setIsSaving(true)
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Security settings saved')
    } catch (error) {
      toast.error('Failed to save security settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteOrganization = async () => {
    try {
      // Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Organization deleted')
      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast.error('Failed to delete organization')
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
      toast.success('Logo uploaded successfully')
    } catch (error) {
      toast.error('Failed to upload logo')
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organization" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Organization</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Billing</span>
          </TabsTrigger>
        </TabsList>

        {/* Organization Settings */}
        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Information</CardTitle>
              <CardDescription>
                Update your organization's basic information and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={orgSettings.logo} />
                  <AvatarFallback>
                    <Building2 className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="logo" className="cursor-pointer">
                    <div className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-500">
                      <Upload className="h-4 w-4" />
                      <span>Upload Logo</span>
                    </div>
                  </Label>
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

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">URL Slug</Label>
                  <Input
                    id="org-slug"
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={orgSettings.description}
                  onChange={(e) => setOrgSettings(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of your organization"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={orgSettings.website}
                    onChange={(e) => setOrgSettings(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://yourcompany.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={orgSettings.industry} onValueChange={(value) => setOrgSettings(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="retail">Retail</SelectItem>
                      <SelectItem value="healthcare">Healthcare</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-size">Company Size</Label>
                  <Select value={orgSettings.size} onValueChange={(value) => setOrgSettings(prev => ({ ...prev, size: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      <SelectItem value="201-500">201-500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={orgSettings.timezone} onValueChange={(value) => setOrgSettings(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveOrganization} disabled={isSaving}>
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
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure when and how you receive email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Weekly Reports</Label>
                    <p className="text-sm text-gray-500">
                      Receive weekly performance summaries every Monday
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyDigest}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, weeklyDigest: checked }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Monthly Reports</Label>
                    <p className="text-sm text-gray-500">
                      Comprehensive monthly business insights
                    </p>
                  </div>
                  <Switch
                    checked={notifications.monthlyReports}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, monthlyReports: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Anomaly Alerts</Label>
                    <p className="text-sm text-gray-500">
                      Get notified when unusual patterns are detected
                    </p>
                  </div>
                  <Switch
                    checked={notifications.anomalyAlerts}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, anomalyAlerts: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Team Updates</Label>
                    <p className="text-sm text-gray-500">
                      Notifications about team member activity
                    </p>
                  </div>
                  <Switch
                    checked={notifications.teamUpdates}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, teamUpdates: checked }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Integration Notifications</h4>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Slack Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Send alerts to your Slack workspace
                    </p>
                  </div>
                  <Switch
                    checked={notifications.slackNotifications}
                    onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, slackNotifications: checked }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={isSaving}>
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
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security & Access</CardTitle>
              <CardDescription>
                Manage your account security and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {security.twoFactorEnabled && (
                      <Badge variant="secondary" className="text-green-600 bg-green-50">
                        <Check className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    )}
                    <Switch
                      checked={security.twoFactorEnabled}
                      onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, twoFactorEnabled: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session-timeout">Session Timeout</Label>
                  <Select 
                    value={security.sessionTimeout.toString()} 
                    onValueChange={(value) => setSecurity(prev => ({ ...prev, sessionTimeout: parseInt(value) }))}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="168">7 days</SelectItem>
                      <SelectItem value="720">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Automatically log out users after period of inactivity
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Automatic API Key Rotation</Label>
                    <p className="text-sm text-gray-500">
                      Rotate API keys automatically every 90 days
                    </p>
                  </div>
                  <Switch
                    checked={security.apiKeyRotation}
                    onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, apiKeyRotation: checked }))}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-medium">API Access</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current API Key</span>
                    <Button variant="outline" size="sm">
                      Regenerate
                    </Button>
                  </div>
                  <code className="text-xs bg-white p-2 rounded border block">
                    biz_sk_test_1234...7890
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    Last used: 2 hours ago
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity} disabled={isSaving}>
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
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>
                Manage your subscription plan and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Plan */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Pro Plan</h3>
                    <p className="text-sm text-gray-600">
                      Perfect for growing businesses
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Current Plan</Badge>
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
                  <Button variant="outline">Change Plan</Button>
                  <Button variant="outline">Manage Billing</Button>
                </div>
              </div>

              {/* Usage */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Current Usage</h4>
                
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
                <h4 className="text-sm font-medium">Payment Method</h4>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-8 w-8 text-gray-400" />
                      <div>
                        <p className="font-medium">•••• •••• •••• 4242</p>
                        <p className="text-sm text-gray-500">Expires 12/27</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Update</Button>
                  </div>
                </div>
              </div>

              {/* Billing History */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Billing History</h4>
                <div className="space-y-2">
                  {[
                    { date: 'Jul 10, 2025', amount: '$29.00', status: 'Paid' },
                    { date: 'Jun 10, 2025', amount: '$29.00', status: 'Paid' },
                    { date: 'May 10, 2025', amount: '$29.00', status: 'Paid' }
                  ].map((invoice, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{invoice.date}</p>
                          <p className="text-xs text-gray-500">Monthly subscription</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">{invoice.amount}</span>
                        <Badge variant="secondary" className="text-green-600 bg-green-50">
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-red-600">Delete Organization</h4>
                  <p className="text-sm text-gray-600">
                    Permanently delete this organization and all its data
                  </p>
                </div>
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center space-x-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        <span>Delete Organization</span>
                      </DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. This will permanently delete your organization
                        and remove all data associated with it.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm">
                        Please type <strong>{orgSettings.name}</strong> to confirm:
                      </p>
                      <Input className="mt-2" placeholder="Organization name" />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteOrganization}>
                        I understand, delete organization
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}