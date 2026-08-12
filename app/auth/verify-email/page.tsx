// app/auth/verify-email/page.tsx

'use client'

import Link from 'next/link'
import { Mail, ArrowLeft } from 'lucide-react'

export default function VerifyEmail() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50/30 px-4">
      <div className="bg-white rounded-xl shadow-card-dark p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📧</div>
        <h1 className="text-2xl font-bold text-navy">Check Your Email</h1>
        <p className="text-sm text-gray-500 mt-2">
          We've sent a verification link to your email address.
          Please check your inbox and click the link to verify your account.
        </p>
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-700">
            💡 Didn't receive the email? Check your spam folder.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/auth/login?message=verification-sent"
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}