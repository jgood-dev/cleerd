'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Users, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { PhoneInput } from '@/components/ui/phone-input'
import { getOrgForUser } from '@/lib/get-org'

export default function TeamsPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState<string>('')
  const [isOwner, setIsOwner] = useState(false)
  const [ownerEmail, setOwnerEmail] = useState<string>('')
  const [plan, setPlan] = useState<string>('solo')
  const [teams, setTeams] = useState<any[]>([])
  const [orgMembers, setOrgMembers] = useState<any[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  // Per-team add-member form state
  const [selectedMember, setSelectedMember] = useState<Record<string, string>>({})
  const [memberRole, setMemberRole] = useState<Record<string, string>>({})
  const [memberAdding, setMemberAdding] = useState<Record<string, boolean>>({})

  // Per-member edit state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('cleaner')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { org, isOwner: owner } = await getOrgForUser(supabase, user.id)
    if (!org) return
    setOrgId(org.id)
    setIsOwner(owner)
    setPlan(org.plan ?? 'solo')
    if (owner) setOwnerEmail(user.email ?? '')
    const [{ data: teamsData }, { data: membersData }] = await Promise.all([
      supabase.from('teams').select('*, team_members(*)').eq('org_id', org.id).order('created_at'),
      supabase.from('org_members').select('id, email, name').eq('org_id', org.id).not('invite_accepted_at', 'is', null),
    ])
    setTeams(teamsData ?? [])
    setOrgMembers(membersData ?? [])
  }

  async function addTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamName.trim() || !orgId) return
    setLoading(true)
    const { data } = await supabase.from('teams').insert({ org_id: orgId, name: newTeamName.trim() }).select().single()
    setNewTeamName('')
    setLoading(false)
    if (data) setExpandedTeam(data.id)
    await load()
  }

  function deleteTeam(id: string) {
    setDialog({
      title: 'Delete team?',
      message: 'This team and all its members will be permanently removed.',
      onConfirm: async () => {
        await supabase.from('teams').delete().eq('id', id)
        setDialog(null)
        await load()
      },
    })
  }

  async function addMember(teamId: string) {
    const email = selectedMember[teamId]
    if (!email) return
    const allAccounts = ownerEmail ? [{ id: 'owner', email: ownerEmail, name: ownerEmail }, ...orgMembers] : orgMembers
    const match = allAccounts.find(om => om.email === email)
    setMemberAdding(prev => ({ ...prev, [teamId]: true }))
    await supabase.from('team_members').insert({
      team_id: teamId,
      name: match?.name ?? email,
      email,
      role: memberRole[teamId] || 'cleaner',
    })
    setSelectedMember(prev => ({ ...prev, [teamId]: '' }))
    setMemberRole(prev => ({ ...prev, [teamId]: 'cleaner' }))
    setMemberAdding(prev => ({ ...prev, [teamId]: false }))
    await load()
  }

  function openEditMember(m: any) {
    setEditingMemberId(m.id)
    setEditName(m.name)
    setEditEmail(m.email ?? '')
    setEditPhone(m.phone ?? '')
    setEditRole(m.role ?? 'cleaner')
  }

  async function saveEditMember() {
    if (!editingMemberId || !editName.trim()) return
    await supabase.from('team_members').update({
      name: editName.trim(),
      email: editEmail.trim() || null,
      phone: editPhone.trim() || null,
      role: editRole,
    }).eq('id', editingMemberId)
    setEditingMemberId(null)
    await load()
  }

  function deleteMember(memberId: string) {
    setDialog({
      title: 'Remove member?',
      message: 'This person will be removed from the team.',
      onConfirm: async () => {
        await supabase.from('team_members').delete().eq('id', memberId)
        setDialog(null)
        await load()
      },
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Teams</h1>

      {isOwner && (() => {
        const teamLimit = plan === 'pro' ? Infinity : plan === 'growth' ? 3 : 1
        const atLimit = teams.length >= teamLimit
        return (
          <Card>
            <CardHeader><CardTitle>Add Team</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {atLimit ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <p className="text-sm text-amber-300 font-medium">Team limit reached for your plan</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    {plan === 'solo' ? 'Solo plan includes 1 team. Upgrade to Growth for up to 3 teams.' : 'Growth plan includes 3 teams. Upgrade to Pro for unlimited teams.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={addTeam} className="flex gap-3">
                  <Input placeholder="Team name (e.g. Morning Crew)" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                  <Button type="submit" disabled={loading}>
                    <Plus className="mr-2 h-4 w-4" /> Add
                  </Button>
                </form>
              )}
              <p className="text-xs text-gray-500">
                {plan === 'pro' ? 'Unlimited teams' : `${teams.length} / ${teamLimit} team${teamLimit === 1 ? '' : 's'} used`}
              </p>
            </CardContent>
          </Card>
        )
      })()}

      <div className="space-y-3">
        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Users className="mx-auto mb-3 h-10 w-10 text-gray-600" />
              <p>No teams yet. Create your first team above.</p>
            </CardContent>
          </Card>
        ) : teams.map(team => {
          const members: any[] = team.team_members ?? []
          const isExpanded = expandedTeam === team.id
          const teamEmails = new Set(members.map((m: any) => m.email).filter(Boolean))
          const allAccounts = [
            ...(ownerEmail ? [{ id: 'owner', email: ownerEmail }] : []),
            ...orgMembers,
          ]
          const available = allAccounts.filter(om => !teamEmails.has(om.email))
          return (
            <div key={team.id} className="rounded-xl border border-white/10 bg-[#161b27] overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-5 py-4">
                <button
                  className="flex items-center gap-3 flex-1 text-left min-w-0"
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-100">{team.name}</p>
                    <p className="text-sm text-gray-400">{members.length} {members.length === 1 ? 'member' : 'members'}</p>
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                </button>
                {isOwner && (
                  <Button variant="ghost" size="icon" onClick={() => deleteTeam(team.id)} className="text-gray-500 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Members */}
              {isExpanded && (
                <div className="border-t border-white/10 px-5 py-4 bg-[#1e2433] space-y-4">
                  {/* Member list */}
                  {members.length === 0 ? (
                    <p className="text-sm text-gray-500">No members yet. Add someone below.</p>
                  ) : (
                    <ul className="space-y-1">
                      {members.map((m: any) => (
                        <li key={m.id} className="rounded-lg px-2 py-2 group hover:bg-white/5">
                          {isOwner && editingMemberId === m.id ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <Input className="text-sm flex-1" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Display name" />
                                <select
                                  className="flex h-10 rounded-lg border border-white/20 bg-[#161b27] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                                  value={editRole} onChange={e => setEditRole(e.target.value)}
                                >
                                  <option value="cleaner">Cleaner</option>
                                  <option value="supervisor">Supervisor</option>
                                </select>
                              </div>
                              <div className="flex gap-2">
                                <PhoneInput className="flex-1 text-sm" placeholder="Phone (optional)" value={editPhone} onChange={setEditPhone} />
                                <Button size="sm" onClick={saveEditMember} disabled={!editName.trim()} className="flex-shrink-0">
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingMemberId(null)} className="flex-shrink-0">
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-gray-200">{m.name}</span>
                                {m.phone && <span className="ml-2 text-xs text-gray-500">{m.phone}</span>}
                              </div>
                              <span className="text-xs text-gray-500 capitalize flex-shrink-0">{m.role}</span>
                              {isOwner && <>
                                <button onClick={() => openEditMember(m)}
                                  className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => deleteMember(m.id)}
                                  className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Add member — owner only, picks from org invitees */}
                  {isOwner && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Add Member</p>
                      {available.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          {orgMembers.length === 0
                            ? 'No active team logins yet. Invite someone first in Settings → Team Logins.'
                            : 'All team logins are already on this team.'}
                        </p>
                      ) : (
                        <div className="flex gap-2">
                          <select
                            className="flex-1 h-10 rounded-lg border border-white/20 bg-[#161b27] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedMember[team.id] ?? ''}
                            onChange={e => setSelectedMember(prev => ({ ...prev, [team.id]: e.target.value }))}
                          >
                            <option value="">Select account…</option>
                            {available.map(om => (
                              <option key={om.id} value={om.email}>
                                {om.name ?? om.email}{om.id === 'owner' ? ' (you)' : ''}
                              </option>
                            ))}
                          </select>
                          <select
                            className="h-10 rounded-lg border border-white/20 bg-[#161b27] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
                            value={memberRole[team.id] ?? 'cleaner'}
                            onChange={e => setMemberRole(prev => ({ ...prev, [team.id]: e.target.value }))}
                          >
                            <option value="cleaner">Cleaner</option>
                            <option value="supervisor">Supervisor</option>
                          </select>
                          <Button
                            size="sm"
                            onClick={() => addMember(team.id)}
                            disabled={memberAdding[team.id] || !selectedMember[team.id]}
                            className="flex-shrink-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

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
