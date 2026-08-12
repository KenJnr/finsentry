// components/budget/BudgetList.tsx

'use client'

import { useState, useEffect } from 'react'
import { 
  Edit2, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Search,
  Loader2,
  Bell,
  BellOff,
  Calendar
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { BudgetForm } from './BudgetForm'

interface BudgetItem {
  id: string
  category: string
  color: string
  budgeted: number
  actual: number
  remaining: number
  status: 'under' | 'over' | 'on-track'
  period_type: 'weekly' | 'monthly' | 'yearly'
  period_start: string
  notify_at_80: boolean
  notify_at_100: boolean
}

interface BudgetListProps {
  refreshTrigger?: number
}

export function BudgetList({ refreshTrigger = 0 }: BudgetListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [budgets, setBudgets] = useState<BudgetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingBudget, setEditingBudget] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})
  const [periodFilter, setPeriodFilter] = useState<'all' | 'weekly' | 'monthly' | 'yearly'>('all')

  const defaultColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#EC4899', '#14B8A6', '#F97316', '#6B7280', '#7C3AED'
  ]

  useEffect(() => {
    loadBudgets()
  }, [refreshTrigger])

  const loadBudgets = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view budgets')
        setLoading(false)
        return
      }

      const { data: categoriesData } = await supabase
        .from('categories')
        .select('name, color')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)

      const colorMap: Record<string, string> = {}
      categoriesData?.forEach((cat: any, index: number) => {
        colorMap[cat.name] = cat.color || defaultColors[index % defaultColors.length]
      })
      setCategoryColors(colorMap)

      const now = new Date()
      const currentMonth = now.toISOString().slice(0, 7)
      const currentYear = now.getFullYear().toString()
      
      // Get start of current week (Monday)
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const currentWeek = new Date(now)
      currentWeek.setDate(diff)
      const weekStart = currentWeek.toISOString().slice(0, 10)

      // Fetch budgets - using proper date filtering
      const { data: budgetData, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', session.user.id)
        .or(
          `period_type.eq.weekly,` +
          `and(period_type.eq.monthly,period_start.gte.${currentMonth}-01,period_start.lt.${currentMonth}-31),` +
          `and(period_type.eq.yearly,period_start.gte.${currentYear}-01-01,period_start.lt.${parseInt(currentYear) + 1}-01-01)`
        )

      if (budgetError) throw budgetError

      if (!budgetData || budgetData.length === 0) {
        setBudgets([])
        setLoading(false)
        return
      }

      // Get period start date for transactions
      const periodStart = budgetData.some(b => b.period_type === 'weekly') 
        ? weekStart 
        : currentMonth + '-01'

      // Fetch transactions with proper date filter
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

      const budgetItems: BudgetItem[] = budgetData.map((b: any) => {
        const actual = actualSpending[b.category] || 0
        const remaining = b.amount - actual
        let status: 'under' | 'over' | 'on-track' = 'under'
        if (remaining < 0) status = 'over'
        else if (remaining < b.amount * 0.1) status = 'on-track'

        return {
          id: b.id,
          category: b.category,
          color: colorMap[b.category] || '#6B7280',
          budgeted: b.amount,
          actual: Math.round(actual * 100) / 100,
          remaining: Math.round(remaining * 100) / 100,
          status,
          period_type: b.period_type || 'monthly',
          period_start: b.period_start,
          notify_at_80: b.notify_at_80,
          notify_at_100: b.notify_at_100
        }
      })

      setBudgets(budgetItems)

    } catch (error: any) {
      console.error('Error loading budgets:', error)
      setError(error.message || 'Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error

      loadBudgets()
    } catch (error: any) {
      console.error('Error deleting budget:', error)
      alert('Failed to delete budget: ' + error.message)
    }
  }

  const filteredBudgets = budgets.filter(b => {
    const matchesSearch = b.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPeriod = periodFilter === 'all' || b.period_type === periodFilter
    return matchesSearch && matchesPeriod
  })

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-electric-blue animate-spin" />
        <span className="ml-3 text-gray-500">Loading budgets...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600">{error}</p>
        <button 
          onClick={loadBudgets}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-navy">Budget Categories</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue bg-white"
            >
              <option value="all">All Periods</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue w-full sm:w-48"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {budgets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No budgets found. Set a budget to start tracking.
            </div>
          ) : filteredBudgets.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No budgets match your filters
            </div>
          ) : (
            filteredBudgets.map((budget) => {
              const percentage = Math.min((budget.actual / budget.budgeted) * 100, 100)
              const isOver = budget.status === 'over'
              const isNearLimit = percentage >= 80 && !isOver
              const periodLabel = budget.period_type === 'weekly' ? 'Weekly' : 
                                  budget.period_type === 'yearly' ? 'Yearly' : 'Monthly'
              
              return (
                <div
                  key={budget.id}
                  className={`p-4 bg-gray-100/50 rounded-xl hover:bg-gray-100/90 transition-colors group border ${
                    isOver ? 'border-rose-200' : isNearLimit ? 'border-amber-200' : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: budget.color }}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {budget.category}
                        </span>
                        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {periodLabel}
                        </span>
                        {isOver && (
                          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            ⚠️ Over Budget
                          </span>
                        )}
                        {isNearLimit && !isOver && (
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            ⚡ Near Limit
                          </span>
                        )}
                        {(budget.notify_at_80 || budget.notify_at_100) && (
                          <Bell className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                        <span>Budget: <span className="font-semibold text-navy">GH₵{budget.budgeted.toFixed(2)}</span></span>
                        <span>•</span>
                        <span>Spent: <span className={`font-semibold ${isOver ? 'text-rose-600' : 'text-gray-700'}`}>GH₵{budget.actual.toFixed(2)}</span></span>
                        <span>•</span>
                        <span className={budget.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          Remaining: GH₵{Math.abs(budget.remaining).toFixed(2)}
                        </span>
                        <span>•</span>
                        {budget.status === 'under' && <span className="text-emerald-600">Under Budget</span>}
                        {budget.status === 'over' && <span className="text-rose-600">Over Budget</span>}
                        {budget.status === 'on-track' && <span className="text-blue-600">On Track</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingBudget({
                            id: budget.id,
                            category: budget.category,
                            amount: budget.budgeted,
                            period_type: budget.period_type,
                            period_start: budget.period_start,
                            notify_at_80: budget.notify_at_80,
                            notify_at_100: budget.notify_at_100
                          })
                          setShowEditModal(true)
                        }}
                        className="p-1.5 text-gray-400 hover:text-electric-blue rounded-md hover:bg-white transition-colors"
                        title="Edit budget"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(budget.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-500 rounded-md hover:bg-white transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isOver ? 'bg-rose-500' : isNearLimit ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>0%</span>
                      <span>{percentage.toFixed(0)}% used</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {showEditModal && (
        <BudgetForm
          onClose={() => {
            setShowEditModal(false)
            setEditingBudget(null)
          }}
          onSave={() => {
            loadBudgets()
            setShowEditModal(false)
            setEditingBudget(null)
          }}
          editBudget={editingBudget}
        />
      )}
    </>
  )
}