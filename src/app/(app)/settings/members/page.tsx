'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, UserPlus, Trash2, Mail, Pencil, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getOrgForUser } from '@/lib/get-org'

const ROLE_LABELS: Record<string, string> = {
  member: 'Member',
  admin: 'Admin',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  member: 'Can view schedules, jobs, and reports. Cannot manage billing, properties, or invite others.',
  admin: 'Full access — same as owner. Can manage everything except billing and transferring ownership.',
}

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

  // Edit modal state
  const [editingMember, setEditingMember] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('member')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

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

  function openEdit(member: any) {
    setEditingMember(member)
    setEditName(member.name ?? '')
    setEditPhone(member.phone ?? '')
    setEditRole(member.role ?? 'member')
    setEditError('')
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember) return
    setEditSaving(true)
    setEditError('')

    const res = await fetch('/api/update-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: editingMember.id,
        role: editRole,
        name: editName,
        phone: editPhone,
      }),
    })

    setEditSaving(false)

    if (res.ok) {
      setEditingMember(null)
      await load()
    } else {
      const data = await res.json()
      setEditError(data.error ?? 'Failed to save changes.')
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
          <h1 className="text-2xl font-bold text-white">Team Members</h1>
          <p className="text-sm text-gray-400 mt-0.5">Invite team members and manage their access level.</p>
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
            <p className="text-xs text-gray-500">New members are invited as <strong className="text-gray-400">Member</strong> by default. You can change their access level after they join.</p>
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
                  <th className="px-4 py-2.5 text-left font-medium">Role</th>
                  <th className="px-4 py-2.5 text-left font-medium">Joined</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {active.map(m => (
                  <tr key={m.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium text-gray-100">{m.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{m.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(m.invite_accepted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)} className="text-gray-500 hover:text-blue-400 h-8 w-8">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeMember(m.id, m.email, true)} className="text-gray-500 hover:text-red-400 h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#161b27] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h2 className="text-base font-semibold text-white">Edit Member</h2>
              <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveEdit} className="p-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
                <p className="text-sm text-gray-400">{editingMember.email}</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Name</label>
                <Input
                  placeholder="Full name"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Phone</label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Permission Level</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1.5 text-xs text-gray-500">{ROLE_DESCRIPTIONS[editRole]}</p>
              </div>
              {editError && <p className="text-sm text-red-400">{editError}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
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
