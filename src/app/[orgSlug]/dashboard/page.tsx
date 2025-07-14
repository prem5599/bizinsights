// src/app/[orgSlug]/dashboard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { MetricsCards } from '@/components/dashboard/MetricsCards'
import { InsightsPanel } from '@/components/dashboard/InsightsPanel'
import { RevenueChart } from '@/components/dashboard/RevenueChart'
import { IntegrationStatus } from '@/components/dashboard/IntegrationStatus'
import { useDashboardData } from '@/hooks/useDashboardData'
import { 
  BarChart3,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  Settings,
  Plus,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Users,
  DollarSign,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Organization {
  id: string
  name: string
  slug: string
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: () => void
  color: 'blue' | 'green' | 'purple' | 'orange'
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [orgLoading, setOrgLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [showInsights, setShowInsights] = useState(true)

  const orgSlug = params.orgSlug as string

  // Use our dashboard data hook
  const { 
    data: dashboardData, 
    loading: dataLoading, 
    error: dataError, 
    refetch: refetchData,
    markInsightAsRead 
  } = useDashboardData(organization?.id)

  // Fetch organization data
  useEffect(() => {
    const fetchOrganization = async () => {
      if (!session?.user?.id || !orgSlug) return

      try {
        setOrgLoading(true)
        
        // First try to find organization by slug
        const response = await fetch(`/api/organizations/by-slug/${orgSlug}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const orgData = await response.json()
          setOrganization(orgData)
        } else if (response.status === 404) {
          // Organization not found or user doesn't have access
          router.push('/organizations')
        } else {
          throw new Error('Failed to load organization')
        }
      } catch (err) {
        console.error('Failed to fetch organization:', err)
        router.push('/organizations')
      } finally {
        setOrgLoading(false)
      }
    }

    fetchOrganization()
  }, [session?.user?.id, orgSlug, router])

  // Handle period changes
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    // Optionally refetch data with new period
    // This would require updating the hook to accept period parameter
  }

  // Handle integration refresh
  const handleRefreshIntegration = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
      })

      if (response.ok) {
        // Refresh dashboard data
        refetchData()
      }
    } catch (error) {
      console.error('Failed to refresh integration:', error)
    }
  }

  // Navigation handlers
  const handleManageIntegrations = () => {
    router.push(`/${orgSlug}/integrations`)
  }

  const handleViewAllInsights = () => {
    router.push(`/${orgSlug}/insights`)
  }

  const handleViewReports = () => {
    router.push(`/${orgSlug}/reports`)
  }

  // Quick actions
  const quickActions: QuickAction[] = [
    {
      id: 'add-integration',
      title: 'Add Integration',
      description: 'Connect a new business tool',
      icon: <Plus className="h-5 w-5" />,
      action: handleManageIntegrations,
      color: 'blue'
    },
    {
      id: 'generate-report',
      title: 'Generate Report',
      description: 'Create a custom business report',
      icon: <BarChart3 className="h-5 w-5" />,
      action: handleViewReports,
      color: 'green'
    },
    {
      id: 'view-insights',
      title: 'View All Insights',
      description: 'See all AI-generated insights',
      icon: <TrendingUp className="h-5 w-5" />,
      action: handleViewAllInsights,
      color: 'purple'
    },
    {
      id: 'team-settings',
      title: 'Team Settings',
      description: 'Manage team members and permissions',
      icon: <Users className="h-5 w-5" />,
      action: () => router.push(`/${orgSlug}/team`),
      color: 'orange'
    }
  ]

  // Period options
  const periodOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ]

  if (orgLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96"></div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!organization) {
    return (
      <DashboardLayout>
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Organization not found
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>The organization you're looking for doesn't exist or you don't have access to it.</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/organizations')}
                  className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Go to Organizations
                </button>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8">
        
        {/* Page Header */}
        <div className="border-b border-gray-200 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Overview of your business performance and key metrics
                <span className="ml-2 text-gray-400">• {organization.name}</span>
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Period Selector */}
              <select 
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="rounded-lg border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}  
              <button
                onClick={() => refetchData()}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className="h-5 w-5 text-gray-600" /> 
              </button>

              {/* Settings Button */}
              <button
                onClick={() => router.push(`/${orgSlug}/settings`)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-gray-600" />  
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              className={cn(
                "flex items-center p-4 rounded-lg shadow-sm transition-colors",
                action.color === 'blue' && 'bg-blue-50 hover:bg-blue-100',
                action.color === 'green' && 'bg-green-50 hover:bg-green-100',
                action.color === 'purple' && 'bg-purple-50 hover:bg-purple-100',
                action.color === 'orange' && 'bg-orange-50 hover:bg-orange-100'
              )}
            >
              <div className="flex-shrink-0 text-gray-600">
                {action.icon}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900">
                  {action.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {action.description}
                </p>
              </div>
            </button>
          ))} 
        </div>
        {/* Metrics Cards */}
        <MetricsCards 
          data={dashboardData?.metrics} 
          loading={dataLoading} 
          error={dataError}
        />

        {/* Revenue Chart */}
        <RevenueChart 
          data={dashboardData?.revenueData} 
          loading={dataLoading} 
          error={dataError} 
          selectedPeriod={selectedPeriod}
        />

        {/* Integration Status */}  
        <IntegrationStatus 
          integrations={dashboardData?.integrations} 
          loading={dataLoading} 
          onRefresh={handleRefreshIntegration}
        />

        {/* Insights Panel */}
        {showInsights && (
          <InsightsPanel 
            insights={dashboardData?.insights} 
            loading={dataLoading} 
            error={dataError} 
            onMarkAsRead={markInsightAsRead}
            onViewAll={handleViewAllInsights}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
