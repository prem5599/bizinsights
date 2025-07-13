// src/app/dashboard/reports/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Plus,
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Mail,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Report {
  id: string
  title: string
  description: string
  type: 'revenue' | 'customers' | 'products' | 'marketing' | 'custom'
  format: 'pdf' | 'excel' | 'csv'
  status: 'completed' | 'generating' | 'failed' | 'scheduled'
  createdAt: string
  completedAt?: string
  downloadUrl?: string
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  size?: string
  pages?: number
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  type: string
  icon: React.ReactNode
  estimatedTime: string
  dataPoints: string[]
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'scheduled' | 'templates'>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [generating, setGenerating] = useState<string | null>(null)

  // Mock report templates
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'revenue-summary',
      name: 'Revenue Summary',
      description: 'Comprehensive overview of revenue trends, top products, and growth metrics',
      type: 'revenue',
      icon: <DollarSign className="h-6 w-6 text-green-600" />,
      estimatedTime: '2-3 minutes',
      dataPoints: ['Revenue trends', 'Product performance', 'Regional breakdown', 'Payment methods']
    },
    {
      id: 'customer-analytics',
      name: 'Customer Analytics',
      description: 'Deep dive into customer behavior, acquisition, and lifetime value',
      type: 'customers',
      icon: <Users className="h-6 w-6 text-blue-600" />,
      estimatedTime: '3-4 minutes',
      dataPoints: ['Customer acquisition', 'Retention rates', 'Lifetime value', 'Demographics']
    },
    {
      id: 'product-performance',
      name: 'Product Performance',
      description: 'Analysis of product sales, inventory, and profitability',
      type: 'products',
      icon: <ShoppingCart className="h-6 w-6 text-purple-600" />,
      estimatedTime: '2-3 minutes',
      dataPoints: ['Sales volume', 'Profit margins', 'Inventory levels', 'Top performers']
    },
    {
      id: 'marketing-roi',
      name: 'Marketing ROI',
      description: 'Track marketing campaign effectiveness and return on investment',
      type: 'marketing',
      icon: <BarChart3 className="h-6 w-6 text-orange-600" />,
      estimatedTime: '4-5 minutes',
      dataPoints: ['Campaign performance', 'Channel effectiveness', 'Cost per acquisition', 'Attribution']
    }
  ]

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      fetchReports()
    } else if (status === 'unauthenticated') {
      setError('Please sign in to view reports')
      setLoading(false)
    }
  }, [session, status])

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Mock data
      const mockReports: Report[] = [
        {
          id: '1',
          title: 'Monthly Revenue Report - October 2024',
          description: 'Comprehensive revenue analysis for October including trends and forecasts',
          type: 'revenue',
          format: 'pdf',
          status: 'completed',
          createdAt: '2024-11-01T10:30:00Z',
          completedAt: '2024-11-01T10:33:00Z',
          downloadUrl: '/reports/monthly-revenue-oct-2024.pdf',
          size: '2.4 MB',
          pages: 12
        },
        {
          id: '2',
          title: 'Customer Analytics Dashboard',
          description: 'Weekly customer behavior and acquisition metrics',
          type: 'customers',
          format: 'excel',
          status: 'completed',
          createdAt: '2024-10-28T09:15:00Z',
          completedAt: '2024-10-28T09:18:00Z',
          downloadUrl: '/reports/customer-analytics-week43.xlsx',
          scheduleFrequency: 'weekly',
          size: '1.8 MB'
        },
        {
          id: '3',
          title: 'Product Performance Report',
          description: 'Q3 product sales and inventory analysis',
          type: 'products',
          format: 'pdf',
          status: 'generating',
          createdAt: '2024-11-01T14:20:00Z',
          estimatedTime: '2 minutes remaining'
        },
        {
          id: '4',
          title: 'Marketing ROI Analysis',
          description: 'Campaign effectiveness report for October',
          type: 'marketing',
          format: 'csv',
          status: 'failed',
          createdAt: '2024-10-31T16:45:00Z',
          error: 'Insufficient marketing data for analysis'
        }
      ]
      
      setReports(mockReports)
    } catch (error) {
      console.error('Error fetching reports:', error)
      setError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async (templateId: string) => {
    const template = reportTemplates.find(t => t.id === templateId)
    if (!template) return

    setGenerating(templateId)
    
    try {
      // Mock API call to generate report
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newReport: Report = {
        id: Date.now().toString(),
        title: `${template.name} - ${new Date().toLocaleDateString()}`,
        description: template.description,
        type: template.type as any,
        format: 'pdf',
        status: 'generating',
        createdAt: new Date().toISOString()
      }
      
      setReports(prev => [newReport, ...prev])
      
      // Simulate completion after a delay
      setTimeout(() => {
        setReports(prev => prev.map(report => 
          report.id === newReport.id 
            ? { ...report, status: 'completed' as const, completedAt: new Date().toISOString(), downloadUrl: `/reports/${template.id}-${Date.now()}.pdf` }
            : report
        ))
      }, 3000)
      
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setGenerating(null)
    }
  }

  const getStatusIcon = (status: Report['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'generating':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case 'scheduled':
        return <Clock className="h-5 w-5 text-orange-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: Report['status']) => {
    switch (status) {
      case 'completed': return 'Ready'
      case 'generating': return 'Generating...'
      case 'failed': return 'Failed'
      case 'scheduled': return 'Scheduled'
      default: return 'Unknown'
    }
  }

  const getTypeIcon = (type: Report['type']) => {
    switch (type) {
      case 'revenue': return <DollarSign className="h-4 w-4 text-green-600" />
      case 'customers': return <Users className="h-4 w-4 text-blue-600" />
      case 'products': return <ShoppingCart className="h-4 w-4 text-purple-600" />
      case 'marketing': return <BarChart3 className="h-4 w-4 text-orange-600" />
      default: return <FileText className="h-4 w-4 text-gray-600" />
    }
  }

  const filteredReports = reports.filter(report => {
    if (activeTab === 'scheduled') return report.scheduleFrequency
    if (selectedType !== 'all') return report.type === selectedType
    return true
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
              <p className="mt-2 text-sm text-gray-600">
                Generate and manage business reports with automated insights
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="revenue">Revenue</option>
                <option value="customers">Customers</option>
                <option value="products">Products</option>
                <option value="marketing">Marketing</option>
              </select>
              <button className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Report
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['all', 'scheduled', 'templates'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "py-2 px-1 border-b-2 font-medium text-sm",
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab === 'all' ? 'All Reports' : tab === 'scheduled' ? 'Scheduled' : 'Templates'}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'templates' ? (
          /* Report Templates */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {template.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {template.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {template.estimatedTime}
                      </div>
                      <button
                        onClick={() => handleGenerateReport(template.id)}
                        disabled={generating === template.id}
                        className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
                      >
                        {generating === template.id ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            Generating...
                          </>
                        ) : (
                          'Generate Report'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Reports List */
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
                <p className="text-gray-500 mb-4">
                  {activeTab === 'scheduled' 
                    ? 'No scheduled reports configured yet.' 
                    : 'Generate your first report to get started.'
                  }
                </p>
                <button 
                  onClick={() => setActiveTab('templates')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Browse Templates
                </button>
              </div>
            ) : (
              filteredReports.map((report) => (
                <div key={report.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(report.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {report.title}
                          </h3>
                          {report.scheduleFrequency && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {report.scheduleFrequency}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{report.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Created {new Date(report.createdAt).toLocaleDateString()}</span>
                          {report.size && <span>{report.size}</span>}
                          {report.pages && <span>{report.pages} pages</span>}
                          <span className="uppercase">{report.format}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(report.status)}
                        <span className="text-sm font-medium text-gray-700">
                          {getStatusText(report.status)}
                        </span>
                      </div>
                      {report.status === 'completed' && report.downloadUrl && (
                        <button className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}