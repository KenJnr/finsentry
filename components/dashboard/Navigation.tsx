// components/dashboard/Navigation.tsx
'use client'

import { 
  Home, 
  Upload, 
  PieChart, 
  Wallet, 
  Settings, 
  Activity,
  LogOut,
  User,
  Bell
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export function Navigation() {
  const pathname = usePathname()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Upload, label: 'Upload', href: '/upload' },
    { icon: PieChart, label: 'Categories', href: '/categories' },
    { icon: Wallet, label: 'Budget', href: '/budget' },
    { icon: Activity, label: 'Analytics', href: '/analytics' },
  ]

  return (
    <nav className="bg-navy text-white h-screen w-20 fixed left-0 top-0 flex flex-col items-center py-6 shadow-lg">
      {/* Logo */}
      <div className="text-3xl mb-8 hover:scale-110 transition-transform cursor-pointer">
        💰
      </div>
      
      {/* Navigation Items */}
      <div className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`p-3 rounded-lg transition-all duration-200 relative group ${
                isActive 
                  ? 'bg-electric-blue text-white shadow-lg' 
                  : 'hover:bg-electric-blue/20'
              }`}
            >
              <item.icon size={24} />
              
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2 py-1 bg-navy text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
      
      {/* Bottom Actions */}
      <div className="mt-auto flex flex-col items-center gap-4">
        {/* Notifications */}
        <div className="relative cursor-pointer hover:text-electric-blue transition-colors">
          <Bell size={22} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
            3
          </span>
        </div>
        
        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-10 h-10 rounded-full bg-electric-blue/20 flex items-center justify-center hover:bg-electric-blue/30 transition-colors"
          >
            <User size={20} />
          </button>
          
          {isUserMenuOpen && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl py-2 min-w-40">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-navy">Kingsley Naab</p>
                <p className="text-xs text-gray-500">kingsley@email.com</p>
              </div>
              <button className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 text-left flex items-center gap-2">
                <Settings size={16} />
                Settings
              </button>
              <button className="w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50 text-left flex items-center gap-2">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}