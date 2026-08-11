// app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.')
        } else {
          setError(error.message)
        }
        throw error
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error: any) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-xl shadow-card-dark p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💰</div>
          <h1 className="text-2xl font-bold text-navy">Welcome Back</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 mb-4 animate-fade-in">
            <p className="text-sm text-rose-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue transition-all"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-electric-blue text-white rounded-lg hover:bg-electric-blue/90 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-electric-blue hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}