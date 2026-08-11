// app/insights/page.tsx

'use client'

import { useState, useEffect, Suspense } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { FullTransactionList } from '@/components/insights/FullTransactionList'
import { InsightsSummary } from '@/components/insights/InsightsSummary'
import { SpendingPatterns } from '@/components/insights/SpendingPattern'
import { MonthlyComparison } from '@/components/insights/MonthlyComparison'
import { TopSpending } from '@/components/insights/TopSpending'
import { SavingsTips } from '@/components/insights/SavingsTips'
import { 
  TrendingUp, 
  Calendar, 
  Target,
  List,
  FileText,
  Award
} from 'lucide-react'
import { useSearchParams } from 'next/navigation'

// Component that uses useSearchParams - wrapped in Suspense
function InsightsContent() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'transactions' | 'summary' | 'patterns' | 'comparison' | 'top-spending' | 'tips'>('transactions')
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const tabs = [
    { id: 'transactions', label: 'Transactions', icon: List },
    { id: 'summary', label: 'Summary', icon: FileText },
    { id: 'patterns', label: 'Patterns', icon: TrendingUp },
    { id: 'comparison', label: 'Monthly', icon: Calendar },
    { id: 'top-spending', label: 'Top Spending', icon: Award },
    { id: 'tips', label: 'Tips', icon: Target },
  ]

  useEffect(() => {
    if (tabParam && tabs.some(t => t.id === tabParam)) {
      setActiveTab(tabParam as any)
    }
  }, [tabParam])

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
    <main className={`
      transition-all duration-300 min-h-screen
      ${getMainPadding()}
    `}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">Transactions & Insights</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              View all your transactions and gain valuable insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs text-gray-400">
              {transactions.length} transactions
            </span>
            <span className="text-[10px] sm:text-xs text-gray-400">
              Last updated: {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Tabs - Navy Active */}
        <div className="flex gap-1 bg-white rounded-xl shadow-card-dark p-1 mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-1.5 sm:gap-2 ${
                  isActive
                    ? 'bg-navy text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        {activeTab === 'transactions' && <FullTransactionList />}
        {activeTab === 'summary' && <InsightsSummary />}
        {activeTab === 'patterns' && <SpendingPatterns />}
        {activeTab === 'comparison' && <MonthlyComparison />}
        {activeTab === 'top-spending' && <TopSpending />}
        {activeTab === 'tips' && <SavingsTips />}
      </div>
    </main>
  )
}

// Main page component with Suspense boundary
export default function InsightsPage() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isMobile={isMobile} />
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
        </div>
      }>
        <InsightsContent />
      </Suspense>
    </div>
  )
}