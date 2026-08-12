// components/dashboard/Sidebar.tsx

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Upload,
  PieChart,
  Wallet,
  Settings,
  LogOut,
  User,
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SidebarProps {
  isMobile?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ isMobile = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }

    // Load user
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      }
    }
    loadUser()
  }, [])

  // Save collapsed state and notify
  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState))
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'sidebar-collapsed',
      newValue: JSON.stringify(newState)
    }))
  }

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Upload, label: 'Upload', href: '/upload' },
    { icon: PieChart, label: 'Categories', href: '/categories' },
    { icon: Wallet, label: 'Budget', href: '/budget' },
    { icon: TrendingUp, label: 'Transaction & Insights', href: '/insights' },
    { icon: AlertTriangle, label: 'Anomalies', href: '/anomalies' },
  ]

  const sidebarWidth = isCollapsed ? 'w-sidebar-collapsed' : 'w-sidebar-expanded'

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-card lg:hidden"
        >
          <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-navy" />
        </button>

        {/* Mobile Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`fixed top-0 left-0 h-full bg-navy text-white z-50 transition-transform duration-300 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          } w-72 sm:w-80 overflow-y-auto custom-scrollbar`}
        >
          <div className="flex flex-col h-full p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg sm:text-xl text-orange-500">FinSentry</span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Navigation */}
            <div className="flex-1 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-electric-blue text-white shadow-lg'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="text-sm sm:text-base">{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Bottom */}
            <div className="border-t border-white/10 pt-4 space-y-2">
              <Link
                href="/settings"
                onClick={() => setIsMobileOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-sm sm:text-base"
              >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
                Settings
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Desktop sidebar
  return (
    <div
      className={`fixed left-0 top-0 h-full bg-navy text-white transition-all duration-300 z-40 ${
        isCollapsed ? 'w-[72px]' : 'w-[240px]'
      } shadow-card-dark`}
    >
      <div className="flex flex-col h-full">
        {/* Logo and Toggle */}
        <div className="flex items-center justify-between px-3 h-16 border-b border-white/10">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-bold text-base whitespace-nowrap text-orange-500 animate-fade-in">
                FinSentry
              </span>
            </div>
          )}
          {isCollapsed && (
            <span className="text-xl mx-auto text-orange-500">FS</span>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-electric-blue text-white shadow-lg'
                    : 'hover:bg-white/10'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm whitespace-nowrap animate-fade-in">
                    {item.label}
                  </span>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-navy text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions - Updated with Settings */}
        <div className="border-t border-white/10 px-2 py-4 space-y-1">
          {/* Settings - Replaces notifications, help, and user */}
          <Link
            href="/settings"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm flex-1 text-left animate-fade-in">
                Settings
              </span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-navy text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Settings
              </div>
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}