// app/dashboard/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { StatsCards } from '@/components/dashboard/StatsCard'
import { TransactionList } from '@/components/dashboard/TransactionList'
import { CategoryChart } from '@/components/dashboard/CategoryChart'
import { BudgetComparison } from '@/components/dashboard/BudgetComparison'
import { MonthlyTrends } from '@/components/dashboard/MonthlyTrends'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalTransactions: number
  totalInflow: number
  totalOutflow: number
  netFlow: number
  averageTransaction: number
  previousMonth?: {
    totalInflow: number
    totalOutflow: number
  }
}

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [userName, setUserName] = useState('User')
  const [stats, setStats] = useState<DashboardStats>({
    totalTransactions: 0,
    totalInflow: 0,
    totalOutflow: 0,
    netFlow: 0,
    averageTransaction: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Check if mobile and get sidebar state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Get sidebar state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
    
    // Listen for sidebar toggle events
    const handleSidebarToggle = (event: StorageEvent) => {
      if (event.key === 'sidebar-collapsed') {
        setIsCollapsed(JSON.parse(event.newValue || 'false'))
      }
    }
    window.addEventListener('storage', handleSidebarToggle)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('storage', handleSidebarToggle)
    }
  }, [])

  useEffect(() => {
    loadUserAndData()
  }, [])

  const loadUserAndData = async () => {
    try {
      setIsLoading(true)

      // Get current user
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        // Get user's full name from metadata or use email as fallback
        const name = session.user.user_metadata?.full_name || 
                     session.user.user_metadata?.name ||
                     session.user.email?.split('@')[0] || 
                     'User'
        setUserName(name)
      }

      // Fetch transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session?.user?.id)
        .order('date', { ascending: false })

      if (txError) throw txError

      // Calculate stats
      const totalTransactions = transactions?.length || 0
      
      const totalInflow = transactions
        ?.filter((t: any) => t.type?.toLowerCase() === 'credit')
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0
      
      const totalOutflow = transactions
        ?.filter((t: any) => t.type?.toLowerCase() === 'debit')
        .reduce((sum: number, t: any) => sum + t.amount, 0) || 0
      
      const netFlow = totalInflow - totalOutflow
      const averageTransaction = totalTransactions > 0 
        ? (totalInflow + totalOutflow) / totalTransactions 
        : 0

      // Calculate previous month stats for comparison
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

      const prevMonthTransactions = transactions?.filter((t: any) => {
        const date = new Date(t.date)
        return date.getMonth() === prevMonth && date.getFullYear() === prevYear
      }) || []

      const prevInflow = prevMonthTransactions
        .filter((t: any) => t.type?.toLowerCase() === 'credit')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

      const prevOutflow = prevMonthTransactions
        .filter((t: any) => t.type?.toLowerCase() === 'debit')
        .reduce((sum: number, t: any) => sum + t.amount, 0)

      setStats({
        totalTransactions,
        totalInflow,
        totalOutflow,
        netFlow,
        averageTransaction,
        previousMonth: {
          totalInflow: prevInflow,
          totalOutflow: prevOutflow
        }
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate padding based on sidebar state
  const getMainPadding = () => {
    if (isMobile) return 'pl-0 pt-16'
    if (isCollapsed) return 'pl-[72px]'
    return 'pl-[240px]'
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      {isMobile ? (
        <Sidebar isMobile={true} />
      ) : (
        <Sidebar />
      )}

      {/* Main Content */}
      <main className={`
        transition-all duration-300 min-h-screen
        ${getMainPadding()}
      `}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="heading-responsive text-navy">Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
                {getGreeting()}, {userName}! Here's your financial overview
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-xs text-gray-400">
                Last updated: {new Date().toLocaleDateString()}
              </span>
              <button 
                onClick={loadUserAndData}
                className="btn-secondary text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
              >
                Refresh
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-electric-blue"></div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <StatsCards stats={stats} />

              {/* Quick Actions */}
              <div className="mt-4 sm:mt-6">
                <QuickActions />
              </div>
              
              {/* Charts Row - 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mt-4 sm:mt-6">
                <CategoryChart />
                <BudgetComparison />
              </div>
              
              {/* Monthly Trends - Full Width */}
              <div className="mt-4 sm:mt-6">
                <MonthlyTrends />
              </div>
              
              {/* Transaction List - Full Width */}
              <div className="mt-4 sm:mt-6">
                <TransactionList />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}