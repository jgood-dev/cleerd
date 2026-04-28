'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckSquare, Mail } from 'lucide-react'

export default function SignupPage() {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmPending, setConfirmPending] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { business_name: businessName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Email confirmation not required — create org and go
      await supabase.from('organizations').insert({
        name: businessName,
        owner_id: data.user!.id,
        plan: 'solo',
      })
      router.push('/dashboard')
    } else if (data.user) {
      // Email confirmation required — org will be created in /auth/confirm
      setConfirmPending(true)
      setLoading(false)
    }
  }

  if (confirmPending) {
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
            We sent a confirmation link to <span className="text-white">{email}</span>.
            Click it to activate your account and get started.
          </p>
          <p className="mt-6 text-sm text-gray-500">
            Already confirmed?{' '}
            <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Sign in</Link>
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
          <h1 className="text-2xl font-bold text-white">Start your free trial</h1>
          <p className="mt-1 text-gray-400">14 days free, no credit card required</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#161b27] p-8 shadow-xl">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Business name</label>
              <Input placeholder="Acme Services" value={businessName} onChange={e => setBusinessName(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
              <Input type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Start free trial'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-400 hover:text-blue-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
