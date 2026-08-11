// app/auth/callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AuthCallback() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session after email verification
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError

        if (session) {
          // User is verified and logged in, redirect to dashboard
          router.push('/dashboard')
          router.refresh()
        } else {
          // No session, check if it's a verification flow
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(
            window.location.search
          )
          
          if (exchangeError) throw exchangeError
          
          if (data.session) {
            router.push('/dashboard')
            router.refresh()
          } else {
            setError('Unable to verify your email. Please try again.')
          }
        }
      } catch (err: any) {
        console.error('Auth callback error:', err)
        setError(err.message || 'Something went wrong during verification.')
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Verifying your email...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl shadow-card-dark p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-rose-600">Verification Failed</h1>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
          <Link
            href="/auth/login"
            className="block mt-6 py-2.5 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm font-medium"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return null
}