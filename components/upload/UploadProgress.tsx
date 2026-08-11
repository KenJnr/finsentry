// components/upload/UploadProgress.tsx
'use client'

import { Loader2, CheckCircle, FileText } from 'lucide-react'

interface UploadProgressProps {
  progress: number
  status: 'uploading' | 'processing' | 'complete' | 'error' | 'idle'
  fileName?: string
}

export function UploadProgress({ progress, status, fileName }: UploadProgressProps) {
  const isUploading = status === 'uploading'
  const isProcessing = status === 'processing'
  const isComplete = status === 'complete'
  const isError = status === 'error'

  const getStatusText = () => {
    if (isUploading) return 'Uploading...'
    if (isProcessing) return 'Processing statement...'
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
    </div>
  )
}