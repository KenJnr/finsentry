// components/insights/SpendingPatterns.tsx

'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, TrendingDown, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface WeeklyData {
  day: string
  amount: number
}

interface CategoryTrend {
  month: string
  [key: string]: string | number
}

export function SpendingPatterns() {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [includeMiscellaneous, setIncludeMiscellaneous] = useState(true)

  // Colors for category lines
  const categoryColors = [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6B7280', // Gray
    '#7C3AED', // Violet
    '#06B6D4', // Cyan
    '#84CC16', // Lime
  ]

  useEffect(() => {
    loadSpendingData()
  }, [])

  const loadSpendingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view spending patterns')
        setLoading(false)
        return
      }

      // Fetch all transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('date, amount, category, type')
        .eq('user_id', session.user.id)
        .order('date', { ascending: true })

      if (txError) throw txError

      if (!transactions || transactions.length === 0) {
        setWeeklyData([])
        setCategoryTrends([])
        setAllCategories([])
        setLoading(false)
        return
      }

      // 1. Calculate Weekly Spending Pattern
      const weeklyMap: Record<string, number> = {
        'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
      }
      
      // Only include debits (spending) for weekly pattern
      transactions.forEach((t: any) => {
        if (t.type === 'debit' && t.amount > 0) {
          const date = new Date(t.date)
          const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
          if (weeklyMap[day] !== undefined) {
            weeklyMap[day] += t.amount
          }
        }
      })

      const weeklyDataArray = Object.entries(weeklyMap).map(([day, amount]) => ({
        day,
        amount: Math.round(amount * 100) / 100
      }))

      setWeeklyData(weeklyDataArray)

      // 2. Calculate Category Trends (by month) - ALL CATEGORIES including Miscellaneous
      // First, get all categories with spending
      const categoryTotals: Record<string, number> = {}
      const categoryMonthlyData: Record<string, Record<string, number>> = {}

      transactions.forEach((t: any) => {
        if (t.type === 'debit' && t.amount > 0 && t.category) {
          const cat = t.category
          // Include ALL categories - no filtering
          
          // Track total per category
          categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount

          // Track monthly data
          const date = new Date(t.date)
          const monthKey = date.toLocaleString('default', { month: 'short' })
          
          if (!categoryMonthlyData[monthKey]) {
            categoryMonthlyData[monthKey] = {}
          }
          if (!categoryMonthlyData[monthKey][cat]) {
            categoryMonthlyData[monthKey][cat] = 0
          }
          categoryMonthlyData[monthKey][cat] += t.amount
        }
      })

      // Get all categories sorted by total spending
      const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)

      setAllCategories(sortedCategories)

      // Convert to array and sort by month
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const categoryTrendsArray: CategoryTrend[] = Object.entries(categoryMonthlyData)
        .map(([month, categories]) => {
          const data: CategoryTrend = { month }
          sortedCategories.forEach(cat => {
            data[cat] = Math.round((categories[cat] || 0) * 100) / 100
          })
          return data
        })
        .sort((a, b) => monthOrder.indexOf(a.month as string) - monthOrder.indexOf(b.month as string))

      // Only keep last 6 months or all if less
      const lastSixMonths = categoryTrendsArray.slice(-6)
      setCategoryTrends(lastSixMonths)

    } catch (error: any) {
      console.error('Error loading spending data:', error)
      setError(error.message || 'Failed to load spending data')
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-card-dark border border-gray-100 max-h-60 overflow-y-auto">
          <p className="font-semibold text-navy text-sm mb-1">{label}</p>
          {payload.map((item: any, index: number) => (
            <p key={index} className="text-xs text-gray-600 flex items-center gap-1">
              <span 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              {item.name}: GH₵{item.value.toFixed(2)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Find highest and lowest spending days
  const validWeeklyData = weeklyData.filter(d => d.amount > 0)
  const highestDay = validWeeklyData.length > 0 ? 
    validWeeklyData.reduce((max, day) => day.amount > max.amount ? day : max) : null
  const lowestDay = validWeeklyData.length > 0 ? 
    validWeeklyData.reduce((min, day) => day.amount < min.amount ? day : min) : null

  // Get visible categories based on toggle
  const visibleCategories = showAllCategories ? allCategories : allCategories.slice(0, 5)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
        <span className="ml-3 text-gray-500">Loading spending patterns...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600">{error}</p>
        <button 
          onClick={loadSpendingData}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (weeklyData.length === 0 || validWeeklyData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No spending data available</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload transactions to see your spending patterns
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Weekly Spending Pattern */}
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-navy">Weekly Spending Pattern</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Your spending by day of the week
            </p>
          </div>
          {highestDay && lowestDay && (
            <div className="flex gap-3 text-xs flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                Highest: {highestDay.day} (GH₵{highestDay.amount.toFixed(2)})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Lowest: {lowestDay.day} (GH₵{lowestDay.amount.toFixed(2)})
              </span>
            </div>
          )}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `GH₵${value}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount" 
                fill="#3B82F6" 
                radius={[4, 4, 0, 0]}
                shape={(props: any) => {
                  const isHighest = highestDay && props.payload.amount === highestDay.amount
                  const isLowest = lowestDay && props.payload.amount === lowestDay.amount
                  return (
                    <rect
                      {...props}
                      fill={isHighest ? '#EF4444' : isLowest ? '#10B981' : '#3B82F6'}
                      rx={4}
                      ry={4}
                    />
                  )
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Trends - ALL CATEGORIES including Miscellaneous */}
      {categoryTrends.length > 0 && allCategories.length > 0 && (
        <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-navy">Category Spending Trends</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {allCategories.length} categories • Showing {showAllCategories ? 'all' : 'top 5'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {allCategories.length > 5 && (
                <button
                  onClick={() => setShowAllCategories(!showAllCategories)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {showAllCategories ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      Show All ({allCategories.length})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={categoryTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `GH₵${value}`} />
                <Tooltip content={<CustomTooltip />} />
                {visibleCategories.map((cat, index) => (
                  <Line 
                    key={cat}
                    type="monotone" 
                    dataKey={cat} 
                    stroke={categoryColors[index % categoryColors.length]} 
                    strokeWidth={2} 
                    dot={{ r: 3 }} 
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            {visibleCategories.map((cat, index) => (
              <span key={cat} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span 
                  className="w-3 h-0.5" 
                  style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                />
                {cat}
              </span>
            ))}
            {!showAllCategories && allCategories.length > 5 && (
              <span className="text-xs text-gray-400">
                +{allCategories.length - 5} more categories
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}