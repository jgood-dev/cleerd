'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useSearchParams } from 'next/navigation'
import { getOrgForUser } from '@/lib/get-org'

const RECURRENCE_OPTIONS = [
  { value: '', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
]

export default function JobsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [orgId, setOrgId] = useState('')
  const initialFilter = (searchParams.get('filter') ?? 'all') as 'all' | 'scheduled' | 'in_progress' | 'done'
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'done'>(initialFilter)
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [isOwner, setIsOwner] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { org, isOwner: owner } = await getOrgForUser(supabase, user!.id, user!.email)
    if (!org) return
    setOrgId(org.id)
    setIsOwner(owner)

    const [{ data: jobData }, { data: teamData }] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, properties(name, address), teams(name), inspections(id, overall_score, status, ai_report)')
        .eq('org_id', org.id)
        .order('scheduled_at', { ascending: false }),
      supabase.from('teams').select('id, name').eq('org_id', org.id).order('created_at'),
    ])
    setJobs(jobData ?? [])
    setTeams(teamData ?? [])

    // Default to the team whose member email matches the logged-in user
    const { data: memberMatch } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('email', user!.email ?? '')
      .in('team_id', (teamData ?? []).map((t: any) => t.id))
      .single()
    if (memberMatch?.team_id) {
      setTeamFilter(memberMatch.team_id)
    }
  }

  async function setRecurrence(jobId: string, recurrence: string) {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, recurrence: recurrence || null } : j))
    await supabase.from('jobs').update({ recurrence: recurrence || null }).eq('id', jobId)
  }

  function deleteJob(id: string) {
    setDialog({
      title: 'Delete job?',
      message: 'This job and any linked checklist will be permanently deleted.',
      onConfirm: async () => {
        await supabase.from('jobs').delete().eq('id', id)
        setJobs(prev => prev.filter(j => j.id !== id))
        setDialog(null)
      },
    })
  }

  const filtered = jobs.filter(j => {
    if (filter !== 'all' && j.status !== filter) return false
    if (teamFilter !== 'all' && j.team_id !== teamFilter) return false
    if (dateFrom && new Date(j.scheduled_at) < new Date(dateFrom)) return false
    if (dateTo && new Date(j.scheduled_at) > new Date(dateTo + 'T23:59:59')) return false
    return true
  })

  // Status counts scoped to the current team filter
  const teamScoped = teamFilter === 'all' ? jobs : jobs.filter(j => j.team_id === teamFilter)
  const counts = {
    all: teamScoped.length,
    scheduled: teamScoped.filter(j => j.status === 'scheduled').length,
    in_progress: teamScoped.filter(j => j.status === 'in_progress').length,
    done: teamScoped.filter(j => j.status === 'done').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Jobs</h1>
        <Link href="/schedule">
          <Button><Plus className="mr-2 h-4 w-4" />Schedule Job</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-white/5 p-1 w-fit">
          {(['all', 'scheduled', 'in_progress', 'done'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-1.5 text-xs text-gray-500">{counts[f]}</span>
            </button>
          ))}
        </div>

        {isOwner && teams.length > 0 && (
          <select
            className="h-9 rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={teamFilter}
            onChange={e => setTeamFilter(e.target.value)}
          >
            <option value="all">All teams</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">From</span>
          <Input type="date" className="h-9 w-36 text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-sm text-gray-500">To</span>
          <Input type="date" className="h-9 w-36 text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="text-xs text-gray-500 h-9"
              onClick={() => { setDateFrom(''); setDateTo('') }}>Clear</Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>
          {teamFilter !== 'all'
            ? `${teams.find(t => t.id === teamFilter)?.name ?? 'Team'} — `
            : ''}
          {filter === 'all' ? 'All Jobs' : filter === 'in_progress' ? 'In Progress' : filter.charAt(0).toUpperCase() + filter.slice(1)}
        </CardTitle></CardHeader>
        <CardContent>
          {!filtered.length ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No {filter === 'all' ? '' : filter.replace('_', ' ')} jobs found.</p>
              <Link href="/schedule">
                <Button className="mt-4">Schedule a job</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-gray-500">
                    <th className="pb-3 font-medium">Property</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Team</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Recurrence</th>
                    <th className="pb-3 font-medium hidden sm:table-cell">Score</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(job => {
                    const property = job.properties as any
                    const inspection = (job.inspections as any[])?.[0]
                    const displayName = property?.address ?? property?.name ?? '—'
                    const statusVariant =
                      job.status === 'done' ? 'success'
                      : job.status === 'in_progress' ? 'warning'
                      : 'default'
                    const statusLabel =
                      job.status === 'in_progress' ? 'In Progress'
                      : job.status.charAt(0).toUpperCase() + job.status.slice(1)

                    return (
                      <tr key={job.id} className="hover:bg-white/5 group">
                        <td className="py-3 font-medium text-gray-100 max-w-[180px] truncate">{displayName}</td>
                        <td className="py-3 text-gray-400 hidden md:table-cell">{(job.teams as any)?.name ?? '—'}</td>
                        <td className="py-3 text-gray-400 hidden sm:table-cell whitespace-nowrap">
                          {new Date(job.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3">
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {job.recurrence && <RefreshCw className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                            <select
                              className="h-7 rounded border border-white/20 bg-[#1e2433] text-gray-200 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={job.recurrence ?? ''}
                              onChange={e => setRecurrence(job.id, e.target.value)}
                            >
                              {RECURRENCE_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="py-3 hidden sm:table-cell">
                          {inspection?.overall_score ? (
                            <span className={`font-semibold text-xs ${inspection.overall_score >= 80 ? 'text-green-400' : inspection.overall_score >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {inspection.overall_score}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-1">
                            {inspection
                              ? <Link href={`/inspections/${inspection.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                              : <Link href="/schedule"><Button variant="ghost" size="sm" className="text-gray-500">Schedule</Button></Link>
                            }
                            <Button variant="ghost" size="icon"
                              onClick={() => deleteJob(job.id)}
                              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
