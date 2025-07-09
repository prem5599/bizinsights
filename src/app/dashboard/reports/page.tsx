// app/dashboard/reports/page.tsx
'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { FileText, Download, Calendar, Send } from 'lucide-react'

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center">
                <FileText className="h-8 w-8 text-green-500 mr-3" />
                Reports
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Generate and manage your business reports
              </p>
            </div>
            
            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
            <Calendar className="h-8 w-8 text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Weekly Report</h3>
            <p className="text-sm text-slate-600 mb-4">Get your weekly business performance summary</p>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              Generate →
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
            <FileText className="h-8 w-8 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Monthly Report</h3>
            <p className="text-sm text-slate-600 mb-4">Comprehensive monthly business analysis</p>
            <button className="text-green-600 hover:text-green-800 text-sm font-medium">
              Generate →
            </button>
          </div>

          <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
            <Send className="h-8 w-8 text-purple-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Email Reports</h3>
            <p className="text-sm text-slate-600 mb-4">Schedule automated email reports</p>
            <button className="text-purple-600 hover:text-purple-800 text-sm font-medium">
              Setup →
            </button>
          </div>
        </div>

        {/* Recent Reports */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Reports</h2>
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No reports yet</h3>
            <p className="text-slate-600">Generate your first report to see it here</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}