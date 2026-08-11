// app/categories/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { CategoryManager } from '@/components/categories/CategoryManager'
import { CategoryRules } from '@/components/categories/CategoryRules'
import { CategoryStats } from '@/components/categories/CategoryStats'
import { 
  Tag, 
  Plus, 
  Settings, 
  TrendingUp
} from 'lucide-react'

export default function CategoriesPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'categories' | 'rules' | 'stats'>('categories')
  const [showAddCategory, setShowAddCategory] = useState(false)

  // Check if mobile and get sidebar state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sidebar-collapsed') {
        setIsCollapsed(JSON.parse(event.newValue || 'false'))
      }
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const getMainPadding = () => {
    if (isMobile) return 'pl-0 pt-16'
    if (isCollapsed) return 'pl-[72px]'
    return 'pl-[240px]'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isMobile={isMobile} />

      <main className={`
        transition-all duration-300 min-h-screen
        ${getMainPadding()}
      `}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy">Categories</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Manage your transaction categories and rules
              </p>
            </div>
            <button 
              onClick={() => setShowAddCategory(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm font-medium shadow-md shadow-electric-blue/30"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          {/* Tabs - Navy Active */}
          <div className="flex gap-1 bg-white rounded-xl shadow-card-dark p-1 mb-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'categories'
                  ? 'bg-navy text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Tag className="w-4 h-4 inline mr-2" />
              Categories
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-navy text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Settings className="w-4 h-4 inline mr-2" />
              Rules
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === 'stats'
                  ? 'bg-navy text-white shadow-md'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Stats
            </button>
          </div>

          {/* Content */}
          {activeTab === 'categories' && <CategoryManager onAddCategory={() => setShowAddCategory(true)} />}
          {activeTab === 'rules' && <CategoryRules />}
          {activeTab === 'stats' && <CategoryStats />}
        </div>
      </main>
    </div>
  )
}