// components/transactions/RecategorizeModal.tsx

'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface RecategorizeModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: {
    id: string
    description: string
    reference: string
    category: string
    amount: number
    type?: string
    date?: string
  } | null
  onSuccess: () => void
}

export function RecategorizeModal({
  isOpen,
  onClose,
  transaction,
  onSuccess
}: RecategorizeModalProps) {
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [saveAsRule, setSaveAsRule] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCategories()
      setSelectedCategory('')
      setError(null)
      setSaveAsRule(true)
    }
  }, [isOpen])

  const loadCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) throw new Error('Failed to fetch categories')

      const data = await response.json()
      
      // Filter out Miscellaneous
      const filtered = data.categories?.filter((c: any) => c.name !== 'Miscellaneous') || []
      setCategories(filtered)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const handleRecategorize = async () => {
    if (!selectedCategory) {
      setError('Please select a category')
      return
    }

    if (!transaction) {
      setError('No transaction selected')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // Find the selected category details
      const category = categories.find(c => c.id === selectedCategory)
      if (!category) throw new Error('Category not found')

      // Update the transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          category: category.name,
          is_manual: true,
          original_category: transaction.category || 'Uncategorized',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id)
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      // If saveAsRule is true, create a new rule
      if (saveAsRule) {
        const keyword = transaction.reference || transaction.description || ''
        if (keyword) {
          const { error: ruleError } = await supabase
            .from('category_rules')
            .upsert({
              user_id: session.user.id,
              category_id: category.id,
              keyword: keyword.toLowerCase().trim(),
              is_exact_match: true,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,keyword'
            })

          if (ruleError) {
            console.error('Error creating rule:', ruleError)
          } else {
            console.log('✅ Rule created for:', keyword)
          }
        }
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error recategorizing:', error)
      setError(error.message || 'Failed to recategorize')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !transaction) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-navy">Recategorize Transaction</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              This will update the transaction and optionally create a rule
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Transaction Info */}
          <div className="p-3 bg-gray-50 rounded-lg space-y-1">
            <p className="text-sm font-medium text-gray-700">
              {transaction.description || transaction.reference || 'Transaction'}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span>Amount: GH₵{transaction.amount?.toFixed(2) || '0.00'}</span>
              <span>Type: {transaction.type === 'credit' ? '💰 Inflow' : '💸 Outflow'}</span>
              <span>Current: <span className="text-gray-700">{transaction.category || 'Uncategorized'}</span></span>
            </div>
            {transaction.date && (
              <div className="text-xs text-gray-400">
                Date: {new Date(transaction.date).toLocaleDateString()}
              </div>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Save as Rule */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="saveAsRule"
              checked={saveAsRule}
              onChange={(e) => setSaveAsRule(e.target.checked)}
              className="w-4 h-4 text-electric-blue border-gray-300 rounded focus:ring-electric-blue"
            />
            <label htmlFor="saveAsRule" className="text-sm text-gray-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-electric-blue" />
              Save as rule for future transactions
            </label>
          </div>

          {error && (
            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRecategorize}
              disabled={loading || !selectedCategory}
              className="flex-1 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </div>
              ) : (
                'Save & Create Rule'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}