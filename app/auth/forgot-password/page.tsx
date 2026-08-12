// app/auth/forgot-password/page.tsx

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Mail, ArrowLeft, CheckCircle, Lock, Upload, FileText, TrendingUp, Wallet } from 'lucide-react'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const features = [
    { icon: Upload, text: 'Upload a bank or mobile-money statement' },
    { icon: FileText, text: 'Every transaction auto-categorised - no typing' },
    { icon: TrendingUp, text: 'Clear totals by merchant, category & week' },
    { icon: Wallet, text: 'MTN MoMo statements - in GHC' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      console.error('Reset password error:', error)
      setError(error.message || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-stretch bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Left Panel - Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
           
            <span className="text-2xl font-bold text-orange-400">FinSentry</span>
          </div>
          
          <div className="space-y-8">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Reset your password
              <br />
              <span className="text-blue-200">We'll help you get back in.</span>
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

      {/* Right Panel - Reset Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 lg:px-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            
            <h1 className="text-2xl font-bold text-orange-400">FinSentry</h1>
            <p className="text-sm text-gray-500 mt-1">Reset your password</p>
          </div>

          <div className="text-center mb-8">
            
            <h2 className="text-xl font-semibold text-navy mt-1">Reset Password</h2>
            <p className="text-sm text-gray-500 mt-1">
              Enter your email to receive a password reset link
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="w-16 h-16 text-emerald-500" />
              </div>
              <h2 className="text-lg font-semibold text-navy">Check your email</h2>
              <p className="text-sm text-gray-500">
                We've sent a password reset link to <br />
                <span className="font-medium text-gray-700">{email}</span>
              </p>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700">
                  💡 Didn't receive the email? Check your spam folder.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center gap-2 text-sm text-blue-600 hover:underline font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 animate-fade-in">
                  <p className="text-sm text-rose-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Sending...
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div className="text-center mt-6">
                <Link
                  href="/auth/login"
                  className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}