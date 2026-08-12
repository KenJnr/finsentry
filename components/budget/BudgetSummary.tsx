// components/budget/BudgetSummary.tsx

'use client'

import { useState, useEffect } from 'react'
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface BudgetStats {
  totalBudgeted: number
  totalActual: number
  totalRemaining: number
  overBudget: number
  onTrack: number
}

interface BudgetSummaryProps {
  refreshTrigger?: number
}

export function BudgetSummary({ refreshTrigger = 0 }: BudgetSummaryProps) {
  const [stats, setStats] = useState<BudgetStats>({
    totalBudgeted: 0,
    totalActual: 0,
    totalRemaining: 0,
    overBudget: 0,
    onTrack: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBudgetSummary()
  }, [refreshTrigger])

  const loadBudgetSummary = async () => {
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
      
      // Get start of current week (Monday)
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const currentWeek = new Date(now)
      currentWeek.setDate(diff)
      const weekStart = currentWeek.toISOString().slice(0, 10)

      // Fetch budgets for all periods
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
        setStats({
          totalBudgeted: 0,
          totalActual: 0,
          totalRemaining: 0,
          overBudget: 0,
          onTrack: 0
        })
        setLoading(false)
        return
      }

      // Determine period start date for transactions
      const periodStart = budgets.some(b => b.period_type === 'weekly') 
        ? weekStart 
        : currentMonth + '-01'

      // Fetch actual spending
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

      // Calculate stats
      let totalBudgeted = 0
      let totalActual = 0
      let overBudget = 0
      let onTrack = 0

      budgets.forEach((b: any) => {
        const actual = actualSpending[b.category] || 0
        totalBudgeted += b.amount
        totalActual += actual
        
        const remaining = b.amount - actual
        if (remaining < 0) overBudget++
        else if (remaining < b.amount * 0.1) onTrack++
      })

      setStats({
        totalBudgeted,
        totalActual: Math.round(totalActual * 100) / 100,
        totalRemaining: Math.round((totalBudgeted - totalActual) * 100) / 100,
        overBudget,
        onTrack
      })

    } catch (error: any) {
      console.error('Error loading budget summary:', error)
      setError(error.message || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl bg-gray-100 p-4 animate-pulse h-24"></div>
        ))}
      </div>
    )
  }

  if (error || stats.totalBudgeted === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="col-span-full rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-6 text-center text-white">
          <p className="text-sm">No budgets set for this period</p>
          <p className="text-xs text-blue-200 mt-1">Set a weekly, monthly, or yearly budget to start tracking</p>
        </div>
      </div>
    )
  }

  const isUnderBudget = stats.totalRemaining >= 0

  const summaryCards = [
    {
      label: 'Total Budget',
      value: `GH₵ ${stats.totalBudgeted.toFixed(2)}`,
      icon: Wallet,
      color: 'text-blue-500'
    },
    {
      label: 'Spent So Far',
      value: `GH₵ ${stats.totalActual.toFixed(2)}`,
      icon: TrendingDown,
      color: stats.totalActual > stats.totalBudgeted / 2 ? 'text-rose-500' : 'text-emerald-500'
    },
    {
      label: 'Remaining',
      value: `GH₵ ${Math.abs(stats.totalRemaining).toFixed(2)}`,
      icon: isUnderBudget ? TrendingUp : TrendingDown,
      color: isUnderBudget ? 'text-emerald-500' : 'text-rose-500'
    },
    {
      label: 'Status',
      value: isUnderBudget ? `${stats.overBudget} Over Budget` : 'Over Budget',
      icon: isUnderBudget ? CheckCircle : AlertCircle,
      color: isUnderBudget ? 'text-emerald-500' : 'text-rose-500'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {summaryCards.map((card) => (
        <div 
          key={card.label}
          className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 sm:p-5 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-blue-200 font-medium uppercase tracking-wider truncate">
                {card.label}
              </p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-white mt-0.5 truncate">
                {card.value}
              </p>
            </div>
            <div className="bg-white backdrop-blur-sm p-1.5 sm:p-2 rounded-lg flex-shrink-0 ml-2 border border-white/10">
              <card.icon className={`${card.color} w-3.5 h-3.5 sm:w-4 sm:h-4`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}