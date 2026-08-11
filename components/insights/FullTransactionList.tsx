// components/insights/FullTransactionList.tsx

'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { 
  Search, 
  Download, 
  X,
  ArrowUp,
  ArrowDown,
  RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RecategorizeModal } from '@/components/transactions/RecategorizeModal'

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
  is_manual?: boolean
}

export function FullTransactionList() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'debit'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [sortField, setSortField] = useState<'date' | 'amount'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [allCategories, setAllCategories] = useState<string[]>([])

  // Recategorize Modal State
  const [recategorizeModal, setRecategorizeModal] = useState<{
    isOpen: boolean
    transaction: any | null
  }>({
    isOpen: false,
    transaction: null
  })

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
        .eq('user_id', session.user.id)

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
    
    // Add categories from transactions
    transactions.forEach(t => {
      if (t.category) unique.add(t.category)
    })
    
    // Add all categories from database
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
      .sort((a, b) => {
        const aVal = a[sortField as keyof Transaction]
        const bVal = b[sortField as keyof Transaction]
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal) 
            : bVal.localeCompare(aVal)
        }
        return sortDirection === 'asc' 
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number)
      })
  }, [transactions, searchTerm, filterType, filterCategory, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalInflow = filteredTransactions
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOutflow = filteredTransactions
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0)

  const clearFilters = () => {
    setSearchTerm('')
    setFilterType('all')
    setFilterCategory('all')
  }

  const hasActiveFilters = searchTerm !== '' || filterType !== 'all' || filterCategory !== 'all'

  const handleDownloadCSV = () => {
    const headers = ['Date', 'Description', 'Type', 'Category', 'Amount', 'Balance']
    const rows = filteredTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.description,
      t.type === 'credit' ? 'Inflow' : 'Outflow',
      t.category || 'Uncategorized',
      `${t.type === 'credit' ? '+' : '-'}GH₵${t.amount.toFixed(2)}`,
      `GH₵${t.balance_after?.toFixed(2) || '0.00'}`
    ])
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRecategorize = (transaction: any) => {
    setRecategorizeModal({
      isOpen: true,
      transaction
    })
  }

  const handleRecategorizeSuccess = () => {
    fetchTransactions()
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
        <span className="ml-3 text-gray-500">Loading transactions...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <p className="text-rose-600 mb-2">Error loading transactions</p>
        <p className="text-sm text-gray-500">{error}</p>
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
    <>
      <div className="bg-white rounded-xl shadow-card-dark overflow-hidden">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400">
          <div className="text-center text-white">
            <p className="text-[10px] sm:text-xs opacity-80">Total Transactions</p>
            <p className="text-base sm:text-lg font-bold">{filteredTransactions.length}</p>
          </div>
          <div className="text-center text-white">
            <p className="text-[10px] sm:text-xs opacity-80">Total Inflow</p>
            <p className="text-base sm:text-lg font-bold">GH₵{totalInflow.toFixed(2)}</p>
          </div>
          <div className="text-center text-white">
            <p className="text-[10px] sm:text-xs opacity-80">Total Outflow</p>
            <p className="text-base sm:text-lg font-bold">GH₵{totalOutflow.toFixed(2)}</p>
          </div>
          <div className="text-center text-white">
            <p className="text-[10px] sm:text-xs opacity-80">Net Flow</p>
            <p className={`text-base sm:text-lg font-bold ${totalInflow - totalOutflow >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              GH₵{(totalInflow - totalOutflow).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue bg-white"
              >
                <option value="all">All Types</option>
                <option value="credit">💰 Inflow</option>
                <option value="debit">💸 Outflow</option>
              </select>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <button
                onClick={handleDownloadCSV}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 px-3 py-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Tags */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5 mt-2">
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
                  {filterType === 'credit' ? '💰 Inflow' : '💸 Outflow'}
                  <button onClick={() => setFilterType('all')} className="hover:text-gray-800">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filterCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-electric-blue/10 text-electric-blue rounded-full text-xs">
                  {filterCategory}
                  <button onClick={() => setFilterCategory('all')} className="hover:text-electric-blue/80">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 sm:px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-3 sm:px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-3 sm:px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
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
                paginatedTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/70 transition-colors group">
                    <td className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-gray-600 max-w-[200px] truncate">
                      {t.description || t.to_name || t.from_name || '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      {t.type === 'credit' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs sm:text-sm">
                          <ArrowDown className="w-3.5 h-3.5" />
                          Inflow
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-medium text-xs sm:text-sm">
                          <ArrowUp className="w-3.5 h-3.5" />
                          Outflow
                        </span>
                      )}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5">
                      {t.category ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                          t.is_manual ? 'bg-emerald-500' : 'bg-electric-blue'
                        }`}>
                          {t.category}
                          {t.is_manual && (
                            <span className="ml-1 text-[8px] opacity-80">✏️</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium text-right whitespace-nowrap ${
                      t.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === 'credit' ? '+' : '-'}
                      GH₵{t.amount.toFixed(2)}
                    </td>
                    <td className="px-3 sm:px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleRecategorize(t)}
                        className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Recategorize"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-3 sm:px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

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