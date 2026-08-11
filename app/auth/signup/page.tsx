// app/auth/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignUp() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    // Clear error when user types
    if (error) setError('')
  }

 // app/auth/signup/page.tsx (Updated handleSubmit)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setLoading(true)
  setError('')
  setSuccess(false)

  // Basic validation
  if (!formData.fullName.trim()) {
    setError('Please enter your full name')
    setLoading(false)
    return
  }

  if (formData.password.length < 6) {
    setError('Password must be at least 6 characters')
    setLoading(false)
    return
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        },
        // IMPORTANT: Redirect to callback after email verification
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.includes('User already registered')) {
        setError('This email is already registered. Please sign in instead.')
      } else {
        setError(error.message)
      }
      throw error
    }

    // Check if user needs email confirmation
    if (data.user?.identities?.length === 0) {
      setError('This email is already registered. Please sign in instead.')
      setLoading(false)
      return
    }

    setSuccess(true)
    
    // Show success message before redirecting
    setTimeout(() => {
      router.push('/auth/verify-email')
    }, 2000)
    
  } catch (error: any) {
    console.error('Sign up error:', error)
  } finally {
    setLoading(false)
  }
}

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl shadow-card-dark p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-emerald-600">Account Created!</h1>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting you to verification page...
          </p>
          <div className="mt-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-electric-blue mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-card-dark p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-navy">Create Account</h1>
          <p className="text-sm text-gray-500 mt-1">Start tracking your finances today</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 animate-fade-in">
            <p className="text-sm text-rose-600">{error}</p>
            {error.includes('already registered') && (
              <Link 
                href="/auth/login" 
                className="text-sm text-electric-blue hover:underline font-medium block mt-1"
              >
                Sign in instead →
              </Link>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Kingsley Naab Boadi"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue transition-all"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue transition-all"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              minLength={6}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue transition-all"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Must be at least 6 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Creating account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-electric-blue hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}