// app/auth/login/page.tsx

'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, ArrowRight, Upload, FileText, TrendingUp, Users, Wallet } from 'lucide-react'

// Component that uses useSearchParams
function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [resending, setResending] = useState(false)

  const features = [
    { icon: Upload, text: 'Upload a bank or mobile-money statement' },
    { icon: FileText, text: 'Every transaction auto-categorised - no typing' },
    { icon: TrendingUp, text: 'Clear totals by merchant, category & week' },
    { icon: Wallet, text: 'MTN MoMo statements - in GHC' },
  ]

  // Check for verification success message
  useEffect(() => {
    const message = searchParams.get('message')
    if (message === 'verified') {
      setError('')
      // Show success message
      const successDiv = document.createElement('div')
      successDiv.className = 'bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4 animate-fade-in'
      successDiv.innerHTML = '<p class="text-sm text-emerald-600">✅ Email verified! Please sign in.</p>'
      const errorContainer = document.querySelector('.error-container')
      if (errorContainer) {
        errorContainer.parentNode?.insertBefore(successDiv, errorContainer)
        setTimeout(() => {
          successDiv.remove()
        }, 5000)
      }
    }
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email before signing in. Check your inbox for the verification link.')
        } else {
          setError(error.message)
        }
        throw error
      }

      if (data.session) {
        // Clean up the URL by removing the redirectTo parameter
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('redirectTo')
        window.history.replaceState({}, '', newUrl.toString())

        // Redirect to the original destination or dashboard
        router.push(redirectTo)
        router.refresh()
      }
    } catch (error: any) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!formData.email) {
      setError('Please enter your email first')
      return
    }

    setResending(true)
    setError('')

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setError('')
      // Show success message
      alert('Verification email resent! Please check your inbox.')
    } catch (error: any) {
      console.error('Resend error:', error)
      setError(error.message || 'Failed to resend verification email')
    } finally {
      setResending(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error: any) {
      console.error('Google login error:', error)
      setError(error.message)
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <span className="text-2xl font-bold text-orange-400">FinSentry</span>
          </div>
          
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Welcome back
              <br />
              <span className="text-blue-200">Sign in to see your spending.</span>
            </h1>
            
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-blue-100">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <feature.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-blue-200/60 text-sm">
          <p>MTN MoMo statements • in GHC</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-orange-400">FinSentry</h1>
            <p className="text-sm text-gray-500 mt-1">Sign in to see your spending</p>
          </div>

          {/* Tagline */}
          <div className="text-center mb-8">
            <p className="text-sm font-medium text-blue-600">ZERO-ENTRY FINANCIAL CLARITY</p>
            <h2 className="text-xl font-semibold text-navy mt-1">See exactly where your Cedis went.</h2>
          </div>

          {/* Error Container */}
          <div className="error-container">
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 animate-fade-in">
                <p className="text-sm text-rose-600">{error}</p>
                {error.includes('verify your email') && (
                  <button
                    onClick={handleResendVerification}
                    disabled={resending}
                    className="mt-2 text-sm text-blue-600 hover:underline font-medium disabled:opacity-50"
                  >
                    {resending ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Signing in...
                </div>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-sm text-gray-500 text-center mt-6">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}