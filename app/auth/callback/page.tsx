'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(
    'Completing authentication...'
  )

  useEffect(() => {
    let mounted = true

    const handleCallback = async () => {
      try {
        const code = searchParams.get('code')
        const next = searchParams.get('next') || '/dashboard'

        console.log('🔐 Auth callback')
        console.log('Code:', !!code)
        console.log('Next:', next)

        /*
         * OAuth / PKCE callback
         */
        if (code) {
          setMessage('Completing sign in...')

          const {
            data,
            error: exchangeError,
          } = await supabase.auth.exchangeCodeForSession(
            code
          )

          if (exchangeError) {
            console.error(
              '❌ Code exchange error:',
              exchangeError
            )

            if (mounted) {
              setError(exchangeError.message)
              setLoading(false)
            }

            return
          }

          if (data.session) {
            console.log('✅ Session established')

            if (mounted) {
              setMessage('Authentication successful. Redirecting...')

              setTimeout(() => {
                router.replace(next)
                router.refresh()
              }, 300)
            }

            return
          }
        }

        /*
         * Check existing session.
         */
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error(
            '❌ User lookup error:',
            userError
          )

          if (mounted) {
            setError(userError.message)
            setLoading(false)
          }

          return
        }

        if (user) {
          console.log(
            '✅ Existing authenticated user:',
            user.email
          )

          if (mounted) {
            setMessage('Already authenticated. Redirecting...')

            setTimeout(() => {
              router.replace(next)
              router.refresh()
            }, 300)
          }

          return
        }

        /*
         * No code and no session.
         */
        if (mounted) {
          setError(
            'Authentication could not be completed. Please try signing in again.'
          )

          setLoading(false)
        }
      } catch (err: any) {
        console.error(
          '❌ Auth callback error:',
          err
        )

        if (mounted) {
          setError(
            err?.message ||
              'Something went wrong during authentication.'
          )

          setLoading(false)
        }
      }
    }

    handleCallback()

    return () => {
      mounted = false
    }
  }, [router, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />

          <p className="mt-4 text-sm text-gray-500">
            {message}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl shadow-card-dark p-8 max-w-md w-full text-center">

          <div className="text-5xl mb-4">
            ❌
          </div>

          <h1 className="text-2xl font-bold text-rose-600">
            Authentication Failed
          </h1>

          <p className="text-sm text-gray-500 mt-2">
            {error}
          </p>

          <div className="mt-6 space-y-3">

            <Link
              href="/auth/login"
              className="block w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Back to Sign In
            </Link>

            <Link
              href="/auth/signup"
              className="block w-full py-2.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Create New Account
            </Link>

          </div>
        </div>
      </div>
    )
  }

  return null
}