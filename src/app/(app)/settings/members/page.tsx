'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, UserPlus, Trash2, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getOrgForUser } from '@/lib/get-org'

export default function MembersPage() {
  const supabase = createClient()
  const router = useRouter()
  const [orgId, setOrgId] = useState('')
  const [members, setMembers] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { org, isOwner } = await getOrgForUser(supabase, user!.id)
    if (!isOwner) { router.replace('/settings'); return }
    if (!org) return
    setOrgId(org.id)
    const { data } = await supabase.from('org_members').select('*').eq('org_id', org.id).order('created_at')
    setMembers(data ?? [])
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    setInviteSent(false)

    const res = await fetch('/api/invite-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    })

    setInviting(false)

    if (res.ok) {
      setInviteEmail('')
      setInviteSent(true)
      setTimeout(() => setInviteSent(false), 3000)
      await load()
    } else {
      const data = await res.json()
      setInviteError(data.error ?? 'Failed to send invite.')
    }
  }

  function removeMember(id: string, email: string, accepted: boolean) {
    setDialog({
      title: 'Remove member?',
      message: accepted
        ? `${email}'s account will be permanently deleted and they will lose all access.`
        : `The invitation for ${email} will be cancelled.`,
      onConfirm: async () => {
        await fetch('/api/remove-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: id }),
        })
        setDialog(null)
        await load()
      },
    })
  }

  const active = members.filter(m => m.invite_accepted_at)
  const pending = members.filter(m => !m.invite_accepted_at)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Team Logins</h1>
          <p className="text-sm text-gray-400 mt-0.5">Invite team members to view schedules, jobs, and reports.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-blue-400" /> Invite Member</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={sendInvite} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Email address</label>
              <Input
                type="email"
                placeholder="team@example.com"
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
              />
            </div>
            {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={inviting}>
                <Mail className="mr-2 h-4 w-4" />
                {inviting ? 'Sending…' : 'Send Invitation'}
              </Button>
              {inviteSent && <p className="text-sm text-green-400">Invitation sent!</p>}
            </div>
            <p className="text-xs text-gray-500">They'll receive an email with a link to create an account and join your team. Members can view everything but cannot manage billing or invite others.</p>
          </form>
        </CardContent>
      </Card>

      {active.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Active Members</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Email</th>
                  <th className="px-4 py-2.5 text-left font-medium">Phone</th>
                  <th className="px-4 py-2.5 text-left font-medium">Joined</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {active.map(m => (
                  <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-gray-100">{m.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{m.email}</td>
                    <td className="px-4 py-3 text-gray-300">{m.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(m.invite_accepted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeMember(m.id, m.email, true)} className="text-gray-500 hover:text-red-400 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending Invitations</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-medium">Email</th>
                  <th className="px-4 py-2.5 text-left font-medium">Invited</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {pending.map(m => (
                  <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-gray-300">{m.email}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => removeMember(m.id, m.email, false)} className="text-gray-500 hover:text-red-400 h-8 w-8">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!dialog}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        onConfirm={dialog?.onConfirm ?? (() => {})}
        onCancel={() => setDialog(null)}
      />
    </div>
  )
}
