// components/dashboard/MonthlyTrends.tsx

'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BarChart3, Info, X, Loader2, AlertCircle, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MonthlyData {
  month: string
  income: number
  expenses: number
  savings: number
}

export function MonthlyTrends() {
  const [data, setData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [totals, setTotals] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    savingsRate: 0
  })

  useEffect(() => {
    loadMonthlyTrends()
  }, [])

  const loadMonthlyTrends = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view trends')
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
        setData([])
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
        
        if (t.type?.toLowerCase() === 'credit') {
          monthlyMap[monthYear].income += t.amount
        } else if (t.type?.toLowerCase() === 'debit') {
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
      setData(lastSixMonths)

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

    } catch (error: any) {
      console.error('Error loading monthly trends:', error)
      setError(error.message || 'Failed to load trends')
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-card-dark border border-gray-100">
          <p className="font-semibold text-navy text-sm sm:text-base mb-1 sm:mb-2">{label}</p>
          {payload.map((item: any) => (
            <p key={item.name} className="text-xs sm:text-sm" style={{ color: item.color }}>
              {item.name}: GH₵{item.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Calculate summary stats
  const totalIncome = data.reduce((sum, d) => sum + d.income, 0)
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0)
  const totalSavings = data.reduce((sum, d) => sum + d.savings, 0)
  const averageIncome = data.length > 0 ? totalIncome / data.length : 0
  const averageExpenses = data.length > 0 ? totalExpenses / data.length : 0
  const bestMonth = data.length > 0 ? data.reduce((best, current) => 
    current.savings > best.savings ? current : best
  ) : null
  const worstMonth = data.length > 0 ? data.reduce((worst, current) => 
    current.savings < worst.savings ? current : worst
  ) : null

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-navy">Monthly Trends</h3>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Loading trends...</p>
          </div>
        </div>
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-navy">Monthly Trends</h3>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">Error loading data</p>
          </div>
        </div>
        <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <p className="text-rose-600 text-sm">{error}</p>
          <button 
            onClick={loadMonthlyTrends}
            className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6 transition-all duration-300 hover:shadow-card-hover">
      {/* Header with View Analytics Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 sm:mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-navy">Monthly Trends</h3>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
            Track your income, expenses, and savings over time
          </p>
        </div>
        {data.length > 0 && (
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-electric-blue text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-electric-blue/90 transition-colors shadow-md shadow-electric-blue/30"
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            View Analytics
          </button>
        )}
      </div>
      
      {/* Chart */}
      {data.length === 0 ? (
        <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-gray-400 text-sm sm:text-base">
          <Wallet className="w-8 h-8 mb-2 text-gray-300" />
          No data available
          <p className="text-xs text-gray-400 mt-1">Upload transactions to see trends</p>
        </div>
      ) : (
        <>
          <div className="h-48 sm:h-56 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickFormatter={(value) => `GH₵${value}`}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="Savings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats Summary */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-100">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-gray-400">Avg Income</p>
              <p className="text-xs sm:text-sm font-semibold text-emerald-600">
                GH₵{averageIncome.toFixed(0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-gray-400">Avg Expenses</p>
              <p className="text-xs sm:text-sm font-semibold text-rose-600">
                GH₵{averageExpenses.toFixed(0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-gray-400">Total Savings</p>
              <p className="text-xs sm:text-sm font-semibold text-blue-600">
                GH₵{totalSavings.toFixed(0)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* Analytics Modal */}
      {showAnalytics && bestMonth && worstMonth && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAnalytics(false)}>
          <div className="bg-white rounded-xl shadow-card-dark max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-navy">📊 Monthly Trends Analytics</h3>
              <button 
                onClick={() => setShowAnalytics(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Analytics Content */}
            <div className="space-y-4">
              {/* Best Month */}
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                  🏆 Best Month
                </h4>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">{bestMonth.month}</span> - Saved 
                  <span className="font-semibold text-emerald-600"> GH₵{bestMonth.savings.toFixed(2)}</span>
                  <span className="text-gray-500 text-xs block mt-0.5">
                    Income: GH₵{bestMonth.income.toFixed(2)} | Expenses: GH₵{bestMonth.expenses.toFixed(2)}
                  </span>
                </p>
              </div>

              {/* Worst Month */}
              <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                <h4 className="text-sm font-semibold text-rose-700 flex items-center gap-2">
                  📉 Worst Month
                </h4>
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-medium">{worstMonth.month}</span> - Saved 
                  <span className="font-semibold text-rose-600"> GH₵{worstMonth.savings.toFixed(2)}</span>
                  <span className="text-gray-500 text-xs block mt-0.5">
                    Income: GH₵{worstMonth.income.toFixed(2)} | Expenses: GH₵{worstMonth.expenses.toFixed(2)}
                  </span>
                </p>
              </div>

              {/* Legend Explanation */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  📖 What the Bars Mean
                </h4>
                <div className="space-y-1.5 mt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-500"></div>
                    <span className="text-xs text-gray-700">
                      <span className="font-medium">Income</span> - Money coming in (salary, transfers, etc.)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-rose-500"></div>
                    <span className="text-xs text-gray-700">
                      <span className="font-medium">Expenses</span> - Money going out (spending, bills, etc.)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span className="text-xs text-gray-700">
                      <span className="font-medium">Savings</span> - What's left after expenses (Income - Expenses)
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Insights */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-semibold text-navy flex items-center gap-2">
                  💡 Key Insights
                </h4>
                <ul className="space-y-1.5 mt-2">
                  <li className="text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-emerald-500">•</span>
                    Total Income: <span className="font-medium">GH₵{totals.income.toFixed(2)}</span>
                  </li>
                  <li className="text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-rose-500">•</span>
                    Total Expenses: <span className="font-medium">GH₵{totals.expenses.toFixed(2)}</span>
                  </li>
                  <li className="text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-blue-500">•</span>
                    Total Savings: <span className="font-medium">GH₵{totals.savings.toFixed(2)}</span>
                  </li>
                  <li className="text-xs text-gray-700 flex items-start gap-2">
                    <span className="text-purple-500">•</span>
                    Savings Rate: <span className="font-medium">{totals.savingsRate.toFixed(1)}%</span>
                  </li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowAnalytics(false)}
              className="w-full mt-6 py-2.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm font-medium"
            >
              Close Analytics
            </button>
          </div>
        </div>
      )}
    </div>
  )
}