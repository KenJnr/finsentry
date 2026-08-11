// components/dashboard/QuickActions.tsx
'use client'

import { Upload, FileSpreadsheet, Download, PlusCircle, BarChart3, Settings } from 'lucide-react'
import Link from 'next/link'

interface QuickAction {
  icon: React.ElementType
  label: string
  href: string
  color: string
  description: string
}

export function QuickActions() {
  const actions: QuickAction[] = [
    {
      icon: Upload,
      label: 'Upload',
      href: '/upload',
      color: 'bg-electric-blue',
      description: 'Upload statement'
    },
    {
      icon: FileSpreadsheet,
      label: 'Summary',
      href: '/insights',
      color: 'bg-green-500',
      description: 'View overview'
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      href: '/insights',
      color: 'bg-purple-500',
      description: 'Deep dive'
    },
    {
      icon: PlusCircle,
      label: 'Budget',
      href: '/budget',
      color: 'bg-orange-500',
      description: 'Set budget'
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/settings',
      color: 'bg-gray-500',
      description: 'Preferences'
    }
  ]

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="subheading-responsive text-navy mb-3 sm:mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="group p-3 sm:p-4 rounded-lg border border-gray-100 hover:border-electric-blue hover:shadow-card transition-all duration-200 text-center"
          >
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full ${action.color} text-white flex items-center justify-center mx-auto mb-2 sm:mb-3 group-hover:scale-110 transition-transform`}>
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <p className="font-medium text-navy text-xs sm:text-sm">{action.label}</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 hidden sm:block">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}