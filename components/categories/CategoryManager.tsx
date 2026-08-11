// components/categories/CategoryManager.tsx

'use client'

import { useState, useEffect } from 'react'
import { 
  Edit2, 
  Trash2, 
  Plus, 
  X, 
  Search,
  Tag,
  Layers,
  Wallet,
  TrendingUp,
  AlertCircle,
  Eye,
  ArrowDown,
  ArrowUp
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Category {
  id: string
  name: string
  color: string
  transactionCount: number
  totalAmount: number
  rules: string[]
  is_system?: boolean
}

interface CategoryManagerProps {
  onAddCategory?: () => void
  showAddModal?: boolean
  onCloseModal?: () => void
  onCategoryUpdated?: () => void
}

export function CategoryManager({ 
  onAddCategory, 
  showAddModal = false, 
  onCloseModal,
  onCategoryUpdated 
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [localShowModal, setLocalShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: '',
    color: '#3B82F6',
    keywords: ''
  })

  // View Transactions Modal State
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean
    categoryName: string
    categoryColor: string
    transactions: any[]
    loading: boolean
  }>({
    isOpen: false,
    categoryName: '',
    categoryColor: '',
    transactions: [],
    loading: false
  })
  const [viewSearchTerm, setViewSearchTerm] = useState('')
  const [viewCurrentPage, setViewCurrentPage] = useState(1)
  const viewItemsPerPage = 10

  // Load categories from database using API
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('🔐 Session:', session ? 'Found' : 'Not found')
      
      if (!session) {
        setError('Please sign in to view categories')
        setLoading(false)
        return
      }

      console.log('👤 User ID:', session.user.id)

      // Fetch categories from API
      console.log('📊 Fetching categories from API...')
      const response = await fetch('/api/categories', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch categories')
      }

      const data = await response.json()
      const dbCategories = data.categories || []

      console.log('📊 Categories found:', dbCategories.length)
      console.log('📊 Categories data:', dbCategories)

      // Get transaction counts per category
      console.log('📊 Fetching transactions...')
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', session.user.id)

      if (txError) {
        console.error('❌ Transactions error:', txError)
        throw txError
      }

      console.log('📊 Transactions found:', transactions?.length || 0)

      // Calculate stats per category
      const categoryStats: Record<string, { count: number; total: number }> = {}
      transactions?.forEach((t: any) => {
        if (t.category) {
          if (!categoryStats[t.category]) {
            categoryStats[t.category] = { count: 0, total: 0 }
          }
          categoryStats[t.category].count += 1
          categoryStats[t.category].total += t.amount
        }
      })

      console.log('📊 Category stats:', categoryStats)

      // Map to categories
      const mappedCategories = dbCategories?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color || '#6B7280',
        transactionCount: categoryStats[cat.name]?.count || 0,
        totalAmount: categoryStats[cat.name]?.total || 0,
        rules: cat.keywords || [],
        is_system: cat.is_system || false,
      })) || []

      console.log('✅ Mapped categories:', mappedCategories.length)
      setCategories(mappedCategories)
    } catch (error: any) {
      console.error('❌ Error loading categories:', error)
      setError(error.message || 'Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDelete = async (id: string, name: string) => {
    // Prevent deleting system categories
    const category = categories.find(c => c.id === id)
    if (category?.is_system) {
      alert('System categories cannot be deleted')
      return
    }

    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Delete via API
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete category')
      }

      // Update transactions with this category to 'Miscellaneous'
      await supabase
        .from('transactions')
        .update({ category: 'Miscellaneous' })
        .eq('user_id', session.user.id)
        .eq('category', name)

      setCategories(categories.filter(c => c.id !== id))
      if (onCategoryUpdated) onCategoryUpdated()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category: ' + error.message)
    }
  }

  const handleEdit = async (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingId(null)
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          name: newName.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update category')
      }

      setCategories(categories.map(c => 
        c.id === id ? { ...c, name: newName.trim() } : c
      ))
      if (onCategoryUpdated) onCategoryUpdated()
    } catch (error: any) {
      console.error('Error updating category:', error)
      alert('Failed to update category: ' + error.message)
    }
    setEditingId(null)
  }

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('Please enter a category name')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('Please sign in to add categories')
        return
      }

      const keywords = newCategory.keywords.split(',').map(k => k.trim()).filter(k => k)

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          color: newCategory.color,
          keywords: keywords,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create category')
      }

      const data = await response.json()
      const newCat = data.category

      if (newCat) {
        setCategories([
          {
            id: newCat.id,
            name: newCat.name,
            color: newCat.color || '#6B7280',
            transactionCount: 0,
            totalAmount: 0,
            rules: newCat.keywords || [],
            is_system: false,
          },
          ...categories
        ])
      }

      setNewCategory({ name: '', color: '#3B82F6', keywords: '' })
      setLocalShowModal(false)
      if (onCloseModal) onCloseModal()
      if (onCategoryUpdated) onCategoryUpdated()
    } catch (error: any) {
      console.error('Error adding category:', error)
      alert('Failed to add category: ' + error.message)
    }
  }

  // ============================================================
  // View Transactions Functions
  // ============================================================

  const openViewModal = async (categoryName: string, categoryColor: string) => {
    setViewModal({
      isOpen: true,
      categoryName,
      categoryColor,
      transactions: [],
      loading: true
    })
    setViewSearchTerm('')
    setViewCurrentPage(1)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('category', categoryName)
        .order('date', { ascending: false })

      if (error) throw error

      setViewModal(prev => ({
        ...prev,
        transactions: data || [],
        loading: false
      }))
    } catch (error: any) {
      console.error('Error fetching category transactions:', error)
      setViewModal(prev => ({
        ...prev,
        loading: false
      }))
    }
  }

  const closeViewModal = () => {
    setViewModal({
      isOpen: false,
      categoryName: '',
      categoryColor: '',
      transactions: [],
      loading: false
    })
  }

  const filteredViewTransactions = viewModal.transactions.filter(t =>
    t.description?.toLowerCase().includes(viewSearchTerm.toLowerCase()) ||
    t.reference?.toLowerCase().includes(viewSearchTerm.toLowerCase()) ||
    t.from_name?.toLowerCase().includes(viewSearchTerm.toLowerCase()) ||
    t.to_name?.toLowerCase().includes(viewSearchTerm.toLowerCase())
  )

  const viewTotalPages = Math.ceil(filteredViewTransactions.length / viewItemsPerPage)
  const paginatedViewTransactions = filteredViewTransactions.slice(
    (viewCurrentPage - 1) * viewItemsPerPage,
    viewCurrentPage * viewItemsPerPage
  )

  const viewTotalAmount = viewModal.transactions.reduce((sum, t) => sum + t.amount, 0)

  const getTotalTransactions = () => {
    return categories.reduce((sum, c) => sum + c.transactionCount, 0)
  }

  const getTotalAmount = () => {
    return categories.reduce((sum, c) => sum + c.totalAmount, 0)
  }

  const colorOptions = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#1A2A3A', '#F97316', '#7C3AED']

  // Stats cards with gradient
  const statsCards = [
    {
      label: 'Total Categories',
      value: categories.length,
      icon: Layers,
    },
    {
      label: 'Total Transactions',
      value: getTotalTransactions(),
      icon: Tag,
    },
    {
      label: 'Total Amount',
      value: `GH₵ ${getTotalAmount().toFixed(2)}`,
      icon: Wallet,
    }
  ]

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
        <span className="ml-3 text-gray-500">Loading categories...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600">{error}</p>
        <button 
          onClick={loadCategories}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards - Gradient */}
      <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-4">
        {statsCards.map((card) => (
          <div 
            key={card.label} 
            className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 sm:p-5 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-blue-200 font-medium uppercase tracking-wider truncate">
                  {card.label}
                </p>
                <p className="text-base sm:text-lg lg:text-xl font-bold text-white mt-0.5 truncate">
                  {card.value}
                </p>
              </div>
              <div className="bg-white backdrop-blur-sm p-1.5 sm:p-2 rounded-lg flex-shrink-0 ml-2 border border-white/10">
                <card.icon className="text-blue-500 w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category List */}
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-navy">All Categories</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {categories.length} categories • {categories.filter(c => c.is_system).length} system
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue w-full sm:w-48"
              />
            </div>
            <button
              onClick={() => setLocalShowModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No categories found
            </div>
          ) : (
            filteredCategories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg hover:bg-gray-100/90 transition-colors group border border-transparent hover:border-gray-200"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: category.color }}
                />

                {editingId === category.id ? (
                  <input
                    type="text"
                    defaultValue={category.name}
                    onBlur={(e) => handleEdit(category.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEdit(category.id, (e.target as HTMLInputElement).value)
                      }
                    }}
                    className="flex-1 px-2 py-1 border border-electric-blue rounded-lg text-sm focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <span className="flex-1 text-sm font-medium text-gray-700">
                    {category.name}
                    {category.is_system && (
                      <span className="ml-2 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        System
                      </span>
                    )}
                  </span>
                )}

                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <button
                    onClick={() => openViewModal(category.name, category.color)}
                    className="flex items-center gap-1 text-electric-blue hover:text-electric-blue/80 transition-colors text-xs bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View</span>
                  </button>
                  <span className="bg-gray-200/70 px-2 py-0.5 rounded-full text-xs">
                    {category.transactionCount} txns
                  </span>
                  <span className="font-medium text-navy">
                    GH₵{category.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-md hover:bg-white transition-colors"
                    title={category.is_system ? 'System categories cannot be deleted' : 'Delete'}
                  >
                    <Trash2 className={`w-3.5 h-3.5 ${category.is_system ? 'opacity-30 cursor-not-allowed' : ''}`} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {(showAddModal || localShowModal) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-card-dark max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy">Add New Category</h3>
              <button
                onClick={() => {
                  setLocalShowModal(false)
                  if (onCloseModal) onCloseModal()
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Groceries"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewCategory({ ...newCategory, color })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newCategory.color === color 
                          ? 'border-navy ring-2 ring-offset-2 ring-navy' 
                          : 'border-transparent hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Keywords (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g., grocery, market, food"
                  value={newCategory.keywords}
                  onChange={(e) => setNewCategory({ ...newCategory, keywords: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                />
                <p className="text-xs text-gray-400 mt-1">
                  These keywords will help auto-categorize transactions
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setLocalShowModal(false)
                  if (onCloseModal) onCloseModal()
                }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="flex-1 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Transactions Modal */}
      {viewModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: viewModal.categoryColor }}
                />
                <div>
                  <h2 className="text-lg font-semibold text-navy">{viewModal.categoryName}</h2>
                  <p className="text-xs text-gray-400">
                    {viewModal.transactions.length} transactions • Total: GH₵{viewTotalAmount.toFixed(2)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeViewModal}
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
                  value={viewSearchTerm}
                  onChange={(e) => setViewSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
                />
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-4">
              {viewModal.loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
                </div>
              ) : filteredViewTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">
                    {viewSearchTerm ? 'No transactions match your search' : 'No transactions in this category'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedViewTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            {filteredViewTransactions.length > viewItemsPerPage && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Showing {((viewCurrentPage - 1) * viewItemsPerPage) + 1} - {Math.min(viewCurrentPage * viewItemsPerPage, filteredViewTransactions.length)} of {filteredViewTransactions.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewCurrentPage(p => Math.max(1, p - 1))}
                    disabled={viewCurrentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-gray-400">
                    Page {viewCurrentPage} of {viewTotalPages}
                  </span>
                  <button
                    onClick={() => setViewCurrentPage(p => Math.min(viewTotalPages, p + 1))}
                    disabled={viewCurrentPage === viewTotalPages}
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
    </div>
  )
}