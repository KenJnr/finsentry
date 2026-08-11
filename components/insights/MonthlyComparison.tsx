// components/insights/MonthlyComparison.tsx

'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Wallet, Calendar, ArrowUpRight, ArrowDownRight, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MonthlyData {
  month: string
  income: number
  expenses: number
  savings: number
}

export function MonthlyComparison() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totals, setTotals] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    savingsRate: 0
  })
  const [changes, setChanges] = useState({
    income: 0,
    expenses: 0,
    savings: 0
  })

  useEffect(() => {
    loadMonthlyData()
  }, [])

  const loadMonthlyData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view monthly comparison')
        setLoading(false)
        return
      }

      // Fetch all transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('date, amount, type')
        .eq('user_id', session.user.id)
        .order('date', { ascending: true })

      if (txError) throw txError

      if (!transactions || transactions.length === 0) {
        setMonthlyData([])
        setLoading(false)
        return
      }

      // Group transactions by month
      const monthlyMap: Record<string, { income: number; expenses: number }> = {}
      
      transactions.forEach((t: any) => {
        const date = new Date(t.date)
        const monthKey = date.toLocaleString('default', { month: 'short' })
        const year = date.getFullYear()
        const monthYear = `${monthKey} ${year}`
        
        if (!monthlyMap[monthYear]) {
          monthlyMap[monthYear] = { income: 0, expenses: 0 }
        }
        
        if (t.type === 'credit') {
          monthlyMap[monthYear].income += t.amount
        } else if (t.type === 'debit') {
          monthlyMap[monthYear].expenses += t.amount
        }
      })

      // Convert to array and sort by date
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const sortedData = Object.entries(monthlyMap)
        .map(([monthYear, data]) => {
          const [month] = monthYear.split(' ')
          const savings = data.income - data.expenses
          return {
            month,
            income: Math.round(data.income * 100) / 100,
            expenses: Math.round(data.expenses * 100) / 100,
            savings: Math.round(savings * 100) / 100
          }
        })
        .sort((a, b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month))

      // Only keep last 6 months
      const lastSixMonths = sortedData.slice(-6)
      setMonthlyData(lastSixMonths)

      // Calculate totals
      const totalIncome = lastSixMonths.reduce((sum, d) => sum + d.income, 0)
      const totalExpenses = lastSixMonths.reduce((sum, d) => sum + d.expenses, 0)
      const totalSavings = lastSixMonths.reduce((sum, d) => sum + d.savings, 0)
      const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0

      setTotals({
        income: totalIncome,
        expenses: totalExpenses,
        savings: totalSavings,
        savingsRate: savingsRate
      })

      // Calculate month-over-month changes
      if (lastSixMonths.length >= 2) {
        const lastMonth = lastSixMonths[lastSixMonths.length - 1]
        const prevMonth = lastSixMonths[lastSixMonths.length - 2]
        
        setChanges({
          income: prevMonth.income > 0 ? ((lastMonth.income - prevMonth.income) / prevMonth.income) * 100 : 0,
          expenses: prevMonth.expenses > 0 ? ((lastMonth.expenses - prevMonth.expenses) / prevMonth.expenses) * 100 : 0,
          savings: prevMonth.savings !== 0 ? ((lastMonth.savings - prevMonth.savings) / Math.abs(prevMonth.savings)) * 100 : 0
        })
      }

    } catch (error: any) {
      console.error('Error loading monthly data:', error)
      setError(error.message || 'Failed to load monthly data')
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-card-dark border border-gray-100">
          <p className="font-semibold text-navy text-sm">{label}</p>
          {payload.map((item: any) => (
            <p key={item.name} className="text-xs" style={{ color: item.color }}>
              {item.name}: GH₵{item.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const isExpenseUp = changes.expenses > 0
  const isIncomeUp = changes.income > 0
  const isSavingsUp = changes.savings > 0

  // Stats cards with gradient background
  const statsCards = [
    {
      label: 'Total Income',
      value: `GH₵ ${totals.income.toFixed(0)}`,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-white',
      change: `${isIncomeUp ? '+' : ''}${changes.income.toFixed(1)}%`,
      changeType: isIncomeUp ? 'up' : 'down',
      subtitle: 'vs last month'
    },
    {
      label: 'Total Expenses',
      value: `GH₵ ${totals.expenses.toFixed(0)}`,
      icon: TrendingDown,
      color: 'text-rose-500',
      bgColor: 'bg-white',
      change: `${isExpenseUp ? '+' : ''}${changes.expenses.toFixed(1)}%`,
      changeType: isExpenseUp ? 'up' : 'down',
      subtitle: 'vs last month'
    },
    {
      label: 'Total Savings',
      value: `GH₵ ${totals.savings.toFixed(0)}`,
      icon: Wallet,
      color: 'text-blue-500',
      bgColor: 'bg-white',
      change: `${isSavingsUp ? '+' : ''}${changes.savings.toFixed(1)}%`,
      changeType: isSavingsUp ? 'up' : 'down',
      subtitle: 'vs last month'
    },
    {
      label: 'Savings Rate',
      value: `${totals.savingsRate.toFixed(1)}%`,
      icon: Calendar,
      color: 'text-purple-500',
      bgColor: 'bg-white',
      change: `${isSavingsUp ? '+' : ''}${changes.savings.toFixed(1)}%`,
      changeType: isSavingsUp ? 'up' : 'down',
      subtitle: 'vs last month'
    }
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
        <span className="ml-3 text-gray-500">Loading monthly data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600">{error}</p>
        <button 
          onClick={loadMonthlyData}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (monthlyData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No monthly data available</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload transactions to see your monthly comparison
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Gradient */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsCards.map((card) => (
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
                <div className="flex items-center gap-1 mt-1.5">
                  <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${
                    card.changeType === 'up' 
                      ? 'bg-white text-emerald-500' 
                      : 'bg-white text-rose-500'
                  }`}>
                    {card.changeType === 'up' ? (
                      <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    )}
                    <span className="text-[9px] sm:text-[10px] font-medium">
                      {card.change}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[12px] text-blue-200">
                    {card.subtitle}
                  </span>
                </div>
              </div>
              <div className={`${card.bgColor} backdrop-blur-sm p-1.5 sm:p-2 rounded-lg flex-shrink-0 ml-2 border border-white/10`}>
                <card.icon className={`${card.color} w-3.5 h-3.5 sm:w-4 sm:h-4`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-navy">Monthly Comparison</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500 rounded"></span>
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500 rounded"></span>
              Expenses
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-blue-500 rounded"></span>
              Savings
            </span>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `GH₵${value}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="savings" name="Savings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}