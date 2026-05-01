'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckSquare, Mail } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1117]">
        <div className="w-full max-w-md px-4 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-blue-500/10 p-4">
              <Mail className="h-10 w-10 text-blue-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="mt-3 text-gray-400">
            If an account exists for <span className="text-white">{email}</span>, we sent a password reset link. Check your inbox and spam folder.
          </p>
          <p className="mt-6 text-sm text-gray-500">
            <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Back to sign in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117]">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">Cleerd</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="mt-1 text-gray-400">Enter your email and we&apos;ll send a reset link</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#161b27] p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
