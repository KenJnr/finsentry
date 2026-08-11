// components/dashboard/CategoryChart.tsx

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

export function CategoryChart() {
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
    loadChartData()
  }, [])

  const loadChartData = async () => {
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
        .or(`user_id.eq.${session.user.id},user_id.is.null`)

      if (catError) throw catError

      // Build color map
      const colorMap: Record<string, string> = {}
      categoriesData?.forEach((cat: any, index: number) => {
        colorMap[cat.name] = cat.color || defaultColors[index % defaultColors.length]
      })

      // Fetch all transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('category, amount, type')
        .eq('user_id', session.user.id)

      if (txError) throw txError

      // Calculate stats - only for debit transactions (spending)
      const categoryMap: Record<string, { value: number; count: number }> = {}
      let totalAmt = 0

      transactions?.forEach((t: any) => {
        // Only include debit transactions for spending chart
        if (t.type?.toLowerCase() === 'debit' && t.amount > 0) {
          const category = t.category || 'Miscellaneous'
          if (!categoryMap[category]) {
            categoryMap[category] = { value: 0, count: 0 }
          }
          categoryMap[category].value += t.amount
          categoryMap[category].count += 1
          totalAmt += t.amount
        }
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
      console.error('Error loading chart data:', error)
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
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-navy mb-3 sm:mb-4">Spending by Category</h3>
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-navy mb-3 sm:mb-4">Spending by Category</h3>
        <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
          <p className="text-rose-600 text-sm">{error}</p>
          <button 
            onClick={loadChartData}
            className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-navy mb-3 sm:mb-4">Spending by Category</h3>
        <div className="h-48 sm:h-64 flex flex-col items-center justify-center">
          <Wallet className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-gray-500 text-sm">No spending data available</p>
          <p className="text-xs text-gray-400 mt-1">Upload transactions to see spending breakdown</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6 transition-all duration-300 hover:shadow-card-hover">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-navy">Spending by Category</h3>
        <span className="text-xs text-gray-400">
          {data.length} categories • GH₵{totalAmount.toFixed(2)} total
        </span>
      </div>
      
      <div className="flex flex-col items-center">
        {/* Pie Chart */}
        <div className="h-64 sm:h-72 w-full max-w-md mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
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
    </div>
  )
}