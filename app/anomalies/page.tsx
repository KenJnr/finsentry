// app/anomalies/page.tsx

'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  Eye,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Anomaly {
  id: string
  category: string
  current_month: string
  previous_month: string
  current_amount: number
  previous_amount: number
  current_count: number
  previous_count: number
  percentage_change: number
  absolute_change: number
  severity: 'low' | 'medium' | 'high'
  message: string
  is_reviewed: boolean
  reviewed_status: string
  created_at: string
}

// Group anomalies by category and month
interface MonthlyData {
  month: string
  amount: number
  count: number
}

export default function AnomaliesPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'sidebar-collapsed') {
        setIsCollapsed(JSON.parse(event.newValue || 'false'))
      }
    }
    window.addEventListener('storage', handleStorageChange)

    loadAnomalies()

    return () => {
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const getSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  const loadAnomalies = async () => {
    try {
      setLoading(true)
      setError(null)

      const session = await getSession()
      if (!session) {
        setError('Please sign in to view anomalies')
        setLoading(false)
        return
      }

      const response = await fetch('/api/anomalies', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load anomalies')
      }

      const data = await response.json()
      setAnomalies(data.anomalies || [])
    } catch (error: any) {
      console.error('Error loading anomalies:', error)
      setError(error.message || 'Failed to load anomalies')
    } finally {
      setLoading(false)
    }
  }

  const detectAnomalies = async () => {
    try {
      setDetecting(true)
      setError(null)

      const session = await getSession()
      if (!session) {
        setError('Please sign in to detect anomalies')
        setDetecting(false)
        return
      }

      const response = await fetch('/api/anomalies', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to detect anomalies')
      }

      const data = await response.json()
      setAnomalies(data.anomalies || [])
    } catch (error: any) {
      console.error('Error detecting anomalies:', error)
      setError(error.message || 'Failed to detect anomalies')
    } finally {
      setDetecting(false)
    }
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-rose-100 text-rose-700'
      case 'medium': return 'bg-orange-100 text-orange-700'
      case 'low': return 'bg-amber-100 text-amber-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-rose-500" />
      case 'medium': return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'low': return <AlertTriangle className="w-4 h-4 text-amber-500" />
      default: return <AlertTriangle className="w-4 h-4 text-gray-500" />
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'High'
      case 'medium': return 'Medium'
      case 'low': return 'Low'
      default: return 'Unknown'
    }
  }

  const getSeverityText = (severity: string) => {
    switch (severity) {
      case 'high': return 'High overspending detected'
      case 'medium': return 'Moderate overspending detected'
      case 'low': return 'Minor overspending detected'
      default: return 'Overspending detected'
    }
  }

  const formatCurrency = (amount: number) => {
    return `GH₵${amount.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    })
  }

  const getMainPadding = () => {
    if (isMobile) return 'pl-0 pt-16'
    if (isCollapsed) return 'pl-[72px]'
    return 'pl-[240px]'
  }

  // Group anomalies by category and get all month data
  const getCategoryMonthlyData = (category: string): MonthlyData[] => {
    const categoryAnomalies = anomalies.filter(a => a.category === category)
    const monthMap = new Map<string, { amount: number; count: number }>()
    
    categoryAnomalies.forEach(a => {
      // Add current month
      const currentKey = a.current_month
      if (!monthMap.has(currentKey)) {
        monthMap.set(currentKey, { amount: 0, count: 0 })
      }
      const current = monthMap.get(currentKey)!
      current.amount += a.current_amount
      current.count += a.current_count
      
      // Add previous month
      const previousKey = a.previous_month
      if (!monthMap.has(previousKey)) {
        monthMap.set(previousKey, { amount: 0, count: 0 })
      }
      const previous = monthMap.get(previousKey)!
      previous.amount += a.previous_amount
      previous.count += a.previous_count
    })
    
    return Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }

  // Group anomalies by category
  const groupedAnomalies = anomalies.reduce((acc, anomaly) => {
    if (!acc[anomaly.category]) {
      acc[anomaly.category] = []
    }
    acc[anomaly.category].push(anomaly)
    return acc
  }, {} as Record<string, Anomaly[]>)

  const anomaliesBySeverity = {
    high: anomalies.filter(a => a.severity === 'high'),
    medium: anomalies.filter(a => a.severity === 'medium'),
    low: anomalies.filter(a => a.severity === 'low'),
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar isMobile={isMobile} />
        <main className={`transition-all duration-300 min-h-screen ${getMainPadding()}`}>
          <div className="max-w-7xl mx-auto px-4 py-8 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-electric-blue"></div>
            <span className="ml-3 text-gray-500">Loading anomalies...</span>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isMobile={isMobile} />

      <main className={`transition-all duration-300 min-h-screen ${getMainPadding()}`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy">Spending Anomalies</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Detect unusual spending patterns across your categories
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={detectAnomalies}
                disabled={detecting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {detecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Detect Anomalies
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Summary Stats - Electric Blue Gradient */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Total Anomalies</p>
                  <p className="text-2xl font-bold text-white">{anomalies.length}</p>
                </div>
                <div className="bg-white backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                  <AlertTriangle className="w-4 h-4 text-blue-500" />
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">High Severity</p>
                  <p className="text-2xl font-bold text-white">{anomaliesBySeverity.high.length}</p>
                </div>
                <div className="bg-white backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Medium Severity</p>
                  <p className="text-2xl font-bold text-white">{anomaliesBySeverity.medium.length}</p>
                </div>
                <div className="bg-white backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-electric-blue via-blue-500 to-blue-400 shadow-card-dark p-4 transition-all duration-300 hover:shadow-card-hover hover:scale-[1.02]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-blue-200 font-medium uppercase tracking-wider">Low Severity</p>
                  <p className="text-2xl font-bold text-white">{anomaliesBySeverity.low.length}</p>
                </div>
                <div className="bg-white backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-rose-700">Error</p>
                <p className="text-sm text-rose-600">{error}</p>
              </div>
              <button
                onClick={loadAnomalies}
                className="ml-auto text-rose-500 hover:text-rose-700 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {/* Anomalies List */}
          {anomalies.length === 0 ? (
            <div className="bg-white rounded-xl shadow-card-dark p-8 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-navy">No Anomalies Detected</h3>
              <p className="text-sm text-gray-500 mt-1">
                Your spending patterns look normal. Click "Detect Anomalies" to scan your transactions.
              </p>
              <button
                onClick={detectAnomalies}
                disabled={detecting}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm font-medium"
              >
                {detecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Scan Now
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(groupedAnomalies).map(([category, categoryAnomalies]) => {
                const latest = categoryAnomalies.sort((a, b) => {
                  const severityOrder = { high: 3, medium: 2, low: 1 }
                  return severityOrder[b.severity] - severityOrder[a.severity]
                })[0]

                return (
                  <div
                    key={category}
                    className="bg-white rounded-xl shadow-card-dark p-5 hover:shadow-card-hover transition-all cursor-pointer border border-gray-100 hover:border-gray-200"
                    onClick={() => {
                      setSelectedCategory(category)
                      setShowDetailModal(true)
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(latest.severity)}
                        <div>
                          <h3 className="font-semibold text-navy text-lg">{category}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityBadgeColor(latest.severity)}`}>
                              {getSeverityLabel(latest.severity)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {categoryAnomalies.length} anomaly{categoryAnomalies.length > 1 ? 'ies' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>

                    <p className="text-sm text-gray-600 mt-2">
                      {getSeverityText(latest.severity)}
                    </p>

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-400">Click to view details</span>
                      <span className="text-electric-blue font-medium flex items-center gap-1">
                        View
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {showDetailModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-navy">{selectedCategory}</h3>
                <p className="text-xs text-gray-400">Monthly spending breakdown</p>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedCategory(null)
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Monthly Breakdown */}
              <div className="space-y-2">
                {getCategoryMonthlyData(selectedCategory).map((data, index, arr) => {
                  const isHighest = data.amount === Math.max(...arr.map(d => d.amount))
                  
                  return (
                    <div
                      key={data.month}
                      className={`p-4 rounded-lg border transition-all ${
                        isHighest && arr.length > 1
                          ? 'bg-rose-50 border-rose-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-700">{formatDate(data.month)}</p>
                          <p className="text-xs text-gray-400">{data.count} transactions</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isHighest && arr.length > 1 ? 'text-rose-600' : 'text-navy'}`}>
                            {formatCurrency(data.amount)}
                          </p>
                          {isHighest && arr.length > 1 && (
                            <p className="text-xs text-rose-500 font-medium">Highest spending</p>
                          )}
                          {index > 0 && (
                            <p className={`text-xs ${data.amount > arr[index - 1].amount ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {data.amount > arr[index - 1].amount ? '↑' : '↓'} 
                              GH₵{Math.abs(data.amount - arr[index - 1].amount).toFixed(2)} 
                              {data.amount > arr[index - 1].amount ? ' more' : ' less'} than previous
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              {getCategoryMonthlyData(selectedCategory).length > 1 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    💡 This category has {getCategoryMonthlyData(selectedCategory).length} months of data.
                    {(() => {
                      const data = getCategoryMonthlyData(selectedCategory)
                      const highest = data.reduce((max, d) => d.amount > max.amount ? d : max)
                      const lowest = data.reduce((min, d) => d.amount < min.amount ? d : min)
                      const avg = data.reduce((sum, d) => sum + d.amount, 0) / data.length
                      return ` Highest: ${formatDate(highest.month)} (${formatCurrency(highest.amount)}), 
                              Lowest: ${formatDate(lowest.month)} (${formatCurrency(lowest.amount)}), 
                              Average: ${formatCurrency(avg)}`
                    })()}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setSelectedCategory(null)
                }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}