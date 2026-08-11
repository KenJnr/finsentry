// app/budget/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { BudgetList } from '@/components/budget/BudgetList'
import { BudgetForm } from '@/components/budget/BudgetForm'
import { BudgetSummary } from '@/components/budget/BudgetSummary'
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  AlertCircle
} from 'lucide-react'

export default function BudgetPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

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

  const handleBudgetSaved = () => {
    setShowAddBudget(false)
    // Trigger refresh of both components
    setRefreshTrigger(prev => prev + 1)
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
              <h1 className="text-xl sm:text-2xl font-bold text-navy">Budget</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Plan and track your spending across categories
              </p>
            </div>
            <button 
              onClick={() => setShowAddBudget(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm font-medium shadow-md shadow-electric-blue/30"
            >
              <Plus className="w-4 h-4" />
              Set Budget
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Budget Summary - Pass refreshTrigger to reload */}
            <BudgetSummary key={`summary-${refreshTrigger}`} />

            {/* Budget List - Pass refreshTrigger to reload */}
            <BudgetList 
              key={`list-${refreshTrigger}`}
              refreshTrigger={refreshTrigger}
            />

            {/* Add Budget Modal */}
            {showAddBudget && (
              <BudgetForm 
                onClose={() => setShowAddBudget(false)}
                onSave={handleBudgetSaved}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}