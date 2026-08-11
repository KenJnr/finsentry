// components/insights/SavingsTips.tsx

'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, TrendingUp, TrendingDown, Clock, Target, AlertCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Tip {
  id: string
  category: string
  amount: number
  percentage: number
  transactions: number
  suggestion: string
  potentialSavings: string
  color: string
}

export function SavingsTips() {
  const [tips, setTips] = useState<Tip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTips()
  }, [])

  const loadTips = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view tips')
        setLoading(false)
        return
      }

      // Fetch ALL transactions
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)

      if (txError) {
        console.error('❌ Transactions error:', txError)
        throw txError
      }

      if (!transactions || transactions.length === 0) {
        setTips([])
        setLoading(false)
        return
      }

      // Calculate category spending
      const categoryMap: Record<string, { total: number; count: number }> = {}
      
      transactions.forEach((t: any) => {
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

      const totalSpent = Object.values(categoryMap).reduce((sum, cat) => sum + cat.total, 0)

      // Sort categories by amount (highest first)
      const sortedCategories = Object.entries(categoryMap)
        .map(([category, data]) => ({
          category,
          amount: data.total,
          percentage: totalSpent > 0 ? (data.total / totalSpent) * 100 : 0,
          transactions: data.count
        }))
        .sort((a, b) => b.amount - a.amount)

      // Generate tips for top categories
      const generatedTips: Tip[] = sortedCategories.slice(0, 4).map((item, index) => {
        const colors = [
          'from-amber-500 to-amber-400',
          'from-blue-500 to-blue-400',
          'from-purple-500 to-purple-400',
          'from-emerald-500 to-emerald-400',
          'from-rose-500 to-rose-400',
          'from-indigo-500 to-indigo-400'
        ]

        const suggestions: Record<string, (amount: number, percentage: number) => { suggestion: string; potentialSavings: string }> = {
          'Food & Dining': (amount, percentage) => ({
            suggestion: `You spent GH₵${amount.toFixed(0)} on Food & Dining (${percentage.toFixed(1)}% of total spending). Cooking at home just 2 extra days a week could significantly reduce this.`,
            potentialSavings: `GH₵${Math.round(amount * 0.15)}`
          }),
          'Shopping': (amount, percentage) => ({
            suggestion: `Shopping expenses are at GH₵${amount.toFixed(0)} (${percentage.toFixed(1)}% of total). Consider creating a shopping list and waiting 24 hours before making non-essential purchases.`,
            potentialSavings: `GH₵${Math.round(amount * 0.2)}`
          }),
          'Transport': (amount, percentage) => ({
            suggestion: `Transport costs GH₵${amount.toFixed(0)} (${percentage.toFixed(1)}% of total). Try carpooling or using public transport 2 days a week to save.`,
            potentialSavings: `GH₵${Math.round(amount * 0.15)}`
          }),
          'Entertainment': (amount, percentage) => ({
            suggestion: `You're spending GH₵${amount.toFixed(0)} on entertainment (${percentage.toFixed(1)}%). Look for free local events or limit paid entertainment to once a week.`,
            potentialSavings: `GH₵${Math.round(amount * 0.25)}`
          }),
          'Bills & Utilities': (amount, percentage) => ({
            suggestion: `Utilities cost GH₵${amount.toFixed(0)} (${percentage.toFixed(1)}%). Consider energy-saving habits like unplugging devices and using natural light.`,
            potentialSavings: `GH₵${Math.round(amount * 0.1)}`
          }),
          'Health': (amount, percentage) => ({
            suggestion: `Health expenses are GH₵${amount.toFixed(0)} (${percentage.toFixed(1)}%). Consider meal prepping and home workouts to reduce costs.`,
            potentialSavings: `GH₵${Math.round(amount * 0.1)}`
          }),
          'Education': (amount, percentage) => ({
            suggestion: `Education spending is GH₵${amount.toFixed(0)} (${percentage.toFixed(1)}%). Look for free online resources or library memberships.`,
            potentialSavings: `GH₵${Math.round(amount * 0.15)}`
          }),
          'Cash Withdrawal': (amount, percentage) => ({
            suggestion: `You've withdrawn GH₵${amount.toFixed(0)} in cash (${percentage.toFixed(1)}%). Track your cash spending more closely to avoid unnecessary expenses.`,
            potentialSavings: `GH₵${Math.round(amount * 0.1)}`
          }),
          'Gifts & Donations': (amount, percentage) => ({
            suggestion: `Gifts and donations total GH₵${amount.toFixed(0)} (${percentage.toFixed(1)}%). Consider setting a monthly budget for gifts and donations.`,
            potentialSavings: `GH₵${Math.round(amount * 0.15)}`
          }),
          'Telecom': (amount, percentage) => ({
            suggestion: `Telecom expenses are GH₵${amount.toFixed(0)} (${percentage.toFixed(1)}%). Review your data plan and consider bundle packages to save.`,
            potentialSavings: `GH₵${Math.round(amount * 0.15)}`
          })
        }

        const defaultSuggestion = (amount: number, percentage: number) => ({
          suggestion: `You spent GH₵${amount.toFixed(0)} on ${item.category} (${percentage.toFixed(1)}% of total). Consider tracking this category more closely and setting a monthly limit.`,
          potentialSavings: `GH₵${Math.round(amount * 0.1)}`
        })

        const getSuggestion = suggestions[item.category] || defaultSuggestion
        const { suggestion, potentialSavings } = getSuggestion(item.amount, item.percentage)

        return {
          id: `tip-${index}`,
          category: item.category,
          amount: item.amount,
          percentage: item.percentage,
          transactions: item.transactions,
          suggestion,
          potentialSavings,
          color: colors[index % colors.length]
        }
      })

      setTips(generatedTips)

    } catch (error: any) {
      console.error('❌ Error loading tips:', error)
      setError(error.message || 'Failed to load tips')
    } finally {
      setLoading(false)
    }
  }

  // Get icon based on category
  const getIcon = (category: string) => {
    const iconMap: Record<string, any> = {
      'Food & Dining': TrendingDown,
      'Shopping': TrendingDown,
      'Transport': Clock,
      'Entertainment': Target,
      'Bills & Utilities': Clock,
      'Health': TrendingDown,
      'Education': Target,
      'Cash Withdrawal': TrendingDown,
      'Gifts & Donations': TrendingUp,
      'Telecom': Clock
    }
    return iconMap[category] || Lightbulb
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
        <span className="ml-3 text-gray-500">Generating personalized tips...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600">{error}</p>
        <button 
          onClick={loadTips}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  if (tips.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">No tips available</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload transactions to get personalized savings tips
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 rounded-xl shadow-card-dark p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-white/20 rounded-lg flex-shrink-0">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Smart Money Tips</h2>
            <p className="text-blue-100 text-sm mt-0.5">
              Personalized tips based on your top spending categories
            </p>
          </div>
        </div>
      </div>

      {/* Tips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {tips.map((tip) => {
          const Icon = getIcon(tip.category)
          return (
            <div
              key={tip.id}
              className="bg-white rounded-xl shadow-card-dark p-5 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]"
            >
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${tip.color} text-white flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-navy">{tip.category}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    {tip.suggestion}
                  </p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="text-emerald-500">💰</span>
                      Save {tip.potentialSavings}
                    </span>
                    <span className="text-xs text-gray-400">
                      {tip.transactions} transactions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}