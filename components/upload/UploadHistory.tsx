// components/upload/UploadHistory.tsx

'use client'

import { History, CheckCircle, AlertCircle, Clock, Download, Trash2, FileText, ChevronRight, X, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UploadHistoryItem {
  id: string
  name: string
  date: string
  status: 'success' | 'failed' | 'processing'
  transactions: number
  file_url?: string
}

interface UploadHistoryProps {
  history: UploadHistoryItem[]
  onViewAll?: () => void
  onDelete?: (id: string) => void
  onDeleteAll?: () => void
  showAll?: boolean
  onRefresh?: () => void
}

export function UploadHistory({ 
  history, 
  onViewAll, 
  onDelete, 
  onDeleteAll,
  showAll = false,
  onRefresh 
}: UploadHistoryProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Show all items if showAll is true, otherwise only show 3
  const displayedHistory = showAll ? history : history.slice(0, 3)
  const hasMore = history.length > 3

  const getStatusIcon = (status: UploadHistoryItem['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-rose-500" />
      case 'processing':
        return <Clock className="w-4 h-4 text-orange-500 animate-pulse" />
    }
  }

  const getStatusText = (status: UploadHistoryItem['status']) => {
    switch (status) {
      case 'success': return 'Complete'
      case 'failed': return 'Failed'
      case 'processing': return 'Processing...'
    }
  }

  const getStatusBadgeColor = (status: UploadHistoryItem['status']) => {
    switch (status) {
      case 'success': return 'bg-emerald-100 text-emerald-700'
      case 'failed': return 'bg-rose-100 text-rose-700'
      case 'processing': return 'bg-orange-100 text-orange-700'
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to delete')
        return
      }

      // First, get the file_url to delete from storage
      const { data: uploadData, error: fetchError } = await supabase
        .from('uploads')
        .select('file_url, file_name')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single()

      if (fetchError) throw fetchError

      // Delete transactions associated with this upload
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', session.user.id)
        .eq('statement_name', uploadData?.file_name)

      if (txError) {
        console.error('Error deleting transactions:', txError)
        // Continue anyway - try to delete the upload record
      }

      // Delete the upload record
      const { error: deleteError } = await supabase
        .from('uploads')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (deleteError) throw deleteError

      // Try to delete the file from storage
      if (uploadData?.file_url) {
        try {
          const filePath = uploadData.file_url.split('/statements/')[1]
          if (filePath) {
            await supabase.storage
              .from('statements')
              .remove([filePath])
          }
        } catch (storageError) {
          console.error('Error deleting file from storage:', storageError)
          // Don't throw - the record is already deleted
        }
      }

      // Call the onDelete callback if provided
      if (onDelete) {
        onDelete(id)
      } else if (onRefresh) {
        onRefresh()
      }

      setShowDeleteModal(false)
      setSelectedId(null)
    } catch (error: any) {
      console.error('Error deleting upload:', error)
      setError(error.message || 'Failed to delete upload')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    setDeletingAll(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Please sign in to delete')
        return
      }

      // Get all uploads for this user
      const { data: uploads, error: fetchError } = await supabase
        .from('uploads')
        .select('id, file_url, file_name')
        .eq('user_id', session.user.id)

      if (fetchError) throw fetchError

      // Delete all transactions for this user
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('user_id', session.user.id)

      if (txError) {
        console.error('Error deleting all transactions:', txError)
        // Continue anyway
      }

      // Delete all upload records
      const { error: deleteError } = await supabase
        .from('uploads')
        .delete()
        .eq('user_id', session.user.id)

      if (deleteError) throw deleteError

      // Try to delete all files from storage
      if (uploads && uploads.length > 0) {
        const filePaths = uploads
          .map(u => {
            if (u.file_url) {
              return u.file_url.split('/statements/')[1]
            }
            return null
          })
          .filter((path): path is string => path !== null)

        if (filePaths.length > 0) {
          try {
            await supabase.storage
              .from('statements')
              .remove(filePaths)
          } catch (storageError) {
            console.error('Error deleting files from storage:', storageError)
          }
        }
      }

      // Call the onDeleteAll callback if provided
      if (onDeleteAll) {
        onDeleteAll()
      } else if (onRefresh) {
        onRefresh()
      }

      setShowDeleteAllModal(false)
    } catch (error: any) {
      console.error('Error deleting all uploads:', error)
      setError(error.message || 'Failed to delete all uploads')
    } finally {
      setDeletingAll(false)
    }
  }

  const openDeleteModal = (id: string) => {
    setSelectedId(id)
    setShowDeleteModal(true)
    setError(null)
  }

  const openDeleteAllModal = () => {
    setShowDeleteAllModal(true)
    setError(null)
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-card-dark p-4 sm:p-6 h-full">
        {/* Header with Electric Blue Accent */}
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b-2 border-electric-blue/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-electric-blue/10 rounded-lg">
              <History className="w-5 h-5 text-electric-blue" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-navy">Upload History</h2>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {history.length} uploads total
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={openDeleteAllModal}
                className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete all uploads"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {showAll && (
              <button 
                onClick={onViewAll || (() => window.location.reload())}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="Show less"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <History className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 font-medium">No uploads yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload your first statement</p>
          </div>
        ) : (
          <>
            <div className={`space-y-3 ${showAll ? 'max-h-[500px] overflow-y-auto custom-scrollbar' : ''}`}>
              {displayedHistory.map((item) => (
                <div 
                  key={item.id}
                  className="p-3 rounded-lg border border-gray-100 hover:border-electric-blue/30 hover:shadow-md transition-all duration-200 group bg-white"
                >
                  <div className="flex items-start gap-3">
                    {/* File Icon with Electric Blue */}
                    <div className="p-2 bg-electric-blue/10 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 text-electric-blue" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {item.name}
                        </p>
                        {getStatusIcon(item.status)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{item.date}</span>
                        <span className="text-[8px] text-gray-300">•</span>
                        <span className="text-xs text-gray-400">
                          {item.transactions > 0 ? `${item.transactions} transactions` : '—'}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getStatusBadgeColor(item.status)}`}>
                          {getStatusText(item.status)}
                        </span>
                      </div>
                    </div>

                    {/* Always visible Delete button for ALL uploads */}
                    <div className="flex-shrink-0">
                      <button 
                        onClick={() => openDeleteModal(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1.5 text-gray-400 hover:text-rose-500 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View All Button - Only show if more than 3 items and not showing all */}
            {hasMore && !showAll && (
              <div className="mt-4 pt-3">
                <button 
                  onClick={onViewAll}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-electric-blue hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-all duration-200 group"
                >
                  <span>View All Uploads</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            )}

            {/* Show count if showing all or exactly 3 items */}
            {(showAll || !hasMore) && history.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <span className="text-xs text-gray-400">
                    Showing {displayedHistory.length} of {history.length} uploads
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy">Delete Upload</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedId(null)
                  setError(null)
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm text-rose-700">
                  <span className="font-medium">Warning:</span> This will permanently delete this upload and all its transactions. This action cannot be undone.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setSelectedId(null)
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedId) {
                      handleDelete(selectedId)
                    }
                  }}
                  disabled={deletingId !== null}
                  className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deletingId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Upload'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy">Delete All Uploads</h3>
              <button
                onClick={() => {
                  setShowDeleteAllModal(false)
                  setError(null)
                }}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-sm text-rose-700">
                  <span className="font-medium">Warning:</span> This will permanently delete all {history.length} uploads and their transactions. This action cannot be undone.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <p className="text-sm text-rose-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteAllModal(false)
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deletingAll}
                  className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {deletingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting All...
                    </>
                  ) : (
                    'Delete All'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}