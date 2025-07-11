// src/components/layout/Header.tsx
'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { 
  Menu, 
  Bell, 
  Search, 
  ChevronDown, 
  Settings, 
  LogOut, 
  User,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const notifications = [
    {
      id: '1',
      title: 'Revenue increased by 15%',
      message: 'Your monthly revenue shows strong growth',
      time: '2h ago',
      read: false
    },
    {
      id: '2',
      title: 'New integration available',
      message: 'Connect your Shopify store for better insights',
      time: '1d ago',
      read: true
    }
  ]

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left side - Mobile menu button */}
          <div className="flex items-center">
            <button
              type="button"
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Search bar */}
            <div className="hidden md:block ml-4 lg:ml-0">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="block w-64 rounded-md border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Right side - Notifications and user menu */}
          <div className="flex items-center space-x-4">
            
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                className="relative rounded-full bg-white p-1 text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <h3 className="text-sm font-medium text-slate-900">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "px-4 py-3 hover:bg-slate-50 cursor-pointer",
                          !notification.read && "bg-blue-50"
                        )}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">
                              {notification.title}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400 ml-2">
                            {notification.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-100">
                    <button className="text-sm text-blue-600 hover:text-blue-500">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                type="button"
                className="flex items-center space-x-3 rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                  {session?.user?.image ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={session.user.image}
                      alt={session.user.name || ''}
                    />
                  ) : (
                    <User className="h-4 w-4 text-slate-500" />
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-700">
                    {session?.user?.name || 'User'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {session?.user?.email}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {/* User dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900">
                      {session?.user?.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {session?.user?.email}
                    </p>
                  </div>
                  
                  <a
                    href="/dashboard/settings"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </a>
                  
                  <a
                    href="/help"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <HelpCircle className="h-4 w-4 mr-3" />
                    Help & Support
                  </a>
                  
                  <div className="border-t border-slate-100">
                    <button
                      onClick={() => signOut()}
                      className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}