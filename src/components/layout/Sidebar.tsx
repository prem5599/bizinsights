// components/layout/Sidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  BarChart3, 
  Settings, 
  Users, 
  PlusCircle, 
  Home,
  Lightbulb,
  FileText,
  X,
  ChevronDown,
  Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Insights', href: '/dashboard/insights', icon: Lightbulb },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Integrations', href: '/dashboard/integrations', icon: PlusCircle },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname()
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)

  // Sample organization data - in real app, this would come from context/props
  const currentOrg = {
    name: "My Business",
    plan: "Free Plan"
  }

  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-4 py-6 shadow-lg border-r border-slate-200">
      {/* Close button for mobile */}
      {onClose && (
        <div className="flex items-center justify-between lg:hidden">
          <h1 className="text-xl font-bold text-blue-600">BizInsights</h1>
          <button
            type="button"
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Logo for desktop */}
      <div className="hidden lg:flex lg:items-center">
        <h1 className="text-xl font-bold text-blue-600">BizInsights</h1>
      </div>

      {/* Organization selector */}
      <div className="relative">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
        >
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">
                {currentOrg.name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {currentOrg.plan}
              </p>
            </div>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-200",
            orgDropdownOpen && "rotate-180"
          )} />
        </button>

        {/* Organization dropdown */}
        {orgDropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
            <Link
              href="/dashboard/organizations"
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => setOrgDropdownOpen(false)}
            >
              Manage Organizations
            </Link>
            <Link
              href="/dashboard/organizations/new"
              className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
              onClick={() => setOrgDropdownOpen(false)}
            >
              Create Organization
            </Link>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
              onClick={onClose} // Close mobile sidebar when link is clicked
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200",
                  isActive 
                    ? "text-blue-600" 
                    : "text-slate-400 group-hover:text-slate-500"
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto pt-4 border-t border-slate-200">
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Lightbulb className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-blue-800">
                Upgrade to Pro
              </p>
              <p className="text-xs text-blue-600">
                Get advanced insights and unlimited integrations
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/dashboard/billing"
              className="block w-full rounded-md bg-blue-600 px-3 py-2 text-center text-xs font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Upgrade Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}