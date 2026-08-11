// components/budget/BudgetForm.tsx

'use client'

import { useState, useEffect } from 'react'
import { X, Bell, BellOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface BudgetFormProps {
  onClose: () => void
  onSave: () => void
  editBudget?: {
    id: string
    category: string
    amount: number
    month: string
    notify_at_80: boolean
    notify_at_100: boolean
  } | null
}

export function BudgetForm({ onClose, onSave, editBudget }: BudgetFormProps) {
  const [budget, setBudget] = useState({
    category: '',
    amount: '',
    month: new Date().toISOString().slice(0, 7),
    notify_at_80: true,
    notify_at_100: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    loadCategories()
    if (editBudget) {
      setBudget({
        category: editBudget.category,
        amount: editBudget.amount.toString(),
        month: editBudget.month.slice(0, 7),
        notify_at_80: editBudget.notify_at_80,
        notify_at_100: editBudget.notify_at_100
      })
    }
  }, [editBudget])

  const loadCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('name')

      if (error) throw error
      
      const names = data?.map((c: any) => c.name) || []
      setCategories(names)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!budget.category || !budget.amount || parseFloat(budget.amount) <= 0) {
      setError('Please fill in all fields correctly')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in')
        return
      }

      const monthDate = new Date(budget.month + '-01').toISOString()

      if (editBudget) {
        // Update existing budget - allow changing category and month
        const { error: updateError } = await supabase
          .from('budgets')
          .update({
            category: budget.category,
            amount: parseFloat(budget.amount),
            month: monthDate,
            notify_at_80: budget.notify_at_80,
            notify_at_100: budget.notify_at_100,
            updated_at: new Date().toISOString()
          })
          .eq('id', editBudget.id)
          .eq('user_id', session.user.id)

        if (updateError) throw updateError
      } else {
        // Check if budget already exists for this category and month
        const { data: existing } = await supabase
          .from('budgets')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('category', budget.category)
          .eq('month', monthDate)
          .maybeSingle()

        if (existing) {
          setError('A budget already exists for this category and month')
          setLoading(false)
          return
        }

        // Create new budget
        const { error: insertError } = await supabase
          .from('budgets')
          .insert({
            user_id: session.user.id,
            category: budget.category,
            amount: parseFloat(budget.amount),
            month: monthDate,
            notify_at_80: budget.notify_at_80,
            notify_at_100: budget.notify_at_100
          })

        if (insertError) throw insertError
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving budget:', error)
      setError(error.message || 'Failed to save budget')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-card-dark max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-navy">
            {editBudget ? 'Edit Budget' : 'Set Monthly Budget'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={budget.category}
                onChange={(e) => setBudget({ ...budget, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {editBudget && (
                <p className="text-xs text-amber-600 mt-1">Changing category will update the budget</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Budget (GH₵)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">GH₵</span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={budget.amount}
                  onChange={(e) => setBudget({ ...budget, amount: e.target.value })}
                  className="w-full pl-12 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Month
              </label>
              <input
                type="month"
                value={budget.month}
                onChange={(e) => setBudget({ ...budget, month: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
              />
              {editBudget && (
                <p className="text-xs text-amber-600 mt-1">Changing month will create a new budget for that month</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email Notifications
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={budget.notify_at_80}
                    onChange={(e) => setBudget({ ...budget, notify_at_80: e.target.checked })}
                    className="w-4 h-4 text-electric-blue border-gray-300 rounded focus:ring-electric-blue"
                  />
                  <Bell className="w-4 h-4 text-amber-500" />
                  Notify when 80% of budget is used
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={budget.notify_at_100}
                    onChange={(e) => setBudget({ ...budget, notify_at_100: e.target.checked })}
                    className="w-4 h-4 text-electric-blue border-gray-300 rounded focus:ring-electric-blue"
                  />
                  <Bell className="w-4 h-4 text-rose-500" />
                  Notify when 100% of budget is reached
                </label>
              </div>
            </div>

            {error && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
                {error}
              </div>
            )}

            
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (editBudget ? 'Update Budget' : 'Set Budget')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}