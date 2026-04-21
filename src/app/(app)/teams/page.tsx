'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Users } from 'lucide-react'

export default function TeamsPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState<string>('')
  const [teams, setTeams] = useState<any[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) { setDebugInfo(`Auth error: ${userError?.message ?? 'no user'}`); return }

    const { data: org, error: orgError } = await supabase.from('organizations').select('id').eq('owner_id', user.id).single()
    if (orgError || !org) { setDebugInfo(`Org error: ${orgError?.message ?? 'no org found'} | uid: ${user.id}`); return }

    setOrgId(org.id)
    setDebugInfo(`org: ${org.id}`)
    const { data, error: teamsError } = await supabase.from('teams').select('*, team_members(*)').eq('org_id', org.id)
    if (teamsError) setDebugInfo(`Teams error: ${teamsError.message}`)
    setTeams(data ?? [])
  }

  async function addTeam(e: React.FormEvent) {
    e.preventDefault()
    if (!newTeamName.trim() || !orgId) return
    setLoading(true)
    const { error } = await supabase.from('teams').insert({ org_id: orgId, name: newTeamName.trim() })
    if (error) setDebugInfo(`Insert error: ${error.message}`)
    setNewTeamName('')
    setLoading(false)
    await load()
  }

  async function deleteTeam(id: string) {
    if (!confirm('Delete this team?')) return
    await supabase.from('teams').delete().eq('id', id)
    await load()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Teams</h1>
      {debugInfo && <p className="text-xs text-yellow-400 font-mono bg-yellow-500/10 border border-yellow-500/20 rounded p-2">{debugInfo}</p>}

      <Card>
        <CardHeader><CardTitle>Add Team</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addTeam} className="flex gap-3">
            <Input placeholder="Team name (e.g. Morning Crew)" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
            <Button type="submit" disabled={loading}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p>No teams yet. Create your first team above.</p>
            </CardContent>
          </Card>
        ) : teams.map(team => (
          <Card key={team.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="font-semibold text-gray-100">{team.name}</p>
                <p className="text-sm text-gray-400">{team.team_members?.length ?? 0} members</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteTeam(team.id)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
