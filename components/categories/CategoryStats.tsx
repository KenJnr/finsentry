// components/categories/CategoryStats.tsx

'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'
import { AlertCircle, Wallet } from 'lucide-react'

interface CategoryData {
  name: string
  value: number
  count: number
  color: string
}

export function CategoryStats() {
  const [data, setData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)

  // Default colors for categories
  const defaultColors = [
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
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view stats')
        setLoading(false)
        return
      }

      // Fetch categories with colors
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('user_id', session.user.id)

      if (catError) throw catError

      // Build color map
      const colorMap: Record<string, string> = {}
      categoriesData?.forEach((cat: any, index: number) => {
        colorMap[cat.name] = cat.color || defaultColors[index % defaultColors.length]
      })

      // Fetch all transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', session.user.id)

      if (txError) throw txError

      // Calculate stats
      const categoryMap: Record<string, { value: number; count: number }> = {}
      let totalAmt = 0

      transactions?.forEach((t: any) => {
        const category = t.category || 'Uncategorized'
        if (!categoryMap[category]) {
          categoryMap[category] = { value: 0, count: 0 }
        }
        categoryMap[category].value += t.amount
        categoryMap[category].count += 1
        totalAmt += t.amount
      })

      setTotalAmount(totalAmt)

      // Convert to array and sort by value (highest first)
      const chartData = Object.entries(categoryMap)
        .map(([name, stats]) => ({
          name,
          value: stats.value,
          count: stats.count,
          color: colorMap[name] || defaultColors[Object.keys(categoryMap).indexOf(name) % defaultColors.length]
        }))
        .sort((a, b) => b.value - a.value)

      setData(chartData)
    } catch (error: any) {
      console.error('Error loading stats:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 rounded-lg shadow-card-dark border border-gray-100">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <p className="font-semibold text-navy">{data.name}</p>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Amount: <span className="font-medium">GH₵{data.value.toFixed(2)}</span>
          </p>
          <p className="text-sm text-gray-600">
            Transactions: <span className="font-medium">{data.count}</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {totalAmount > 0 ? ((data.value / totalAmount) * 100).toFixed(1) : 0}% of total
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <ul className="flex flex-wrap gap-2 justify-center mt-2">
        {payload?.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-1 text-xs">
            <div 
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.value}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
        <span className="ml-3 text-gray-500">Loading stats...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600">{error}</p>
        <button 
          onClick={loadStats}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No transactions found</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a statement to see spending statistics
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Pie Chart */}
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <h3 className="text-base font-semibold text-navy mb-4">Spending by Category</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Table */}
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <h3 className="text-base font-semibold text-navy mb-4">Category Breakdown</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {data.map((item) => {
            const percentage = totalAmount > 0 ? (item.value / totalAmount) * 100 : 0
            return (
              <div key={item.name}>
                <div className="flex justify-between text-sm mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-700 truncate">{item.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      ({item.count} txns)
                    </span>
                  </div>
                  <span className="font-medium text-navy flex-shrink-0 ml-2">
                    GH₵{item.value.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: item.color
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>{percentage.toFixed(1)}% of total</span>
                  <span>GH₵{item.value.toFixed(2)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}