// components/insights/InsightsSummary.tsx
'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  Search,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Statement {
  id: string
  name: string
  date: string
  transactions: number
  totalIncome: number
  totalExpenses: number
  netFlow: number
  status: 'processed' | 'processing' | 'failed'
  file_url?: string
  categories: {
    name: string
    amount: number
    color: string
  }[]
  transactions_data?: any[]
}

export function InsightsSummary() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [statements, setStatements] = useState<Statement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load statements from database
  useEffect(() => {
    loadStatements()
  }, [])

  const loadStatements = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to view statements')
        setLoading(false)
        return
      }

      // Get all uploads
      const { data: uploads, error: uploadsError } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', session.user.id)
        .order('uploaded_at', { ascending: false })

      if (uploadsError) throw uploadsError

      if (!uploads || uploads.length === 0) {
        setStatements([])
        setLoading(false)
        return
      }

      // For each upload, get the transactions
      const statementsData: Statement[] = await Promise.all(
        uploads.map(async (upload) => {
          const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('statement_name', upload.file_name)

          if (txError) {
            console.error('Error loading transactions:', txError)
            return {
              id: upload.id,
              name: upload.file_name,
              date: upload.uploaded_at,
              transactions: 0,
              totalIncome: 0,
              totalExpenses: 0,
              netFlow: 0,
              status: 'failed' as const,
              categories: [],
              file_url: upload.file_url,
            }
          }

          // Calculate totals
          const totalIncome = transactions
            ?.filter((t: any) => t.type === 'credit')
            .reduce((sum: number, t: any) => sum + t.amount, 0) || 0

          const totalExpenses = transactions
            ?.filter((t: any) => t.type === 'debit')
            .reduce((sum: number, t: any) => sum + t.amount, 0) || 0

          // Get category breakdown
          const categoryMap = new Map<string, { amount: number, color: string }>()
          const colors = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#1A2A3A']
          let colorIndex = 0

          transactions?.forEach((t: any) => {
            if (t.type === 'debit' && t.category) {
              const existing = categoryMap.get(t.category)
              if (existing) {
                existing.amount += t.amount
              } else {
                categoryMap.set(t.category, {
                  amount: t.amount,
                  color: colors[colorIndex % colors.length]
                })
                colorIndex++
              }
            }
          })

          const categories = Array.from(categoryMap.entries()).map(([name, data]) => ({
            name,
            amount: data.amount,
            color: data.color,
          })).sort((a, b) => b.amount - a.amount)

          return {
            id: upload.id,
            name: upload.file_name,
            date: upload.uploaded_at,
            transactions: transactions?.length || 0,
            totalIncome,
            totalExpenses,
            netFlow: totalIncome - totalExpenses,
            status: upload.status === 'completed' ? 'processed' : upload.status === 'pending' ? 'processing' : 'failed',
            categories,
            file_url: upload.file_url,
            transactions_data: transactions,
          }
        })
      )

      setStatements(statementsData)
    } catch (error: any) {
      console.error('Error loading statements:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredStatements = statements.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    new Date(s.date).toLocaleDateString().includes(searchTerm)
  )

  const getStatusBadge = (status: Statement['status']) => {
    switch (status) {
      case 'processed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
            <CheckCircle className="w-3 h-3" />
            Processed
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
            <Clock className="w-3 h-3 animate-pulse" />
            Processing
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-xs">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        )
    }
  }

  const handleViewSummary = (statement: Statement) => {
    setSelectedStatement(statement)
    setShowDetail(true)
  }

  const handleDownload = (statement: Statement) => {
    if (statement.file_url) {
      window.open(statement.file_url, '_blank')
    } else {
      console.log('No file URL available')
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
        <span className="ml-3 text-gray-500">Loading statements...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <p className="text-rose-600">{error}</p>
        <button 
          onClick={loadStatements}
          className="mt-3 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statement List */}
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-navy">Uploaded Statements</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredStatements.length} statements found
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search statements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue w-full sm:w-48"
            />
          </div>
        </div>

        {filteredStatements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            {statements.length === 0 ? (
              <>
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No statements uploaded yet</p>
                <p className="text-xs mt-1">Upload a statement to see it here</p>
              </>
            ) : (
              'No statements found matching your search'
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStatements.map((statement) => (
              <div
                key={statement.id}
                className="p-4 bg-gray-50/80 rounded-xl hover:bg-gray-100/90 transition-colors group border border-transparent hover:border-gray-200"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Statement Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-electric-blue/10 rounded-lg flex-shrink-0">
                        <FileText className="w-4 h-4 text-electric-blue" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {statement.name}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(statement.date).toLocaleDateString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </span>
                          <span>•</span>
                          <span>{statement.transactions} transactions</span>
                          <span>•</span>
                          {getStatusBadge(statement.status)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {statement.status === 'processed' && (
                      <>
                        <button
                          onClick={() => handleViewSummary(statement)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-xs font-medium"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Summary
                        </button>
                        <button
                          onClick={() => handleDownload(statement)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-xs font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </button>
                      </>
                    )}
                    {statement.status === 'processing' && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                        Processing...
                      </span>
                    )}
                    {statement.status === 'failed' && (
                      <button 
                        onClick={() => loadStatements()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors text-xs font-medium"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statement Detail Modal */}
      {showDetail && selectedStatement && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-card-dark max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-navy">{selectedStatement.name}</h3>
                <p className="text-sm text-gray-500">
                  {new Date(selectedStatement.date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })} • {selectedStatement.transactions} transactions
                </p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-xs text-emerald-600">Income</p>
                <p className="text-lg font-bold text-emerald-600">
                  GH₵{selectedStatement.totalIncome.toFixed(2)}
                </p>
              </div>
              <div className="bg-rose-50 rounded-lg p-3 text-center">
                <p className="text-xs text-rose-600">Expenses</p>
                <p className="text-lg font-bold text-rose-600">
                  GH₵{selectedStatement.totalExpenses.toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600">Net Flow</p>
                <p className={`text-lg font-bold ${selectedStatement.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  GH₵{selectedStatement.netFlow.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Category Breakdown */}
            {selectedStatement.categories.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold text-navy mb-3">Category Breakdown</h4>
                <div className="space-y-2">
                  {selectedStatement.categories.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-3">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-gray-600 flex-1">{cat.name}</span>
                      <span className="text-sm font-medium text-navy">
                        GH₵{cat.amount.toFixed(2)}
                      </span>
                      <span className="text-xs text-gray-400 w-12 text-right">
                        {selectedStatement.totalExpenses > 0 
                          ? ((cat.amount / selectedStatement.totalExpenses) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm">
                No category data available for this statement
              </div>
            )}

            <button
              onClick={() => setShowDetail(false)}
              className="w-full mt-6 py-2.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm font-medium"
            >
              Close Summary
            </button>
          </div>
        </div>
      )}
    </div>
  )
}