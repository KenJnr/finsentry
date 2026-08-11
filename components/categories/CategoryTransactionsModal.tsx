// components/categories/CategoryTransactionsModal.tsx

'use client'

import { useState, useEffect } from 'react'
import { X, ArrowDown, ArrowUp, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'credit' | 'debit'
  reference: string
  from_name: string
  to_name: string
}

interface CategoryTransactionsModalProps {
  isOpen: boolean
  onClose: () => void
  categoryName: string
  categoryColor: string
}

export function CategoryTransactionsModal({
  isOpen,
  onClose,
  categoryName,
  categoryColor,
}: CategoryTransactionsModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (isOpen && categoryName) {
      fetchTransactions()
    }
  }, [isOpen, categoryName])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('category', categoryName)
        .order('date', { ascending: false })

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching category transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(t =>
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.from_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.to_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <div>
              <h2 className="text-lg font-semibold text-navy">{categoryName}</h2>
              <p className="text-xs text-gray-400">
                {transactions.length} transactions • Total: GH₵{totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue"
            />
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">
                {searchTerm ? 'No transactions match your search' : 'No transactions in this category'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedTransactions.map((t) => (
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
        {filteredTransactions.length > itemsPerPage && (
          <div className="flex items-center justify-between p-4 border-t border-gray-100">
            <span className="text-xs text-gray-400">
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
              <span className="text-xs text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}