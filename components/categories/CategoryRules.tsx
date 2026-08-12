// components/categories/CategoryRules.tsx

'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  ChevronRight, 
  Search, 
  Users,
  RefreshCw,
  Eye,
  ArrowDown,
  ArrowUp,
  Save
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RecategorizeModal } from '@/components/transactions/RecategorizeModal'

interface Rule {
  id: string
  category: string
  keyword: string
  matchType: 'contains' | 'exact' | 'starts_with'
  merchant?: string
}

interface Category {
  id: string
  name: string
  color: string
}

export function CategoryRules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newRule, setNewRule] = useState({ 
    category: '', 
    keyword: '', 
    matchType: 'contains' as const,
    merchant: '' 
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    category: string
    keyword: string
    matchType: string
    merchant: string
  }>({
    category: '',
    keyword: '',
    matchType: 'contains',
    merchant: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [merchantList, setMerchantList] = useState<string[]>([])
  const [newMerchant, setNewMerchant] = useState('')
  const [showMerchantInput, setShowMerchantInput] = useState(false)

  // Miscellaneous Review Modal State
  const [miscModal, setMiscModal] = useState<{
    isOpen: boolean
    transactions: any[]
    loading: boolean
  }>({
    isOpen: false,
    transactions: [],
    loading: false
  })
  const [miscSearchTerm, setMiscSearchTerm] = useState('')
  const [miscCurrentPage, setMiscCurrentPage] = useState(1)
  const miscItemsPerPage = 10

  // Recategorize Modal State
  const [recategorizeModal, setRecategorizeModal] = useState<{
    isOpen: boolean
    transaction: any | null
  }>({
    isOpen: false,
    transaction: null
  })

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Load categories - include system categories (user_id IS NULL) AND user's categories
      const { data: catData } = await supabase
        .from('categories')
        .select('id, name, color')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)
        .order('name', { ascending: true })

      if (catData) {
        console.log('📊 Categories loaded:', catData.length)
        setCategories(catData)
      }

      // Load rules from category_rules table
      const { data: ruleData } = await supabase
        .from('category_rules')
        .select('*')
        .eq('user_id', session.user.id)

      if (ruleData) {
        setRules(ruleData.map((r: any) => ({
          id: r.id,
          category: r.category_name || r.category_id,
          keyword: r.keyword,
          matchType: r.match_type || 'contains',
          merchant: r.merchant || '',
        })))
      }

      // Load unique merchants from transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('to_name, from_name')
        .eq('user_id', session.user.id)

      if (txData) {
        const merchants = new Set<string>()
        txData.forEach((t: any) => {
          if (t.to_name && t.to_name.length > 2) merchants.add(t.to_name)
          if (t.from_name && t.from_name.length > 2) merchants.add(t.from_name)
        })
        setMerchantList(Array.from(merchants).sort())
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRule = async () => {
    if (!newRule.category || !newRule.keyword) {
      alert('Please select a category and enter a keyword')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const categoryObj = categories.find(c => c.name === newRule.category)
      
      const { data, error } = await supabase
        .from('category_rules')
        .insert({
          user_id: session.user.id,
          category_id: categoryObj?.id,
          category_name: newRule.category,
          keyword: newRule.keyword.toLowerCase(),
          match_type: newRule.matchType,
          merchant: newRule.merchant || null,
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error

      if (data) {
        setRules([...rules, {
          id: data[0].id,
          category: newRule.category,
          keyword: newRule.keyword,
          matchType: newRule.matchType,
          merchant: newRule.merchant,
        }])
      }

      setNewRule({ category: '', keyword: '', matchType: 'contains', merchant: '' })
      setShowAddModal(false)
      setShowMerchantInput(false)
    } catch (error: any) {
      console.error('Error adding rule:', error)
      alert('Failed to add rule: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { error } = await supabase
        .from('category_rules')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error

      setRules(rules.filter(r => r.id !== id))
    } catch (error: any) {
      console.error('Error deleting rule:', error)
      alert('Failed to delete rule: ' + error.message)
    }
  }

  const startEditing = (rule: Rule) => {
    setEditingId(rule.id)
    setEditValues({
      category: rule.category,
      keyword: rule.keyword,
      matchType: rule.matchType,
      merchant: rule.merchant || ''
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditValues({
      category: '',
      keyword: '',
      matchType: 'contains',
      merchant: ''
    })
  }

  const handleSaveEdit = async (id: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const updateData: any = {
        category_name: editValues.category,
        keyword: editValues.keyword.toLowerCase(),
        match_type: editValues.matchType,
        merchant: editValues.merchant || null,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('category_rules')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (error) throw error

      setRules(rules.map(r => 
        r.id === id ? { 
          ...r, 
          category: editValues.category,
          keyword: editValues.keyword,
          matchType: editValues.matchType as any,
          merchant: editValues.merchant || ''
        } : r
      ))

      cancelEditing()
    } catch (error: any) {
      console.error('Error updating rule:', error)
      alert('Failed to update rule: ' + error.message)
    }
  }

  const handleEditChange = (field: keyof typeof editValues, value: string) => {
    setEditValues(prev => ({ ...prev, [field]: value }))
  }

  const addMerchant = () => {
    if (newMerchant.trim() && !merchantList.includes(newMerchant.trim())) {
      setMerchantList([...merchantList, newMerchant.trim()])
      setNewRule({ ...newRule, merchant: newMerchant.trim() })
      setNewMerchant('')
    }
  }

  // ============================================================
  // Miscellaneous Review Functions
  // ============================================================

  const openMiscModal = async () => {
    setMiscModal({
      isOpen: true,
      transactions: [],
      loading: true
    })
    setMiscSearchTerm('')
    setMiscCurrentPage(1)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Fetch all Miscellaneous transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .or('category.eq.Miscellaneous,category.eq.Uncategorized,category.is.null')
        .order('date', { ascending: false })

      if (error) throw error

      setMiscModal(prev => ({
        ...prev,
        transactions: data || [],
        loading: false
      }))
    } catch (error: any) {
      console.error('Error fetching miscellaneous transactions:', error)
      setMiscModal(prev => ({
        ...prev,
        loading: false
      }))
    }
  }

  const closeMiscModal = () => {
    setMiscModal({
      isOpen: false,
      transactions: [],
      loading: false
    })
  }

  const filteredMiscTransactions = miscModal.transactions.filter(t =>
    t.description?.toLowerCase().includes(miscSearchTerm.toLowerCase()) ||
    t.reference?.toLowerCase().includes(miscSearchTerm.toLowerCase()) ||
    t.from_name?.toLowerCase().includes(miscSearchTerm.toLowerCase()) ||
    t.to_name?.toLowerCase().includes(miscSearchTerm.toLowerCase())
  )

  const miscTotalPages = Math.ceil(filteredMiscTransactions.length / miscItemsPerPage)
  const paginatedMiscTransactions = filteredMiscTransactions.slice(
    (miscCurrentPage - 1) * miscItemsPerPage,
    miscCurrentPage * miscItemsPerPage
  )

  const miscTotalAmount = miscModal.transactions.reduce((sum, t) => sum + t.amount, 0)

  const handleRecategorize = (transaction: any) => {
    setRecategorizeModal({
      isOpen: true,
      transaction
    })
  }

  const handleRecategorizeSuccess = () => {
    // Refresh the misc modal transactions
    openMiscModal()
    // Also refresh rules
    loadData()
  }

  const filteredRules = rules.filter(r =>
    r.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.merchant && r.merchant.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
        <span className="ml-3 text-gray-500">Loading rules...</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-navy">Category Rules</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Auto-assign transactions to categories based on keywords or merchants
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue w-full sm:w-40"
                />
              </div>
              <button 
                onClick={openMiscModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                Review Miscellaneous
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {filteredRules.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No rules created yet
              </div>
            ) : (
              filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg hover:bg-gray-100/90 transition-colors group border border-transparent hover:border-gray-200"
                >
                  <div className="flex-1 flex items-center gap-3 text-sm flex-wrap">
                    {editingId === rule.id ? (
                      <>
                        <select
                          value={editValues.category}
                          onChange={(e) => handleEditChange('category', e.target.value)}
                          className="px-2 py-1 border border-electric-blue rounded-lg text-sm focus:outline-none"
                          autoFocus
                        >
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                          ))}
                        </select>
                        <select
                          value={editValues.matchType}
                          onChange={(e) => handleEditChange('matchType', e.target.value)}
                          className="px-2 py-1 border border-electric-blue rounded-lg text-sm focus:outline-none"
                        >
                          <option value="contains">contains</option>
                          <option value="exact">exact</option>
                          <option value="starts_with">starts with</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Keyword"
                          value={editValues.keyword}
                          onChange={(e) => handleEditChange('keyword', e.target.value)}
                          className="px-2 py-1 border border-electric-blue rounded-lg text-sm focus:outline-none"
                        />
                        <input
                          type="text"
                          placeholder="Merchant (optional)"
                          value={editValues.merchant}
                          onChange={(e) => handleEditChange('merchant', e.target.value)}
                          className="px-2 py-1 border border-electric-blue rounded-lg text-sm focus:outline-none w-32"
                        />
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-gray-700 bg-electric-blue/10 px-2 py-0.5 rounded">
                          {rule.category}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-gray-600 font-mono">"{rule.keyword}"</span>
                        {rule.merchant && (
                          <>
                            <span className="text-gray-400">for</span>
                            <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">
                              <Users className="w-3 h-3 inline mr-0.5" />
                              {rule.merchant}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">
                          {rule.matchType}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingId === rule.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(rule.id)}
                          className="p-1.5 text-emerald-500 hover:text-emerald-700 rounded-md hover:bg-emerald-50 transition-colors"
                          title="Save"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditing(rule)}
                          className="p-1.5 text-gray-400 hover:text-electric-blue rounded-md hover:bg-white transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(rule.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-500 rounded-md hover:bg-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-blue-700">
                  Rules are applied in order. When a transaction matches a rule, it's assigned to that category.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  <span className="font-medium">Tip:</span> Add more specific rules first, then general ones.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Rule Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-card-dark max-w-md w-full p-6 animate-scale-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-navy">Create New Rule</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setShowMerchantInput(false)
                  }}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newRule.category}
                    onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                  >
                    <option value="">Select a category</option>
                    {categories.filter(cat => cat.name !== 'Miscellaneous').map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Match Type
                  </label>
                  <select
                    value={newRule.matchType}
                    onChange={(e) => setNewRule({ ...newRule, matchType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                  >
                    <option value="contains">Contains</option>
                    <option value="exact">Exact Match</option>
                    <option value="starts_with">Starts With</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keyword
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., uber, food, electricity"
                    value={newRule.keyword}
                    onChange={(e) => setNewRule({ ...newRule, keyword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Merchant (optional)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMerchantInput(!showMerchantInput)}
                      className="text-xs text-electric-blue hover:underline"
                    >
                      {showMerchantInput ? 'Hide' : 'Add new merchant'}
                    </button>
                  </div>
                  
                  {showMerchantInput ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Enter merchant name..."
                        value={newMerchant}
                        onChange={(e) => setNewMerchant(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                      />
                      <button
                        onClick={addMerchant}
                        className="px-3 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm"
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <select
                      value={newRule.merchant}
                      onChange={(e) => setNewRule({ ...newRule, merchant: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                    >
                      <option value="">No merchant filter</option>
                      {merchantList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {newRule.merchant ? `Rule will apply only to transactions with merchant: ${newRule.merchant}` : 'Leave empty to apply to all transactions'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setShowMerchantInput(false)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  className="flex-1 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
                >
                  Create Rule
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Miscellaneous Review Modal */}
      {miscModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-400" />
                <div>
                  <h2 className="text-lg font-semibold text-navy">Miscellaneous Transactions</h2>
                  <p className="text-xs text-gray-400">
                    {miscModal.transactions.length} transactions • Total: GH₵{miscTotalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    <span className="font-medium">Tip:</span> Recategorize these transactions to create new rules
                  </p>
                </div>
              </div>
              <button
                onClick={closeMiscModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={miscSearchTerm}
                  onChange={(e) => setMiscSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                />
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-4">
              {miscModal.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
                </div>
              ) : filteredMiscTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">
                    {miscSearchTerm ? 'No transactions match your search' : 'No miscellaneous transactions found'}
                  </p>
                  {miscSearchTerm && (
                    <button 
                      onClick={() => setMiscSearchTerm('')}
                      className="mt-2 text-electric-blue hover:underline text-sm"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedMiscTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {t.description || t.reference || 'Transaction'}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                          <span>{new Date(t.date).toLocaleDateString()}</span>
                          {t.from_name && <span>From: {t.from_name}</span>}
                          {t.to_name && <span>To: {t.to_name}</span>}
                          {t.reference && <span>Ref: {t.reference}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1 font-medium text-sm ${
                          t.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.type === 'credit' ? (
                            <ArrowDown className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowUp className="w-3.5 h-3.5" />
                          )}
                          GH₵{t.amount.toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleRecategorize(t)}
                          className="flex items-center gap-1 px-2 py-1 bg-electric-blue text-white text-xs rounded-lg hover:bg-electric-blue/90 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Recategorize
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredMiscTransactions.length > miscItemsPerPage && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Showing {((miscCurrentPage - 1) * miscItemsPerPage) + 1} - {Math.min(miscCurrentPage * miscItemsPerPage, filteredMiscTransactions.length)} of {filteredMiscTransactions.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMiscCurrentPage(p => Math.max(1, p - 1))}
                    disabled={miscCurrentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-400">
                    Page {miscCurrentPage} of {miscTotalPages}
                  </span>
                  <button
                    onClick={() => setMiscCurrentPage(p => Math.min(miscTotalPages, p + 1))}
                    disabled={miscCurrentPage === miscTotalPages}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recategorize Modal */}
      <RecategorizeModal
        isOpen={recategorizeModal.isOpen}
        onClose={() => setRecategorizeModal({ isOpen: false, transaction: null })}
        transaction={recategorizeModal.transaction}
        onSuccess={handleRecategorizeSuccess}
      />
    </>
  )
}