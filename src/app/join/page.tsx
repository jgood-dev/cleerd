'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckSquare } from 'lucide-react'

function JoinForm() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [invite, setInvite] = useState<any>(null)
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invalid, setInvalid] = useState(false)

  useEffect(() => {
    if (!token) { setInvalid(true); return }
    supabase
      .from('org_members')
      .select('*, organizations(name)')
      .eq('invite_token', token)
      .is('invite_accepted_at', null)
      .single()
      .then(({ data }) => {
        if (!data) { setInvalid(true); return }
        setInvite(data)
        setOrgName((data.organizations as any)?.name ?? '')
        setEmail(data.email ?? '')
      })
  }, [token])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: signupError } = await supabase.auth.signUp({ email, password })
    if (signupError) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signupError.message)
        setLoading(false)
        return
      }
      if (signInData.user) {
        await acceptInvite(signInData.user.id)
        return
      }
    }
    if (data.user) {
      await acceptInvite(data.user.id)
    }
  }

  async function acceptInvite(userId: string) {
    await supabase.from('org_members').update({
      user_id: userId,
      invite_accepted_at: new Date().toISOString(),
    }).eq('invite_token', token)
    router.push('/dashboard')
  }

  if (invalid) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold text-white mb-2">Invalid invitation</h1>
        <p className="text-gray-400 mb-4">This invite link is invalid or has already been used.</p>
        <Link href="/login"><Button variant="outline">Sign in</Button></Link>
      </div>
    )
  }

  if (!invite) {
    return <p className="text-gray-400">Loading invitation...</p>
  }

  return (
    <div className="w-full max-w-md px-4">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-8 w-8 text-blue-400" />
            <span className="text-2xl font-bold text-white">CleanCheck</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">Join {orgName}</h1>
        <p className="mt-1 text-gray-400">Create your account to accept the invitation</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#161b27] p-8 shadow-xl">
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
            <Input type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Joining...' : 'Accept Invitation'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href={`/login?redirect=/join?token=${token}`} className="font-medium text-blue-400 hover:text-blue-300">Sign in instead</Link>
        </p>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1117]">
      <Suspense fallback={<p className="text-gray-400">Loading...</p>}>
        <JoinForm />
      </Suspense>
    </div>
  )
}
