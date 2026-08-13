// components/dashboard/TransactionList.tsx

'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, ArrowDown, ArrowUp, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  category: string
  balance_after: number
  reference: string
  from_name: string
  to_name: string
  statement_name: string
}

export function TransactionList() {
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [allCategories, setAllCategories] = useState<string[]>([])

  // Fetch transactions from database
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Please sign in to view transactions')
      }

      // Fetch transactions from Supabase
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .limit(100)

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load categories from database
  const fetchCategories = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('categories')
        .select('name')
        .or(`user_id.eq.${session.user.id},user_id.is.null`)

      if (error) throw error
      
      const names = data?.map((c: any) => c.name) || []
      setAllCategories(names)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }, [])

  // Load data on mount
  useEffect(() => {
    fetchTransactions()
    fetchCategories()
  }, [fetchTransactions, fetchCategories])

  // Get unique categories from transactions AND all categories from database
  const categories = useMemo(() => {
    const unique = new Set<string>()
    
    transactions.forEach(t => {
      if (t.category) unique.add(t.category)
    })
    
    allCategories.forEach(cat => {
      if (cat) unique.add(cat)
    })
    
    return Array.from(unique).sort()
  }, [transactions, allCategories])

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter(t => {
        const matchesSearch = 
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.from_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.to_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.category?.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesType = filterType === 'all' || t.type === filterType
        const matchesCategory = filterCategory === 'all' || t.category === filterCategory
        
        return matchesSearch && matchesType && matchesCategory
      })
  }, [transactions, searchTerm, filterType, filterCategory])

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setFilterType('all')
    setFilterCategory('all')
  }

  // Check if any filter is active
  const hasActiveFilters = searchTerm !== '' || filterType !== 'all' || filterCategory !== 'all'

  // Get type label with icon
  const getTypeLabel = (t: Transaction) => {
    if (t.type === 'credit') {
      return (
        <div className="flex items-center gap-1.5">
          <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-600">Inflow</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-1.5">
        <ArrowUp className="w-3.5 h-3.5 text-rose-500" />
        <span className="text-xs font-medium text-rose-600">Outflow</span>
      </div>
    )
  }

  const handleViewAll = () => {
    router.push('/insights?tab=transactions')
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-electric-blue animate-spin" />
        <span className="ml-3 text-gray-500 text-sm">Loading transactions...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <p className="text-rose-600 text-sm">{error}</p>
        <button
          onClick={() => fetchTransactions()}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg text-sm hover:bg-electric-blue/90"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-card-dark transition-all duration-300 hover:shadow-card-hover">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100">
        <div className="flex flex-col gap-3">
          {/* Title Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-navy">Recent Transactions</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {filteredTransactions.length} transactions found
              </p>
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue w-full"
              />
            </div>
            
            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue bg-white min-w-[120px]"
            >
              <option value="all">All Types</option>
              <option value="credit">💰 Inflow</option>
              <option value="debit">💸 Outflow</option>
            </select>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue bg-white min-w-[140px]"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-gray-800">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                  {filterType === 'credit' ? 'Inflow' : 'Outflow'}
                  <button onClick={() => setFilterType('all')} className="hover:text-gray-800">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-electric-blue/10 text-electric-blue rounded-full text-xs">
                  Category: {filterCategory}
                  <button onClick={() => setFilterCategory('all')} className="hover:text-electric-blue/80">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-navy">
            <tr>
              {['Date', 'Type', 'Description', 'Category', 'Amount'].map((header) => (
                <th key={header} className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-white uppercase tracking-wider">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                  No transactions found
                  {hasActiveFilters && (
                    <button 
                      onClick={clearFilters}
                      className="block mx-auto mt-2 text-electric-blue hover:underline text-xs"
                    >
                      Clear all filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredTransactions.slice(0, 15).map((t) => {
                const isCashIn = t.type === 'credit'
                return (
                  <tr 
                    key={t.id} 
                    className="hover:bg-gray-100/70 dark:hover:bg-white/10 transition-colors duration-150 cursor-pointer"
                  >
                    <td className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      {getTypeLabel(t)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-600 max-w-[120px] sm:max-w-[200px] truncate">
                      {t.description || t.to_name || t.from_name || t.reference || '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      {t.category ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium text-white bg-electric-blue">
                          {t.category}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap ${
                      isCashIn ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isCashIn ? '+' : '-'}
                      GH₵{t.amount.toFixed(2)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer */}
      <div className="px-3 sm:px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm text-gray-500">
        <span>
          Showing {Math.min(filteredTransactions.length, 15)} of {filteredTransactions.length} transactions
        </span>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="text-gray-400 hover:text-gray-600 transition-colors text-xs"
            >
              Clear filters
            </button>
          )}
          {filteredTransactions.length > 15 && (
            <button 
              onClick={handleViewAll}
              className="text-electric-blue  hover:text-electric-blue/80 dark:hover:text-electric-blue/60 transition-colors text-sm"
            >
              View All →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}