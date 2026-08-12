// components/dashboard/BudgetComparison.tsx

'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface BudgetItem {
  category: string
  budgeted: number
  actual: number
  variance: number
  status: 'under' | 'over' | 'on-track'
  period_type: 'weekly' | 'monthly' | 'yearly'
}

interface BudgetComparisonProps {
  refreshTrigger?: number
}

export function BudgetComparison({ refreshTrigger = 0 }: BudgetComparisonProps) {
  const [viewMode, setViewMode] = useState<'all' | 'over' | 'under'>('all')
  const [budgetData, setBudgetData] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [periodFilter, setPeriodFilter] = useState<'all' | 'weekly' | 'monthly' | 'yearly'>('all')

  useEffect(() => {
    loadBudgetData()
  }, [refreshTrigger])

  const loadBudgetData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in')
        setLoading(false)
        return
      }

      const now = new Date()
      const currentMonth = now.toISOString().slice(0, 7)
      const currentYear = now.getFullYear().toString()
      
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const currentWeek = new Date(now)
      currentWeek.setDate(diff)
      const weekStart = currentWeek.toISOString().slice(0, 10)

      // Fix: Use proper date filtering with gte/lt instead of like
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', session.user.id)
        .or(
          `period_type.eq.weekly,` +
          `and(period_type.eq.monthly,period_start.gte.${currentMonth}-01,period_start.lt.${currentMonth}-31),` +
          `and(period_type.eq.yearly,period_start.gte.${currentYear}-01-01,period_start.lt.${parseInt(currentYear) + 1}-01-01)`
        )

      if (budgetError) throw budgetError

      if (!budgets || budgets.length === 0) {
        setBudgetData([])
        setLoading(false)
        return
      }

      const periodStart = budgets.some(b => b.period_type === 'weekly') ? weekStart : currentMonth + '-01'
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('category, amount, type, date')
        .eq('user_id', session.user.id)
        .gte('date', periodStart)

      if (txError) throw txError

      const actualSpending: Record<string, number> = {}
      transactions?.forEach((t: any) => {
        if (t.type?.toLowerCase() === 'debit') {
          const cat = t.category || 'Uncategorized'
          actualSpending[cat] = (actualSpending[cat] || 0) + t.amount
        }
      })

      const items: BudgetItem[] = budgets.map((b: any) => {
        const actual = actualSpending[b.category] || 0
        const variance = b.amount - actual
        let status: 'under' | 'over' | 'on-track' = 'under'
        if (variance < 0) status = 'over'
        else if (variance < b.amount * 0.1) status = 'on-track'

        return {
          category: b.category,
          budgeted: b.amount,
          actual: Math.round(actual * 100) / 100,
          variance: Math.round(variance * 100) / 100,
          status,
          period_type: b.period_type || 'monthly'
        }
      })

      setBudgetData(items)

    } catch (error: any) {
      console.error('Error loading budget data:', error)
      setError(error.message || 'Failed to load budget data')
    } finally {
      setLoading(false)
    }
  }

  const filteredData = budgetData.filter(item => {
    if (viewMode === 'over') return item.status === 'over'
    if (viewMode === 'under') return item.status === 'under'
    if (periodFilter !== 'all') return item.period_type === periodFilter
    return true
  })

  const totalBudgeted = filteredData.reduce((sum, item) => sum + item.budgeted, 0)
  const totalActual = filteredData.reduce((sum, item) => sum + item.actual, 0)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-navy mb-4">Budget vs Actual</h3>
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-navy mb-4">Budget vs Actual</h3>
        <div className="text-center py-8 text-gray-400 text-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-rose-500" />
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6 transition-all duration-300 hover:shadow-card-hover">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-navy">Budget vs Actual</h3>
        {filteredData.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-medium">Total:</span>
            <span className={totalBudgeted - totalActual >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {totalBudgeted - totalActual >= 0 ? 'Under' : 'Over'} by GH₵{Math.abs(totalBudgeted - totalActual).toFixed(2)}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5">
        <button
          onClick={() => setPeriodFilter('all')}
          className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-200 ${
            periodFilter === 'all' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Periods
        </button>
        <button
          onClick={() => setPeriodFilter('weekly')}
          className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-200 ${
            periodFilter === 'weekly' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setPeriodFilter('monthly')}
          className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-200 ${
            periodFilter === 'monthly' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setPeriodFilter('yearly')}
          className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-200 ${
            periodFilter === 'yearly' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Yearly
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-5">
        <button
          onClick={() => setViewMode('all')}
          className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-200 ${
            viewMode === 'all' 
              ? 'bg-blue-500 text-white shadow-md' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({filteredData.length})
        </button>
        <button
          onClick={() => setViewMode('over')}
          className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-200 ${
            viewMode === 'over' 
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Over ({filteredData.filter(b => b.status === 'over').length})
        </button>
        <button
          onClick={() => setViewMode('under')}
          className={`px-2.5 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all duration-200 ${
            viewMode === 'under' 
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Under ({filteredData.filter(b => b.status === 'under').length})
        </button>
      </div>

      {filteredData.length === 0 ? (
        <div className="text-center py-6 sm:py-8 text-gray-400 text-xs sm:text-sm">
          No budgets match the selected filters.
          <button 
            onClick={() => window.location.href = '/budget'}
            className="block mx-auto mt-2 text-electric-blue hover:underline text-sm"
          >
            Set a budget
          </button>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4 max-h-60 sm:max-h-80 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
          {filteredData.map((item) => {
            const percentage = Math.min((item.actual / item.budgeted) * 100, 100)
            const isOver = item.status === 'over'
            const isUnder = item.status === 'under'
            const isOnTrack = item.status === 'on-track'
            const varianceAmount = Math.abs(item.variance)
            const periodLabel = item.period_type === 'weekly' ? 'Weekly' : 
                                item.period_type === 'yearly' ? 'Yearly' : 'Monthly'

            return (
              <div key={item.category} className="space-y-1">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-navy text-xs sm:text-sm truncate">
                      {item.category}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {periodLabel}
                    </span>
                    {isOver && <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 flex-shrink-0" />}
                    {isUnder && <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />}
                    {isOnTrack && <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
                    <span className="text-gray-500 whitespace-nowrap">
                      GH₵{item.actual.toFixed(2)} / GH₵{item.budgeted.toFixed(2)}
                    </span>
                    <span className={`font-semibold whitespace-nowrap ${
                      isOver ? 'text-rose-600' : isUnder ? 'text-emerald-600' : 'text-blue-600'
                    }`}>
                      {isOver ? '+' : ''}GH₵{varianceAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2">
                  <div 
                    className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${
                      isOver ? 'bg-rose-500' : isUnder ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}