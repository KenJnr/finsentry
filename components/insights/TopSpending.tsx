// components/insights/TopSpending.tsx

'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Loader2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SpendingItem {
  id: string
  category: string
  color: string
  amount: number
  percentage: number
  transactions: number
  change: number
}

export function TopSpending() {
  const [categoryData, setCategoryData] = useState<SpendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})

  const defaultColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#14B8A6', '#F97316', '#6B7280', '#7C3AED',
    '#06B6D4', '#84CC16'
  ]

  useEffect(() => {
    loadTopSpending()
  }, [])

  const loadTopSpending = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view top spending')
        setLoading(false)
        return
      }

      console.log('🔐 User ID:', session.user.id)

      // Fetch categories with colors
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('id, name, color')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)

      if (catError) {
        console.error('❌ Categories error:', catError)
        throw catError
      }

      console.log('📊 Categories found:', categoriesData?.length || 0)

      // Build color map
      const colorMap: Record<string, string> = {}
      categoriesData?.forEach((cat: any, index: number) => {
        colorMap[cat.name] = cat.color || defaultColors[index % defaultColors.length]
      })
      setCategoryColors(colorMap)

      // Fetch ALL transactions (no date filter)
      console.log('📊 Fetching all transactions...')
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)

      if (txError) {
        console.error('❌ Transactions error:', txError)
        throw txError
      }

      console.log('📊 Total transactions found:', transactions?.length || 0)

      if (!transactions || transactions.length === 0) {
        setCategoryData([])
        setLoading(false)
        return
      }

      // Log sample transaction
      console.log('📋 Sample transaction:', transactions[0])

      // Calculate Category Spending - ONLY for debit transactions
      const categoryMap: Record<string, { total: number; count: number }> = {}
      
      transactions.forEach((t: any) => {
        // Check if it's a debit transaction (case insensitive)
        const isDebit = t.type?.toLowerCase() === 'debit'
        if (isDebit && t.amount > 0) {
          const cat = t.category || 'Miscellaneous'
          if (!categoryMap[cat]) {
            categoryMap[cat] = { total: 0, count: 0 }
          }
          categoryMap[cat].total += t.amount
          categoryMap[cat].count += 1
        }
      })

      console.log('📊 Category map:', categoryMap)

      const totalSpent = Object.values(categoryMap).reduce((sum, cat) => sum + cat.total, 0)
      console.log('💰 Total spent:', totalSpent)

      // Build category data
      const categoryDataArray: SpendingItem[] = Object.entries(categoryMap)
        .map(([category, data]) => {
          const percentage = totalSpent > 0 ? (data.total / totalSpent) * 100 : 0
          
          return {
            id: category,
            category: category,
            color: colorMap[category] || defaultColors[Object.keys(categoryMap).indexOf(category) % defaultColors.length],
            amount: Math.round(data.total * 100) / 100,
            percentage: Math.round(percentage * 100) / 100,
            transactions: data.count,
            change: 0
          }
        })
        .sort((a, b) => b.amount - a.amount)

      console.log('📊 Final category data:', categoryDataArray)
      setCategoryData(categoryDataArray)

    } catch (error: any) {
      console.error('❌ Error loading top spending:', error)
      setError(error.message || 'Failed to load top spending')
    } finally {
      setLoading(false)
    }
  }

  const totalSpent = categoryData.reduce((sum, item) => sum + item.amount, 0)

  // Get top 5 categories for the summary
  const topCategories = categoryData.slice(0, 5)

  // Filter data based on search
  const filteredCategories = categoryData.filter(item =>
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
        <span className="ml-3 text-gray-500">Loading top spending...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600">{error}</p>
        <button 
          onClick={loadTopSpending}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (categoryData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <Award className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No spending data available</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload transactions to see your top spending
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl shadow-card-dark p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-electric-blue/10 rounded-lg">
            <Award className="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy">Top Spending Categories</h3>
            <p className="text-xs text-gray-400">See where your money goes</p>
          </div>
        </div>
        <button 
          onClick={loadTopSpending}
          className="px-3 py-1.5 bg-electric-blue text-white rounded-lg text-xs hover:bg-electric-blue/90"
        >
          Refresh
        </button>
      </div>

      {/* Top 5 Category Cards */}
      {topCategories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {topCategories.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white/30"
                    style={{ backgroundColor: item.color }}
                  />
                  <p className="text-xs font-medium text-white truncate">
                    #{index + 1} {item.category}
                  </p>
                </div>
                <span className="text-xs font-bold text-white">
                  GH₵{item.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-blue-200">
                  {item.percentage.toFixed(1)}% of total
                </span>
              </div>
              <div className="mt-2 w-full bg-white/20 rounded-full h-1">
                <div
                  className="h-1 rounded-full transition-all duration-500 bg-white"
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-blue-200 mt-1">
                {item.transactions} transactions
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Full List */}
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-sm font-semibold text-navy">All Categories</h4>
            <p className="text-xs text-gray-400 mt-0.5">
              {categoryData.length} categories tracked
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue w-full sm:w-40"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No categories match your search
            </div>
          ) : (
            filteredCategories.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-gray-50/80 rounded-lg hover:bg-gray-100/90 transition-colors group border border-transparent hover:border-gray-200"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {item.category}
                  </span>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {item.transactions} txns
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-xs text-gray-500 w-16 text-right">
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span className="text-sm font-semibold text-navy w-24 text-right">
                    GH₵{item.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {categoryData.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Total: GH₵{totalSpent.toFixed(2)}</span>
              <span>{categoryData.length} categories</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Insight */}
      {topCategories.length > 0 && (
        <div className="bg-gradient-to-br from-electric-blue/5 via-blue-500/5 to-blue-400/5 border border-electric-blue/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-electric-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-navy">Quick Insight</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Your top category is <span className="font-semibold text-navy">{topCategories[0].category}</span> at 
                <span className="font-semibold text-navy"> GH₵{topCategories[0].amount.toFixed(2)}</span> 
                ({topCategories[0].percentage.toFixed(1)}% of total spending).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}