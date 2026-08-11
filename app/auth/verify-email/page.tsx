// app/auth/verify-email/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function VerifyEmail() {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    // Get the user's email from the session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setEmail(user.email)
      }
    }
    getUser()

    // Countdown timer for resend
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Check if user is already verified (in case they come back)
    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email_confirmed_at) {
        router.push('/dashboard')
      }
    }
    
    const interval = setInterval(checkVerification, 5000)
    
    return () => {
      clearInterval(timer)
      clearInterval(interval)
    }
  }, [router])

  const handleResend = async () => {
    if (!canResend || resendStatus === 'sending') return
    
    setResendStatus('sending')
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      
      if (error) throw error
      
      setResendStatus('sent')
      setCanResend(false)
      setTimeLeft(60)
      
      // Reset timer
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true)
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
    } catch (error: any) {
      console.error('Resend error:', error)
      setResendStatus('error')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-card-dark p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-navy">Check Your Email</h1>
        <p className="text-sm text-gray-500 mt-2">
          We've sent a verification link to <span className="font-medium text-navy">{email || 'your email'}</span>
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Please check your inbox and click the link to verify your account.
        </p>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600">
            💡 Tip: Check your spam folder if you don't see the email.
          </p>
        </div>

        {/* Resend Button */}
        <div className="mt-4">
          <button
            onClick={handleResend}
            disabled={!canResend || resendStatus === 'sending'}
            className="text-sm text-electric-blue hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendStatus === 'sending' ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-electric-blue border-t-transparent"></div>
                Sending...
              </span>
            ) : resendStatus === 'sent' ? (
              '✅ Resent! Check your email'
            ) : canResend ? (
              'Resend verification email'
            ) : (
              `Resend in ${timeLeft}s`
            )}
          </button>
        </div>

        <Link
          href="/auth/login"
          className="block mt-6 py-2.5 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm font-medium"
        >
          Back to Sign In
        </Link>

        {/* Auto-refresh note */}
        <p className="text-xs text-gray-400 mt-4">
          Once verified, you'll be automatically redirected to the dashboard.
        </p>
      </div>
    </div>
  )
}