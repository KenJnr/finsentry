// components/upload/FileUpload.tsx
'use client'

import { useDropzone } from 'react-dropzone'
import { Upload, File, X, FileText, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface FileUploadProps {
  onUploadStart: (file: File) => void
  isUploading: boolean
  onUploadComplete?: (result: any) => void
  onUploadError?: (error: string) => void
}

export function FileUpload({ 
  onUploadStart, 
  isUploading, 
  onUploadComplete, 
  onUploadError 
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0]
        if (rejection.errors[0]?.code === 'file-too-large') {
          setError('File is too large. Maximum size is 10MB.')
        } else if (rejection.errors[0]?.code === 'file-invalid-type') {
          setError('Only PDF and CSV files are supported.')
        } else {
          setError('Please upload a valid file.')
        }
        return
      }

      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        setFile(file)
        setError(null)
      }
    },
    disabled: isUploading
  })

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Session error:', sessionError)
        onUploadError?.('Please sign in again')
        return
      }

      if (!session) {
        console.error('No session found - user not logged in')
        onUploadError?.('Please sign in first')
        return
      }

      console.log('✅ User authenticated:', session.user.email)
      console.log('✅ Token available:', !!session.access_token)

      const formData = new FormData()
      formData.append('file', file)

      onUploadStart(file)
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('Upload failed:', result)
        throw new Error(result.error || 'Upload failed')
      }

      if (onUploadComplete) {
        onUploadComplete(result)
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      if (onUploadError) {
        onUploadError(error.message)
      }
    }
  }

  const removeFile = () => {
    setFile(null)
    setError(null)
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (extension === 'pdf') {
      return <FileText className="w-6 h-6 text-red-500" />
    } else if (extension === 'csv') {
      return <FileSpreadsheet className="w-6 h-6 text-green-500" />
    }
    return <File className="w-6 h-6 text-gray-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all duration-200 cursor-pointer
          ${isDragActive ? 'border-electric-blue bg-electric-blue/5' : 'border-gray-300 hover:border-electric-blue hover:bg-gray-50'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {isUploading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-electric-blue"></div>
            <p className="mt-3 text-sm text-gray-500">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragActive ? 'text-electric-blue' : 'text-gray-400'}`} />
            <p className="text-sm sm:text-base text-gray-600">
              {isDragActive ? (
                'Drop your file here'
              ) : (
                <>
                  <span className="font-medium text-electric-blue">Click to upload</span>
                  {' '}or drag and drop
                </>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              PDF or CSV (max 10MB)
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2">
          <X className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <p className="text-xs text-rose-600">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {file && !isUploading && (
        <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3 min-w-0">
            {getFileIcon(file.name)}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
              <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpload}
              className="px-3 py-1.5 bg-electric-blue text-white text-sm rounded-lg hover:bg-electric-blue/90 transition-colors"
            >
              Upload
            </button>
            <button
              onClick={removeFile}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}