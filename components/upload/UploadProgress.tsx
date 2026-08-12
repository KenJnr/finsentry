// components/upload/UploadProgress.tsx

'use client'

import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, FileText, Eye, List, Upload } from 'lucide-react'

interface UploadProgressProps {
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error' | 'idle'
  fileName?: string
  transactionCount?: number
  onUploadAnother?: () => void
}

export function UploadProgress({ 
  progress, 
  status, 
  fileName, 
  transactionCount = 0,
  onUploadAnother 
}: UploadProgressProps) {
  const router = useRouter()
  
  const isUploading = status === 'uploading'
  const isProcessing = status === 'processing'
  const isComplete = status === 'complete'
  const isError = status === 'error'

  const getStatusText = () => {
    if (isUploading) return 'Uploading...'
    if (isProcessing) return 'Categorizing transactions...'
    if (isComplete) return 'Complete!'
    if (isError) return 'Error'
    return 'Ready'
  }

  const getStatusColor = () => {
    if (isUploading) return 'text-electric-blue'
    if (isProcessing) return 'text-orange-500'
    if (isComplete) return 'text-emerald-500'
    if (isError) return 'text-rose-500'
    return 'text-gray-500'
  }

  const handleViewSummary = () => {
    router.push('/insights?tab=summary')
  }

  const handleViewTransactions = () => {
    router.push('/insights?tab=transactions')
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* File Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 truncate max-w-[200px]">
            {fileName || 'Uploading...'}
          </span>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${getStatusColor()}`}>
          {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
          {isComplete && <CheckCircle className="w-4 h-4" />}
          {isError && <span className="text-rose-500">✕</span>}
          {getStatusText()}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`
              h-2.5 rounded-full transition-all duration-500 ease-out
              ${isError ? 'bg-rose-500' : isComplete ? 'bg-emerald-500' : 'bg-electric-blue'}
            `}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="absolute right-0 -bottom-5 text-xs text-gray-400">
          {progress}%
        </span>
      </div>

      {/* Transaction Count (only when complete) */}
      {isComplete && transactionCount > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold">{transactionCount}</span> transactions processed
          </p>
        </div>
      )}

      {/* Action Buttons (only when complete) */}
      {isComplete && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleViewSummary}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Eye className="w-4 h-4" />
              View Summary
            </button>
            <button
              onClick={handleViewTransactions}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm font-medium"
            >
              <List className="w-4 h-4" />
              View Transactions
            </button>
            <button
              onClick={onUploadAnother}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload Another
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {isError && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-sm text-rose-600">
            Something went wrong. Please try again.
          </p>
          <button
            onClick={onUploadAnother}
            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}