'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Plus, Calendar, Trash2, ClipboardCheck, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Job = {
  id: string
  scheduled_at: string
  status: string
  notes: string | null
  properties: { name: string; address: string } | null
  teams: { name: string } | null
  inspections: { id: string }[]
}

function groupJobs(jobs: Job[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000)

  const today: Job[] = []
  const upcoming: Job[] = []
  const later: Job[] = []
  const past: Job[] = []

  for (const job of jobs) {
    const d = new Date(job.scheduled_at)
    if (d < todayStart) past.push(job)
    else if (d < todayEnd) today.push(job)
    else if (d < weekEnd) upcoming.push(job)
    else later.push(job)
  }

  return { today, upcoming, later, past }
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SchedulePage() {
  const supabase = createClient()
  const router = useRouter()
  const [orgId, setOrgId] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [adding, setAdding] = useState(false)
  const [propertyId, setPropertyId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user!.id).single()
    if (!org) return
    setOrgId(org.id)
    const [{ data: jobData }, { data: props }, { data: tms }] = await Promise.all([
      supabase.from('jobs')
        .select('*, properties(name, address), teams(name), inspections(id)')
        .eq('org_id', org.id)
        .order('scheduled_at'),
      supabase.from('properties').select('id, address, name').eq('org_id', org.id),
      supabase.from('teams').select('id, name').eq('org_id', org.id),
    ])
    setJobs(jobData ?? [])
    setProperties(props ?? [])
    setTeams(tms ?? [])
  }

  async function addJob(e: React.FormEvent) {
    e.preventDefault()
    if (!propertyId || !scheduledAt) return
    setLoading(true)
    await supabase.from('jobs').insert({
      org_id: orgId,
      property_id: propertyId,
      team_id: teamId || null,
      scheduled_at: scheduledAt,
      notes: notes || null,
      status: 'scheduled',
    })
    setAdding(false); setPropertyId(''); setTeamId(''); setScheduledAt(''); setNotes('')
    setLoading(false)
    await load()
  }

  async function markDone(job: Job) {
    await supabase.from('jobs').update({ status: 'done' }).eq('id', job.id)
    await load()
  }

  function deleteJob(id: string) {
    setDialog({
      title: 'Delete job?',
      message: 'This job will be permanently removed. Any linked inspection will remain.',
      onConfirm: async () => {
        await supabase.from('jobs').delete().eq('id', id)
        setDialog(null)
        await load()
      },
    })
  }

  function startInspection(job: Job) {
    const params = new URLSearchParams({ job_id: job.id })
    if (job.properties) params.set('property_id', (job as any).property_id ?? '')
    if (job.teams) params.set('team_id', (job as any).team_id ?? '')
    router.push(`/inspections/new?${params.toString()}`)
  }

  const groups = groupJobs(jobs)

  const sections = [
    { label: 'Today', jobs: groups.today, emptyText: 'No jobs scheduled for today.' },
    { label: 'Next 7 Days', jobs: groups.upcoming, emptyText: null },
    { label: 'Later', jobs: groups.later, emptyText: null },
    { label: 'Past', jobs: groups.past, emptyText: null },
  ].filter(s => s.jobs.length > 0 || s.label === 'Today')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Job
        </Button>
      </div>

      {adding && (
        <Card>
          <CardHeader><CardTitle>New Job</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addJob} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Property <span className="text-red-400">*</span></label>
                <select
                  className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={propertyId} onChange={e => setPropertyId(e.target.value)} required
                >
                  <option value="">Select property</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.address ?? p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Team (optional)</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={teamId} onChange={e => setTeamId(e.target.value)}
                >
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Date & Time <span className="text-red-400">*</span></label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Notes (optional)</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special instructions..."
                  value={notes} onChange={e => setNotes(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={loading}>Schedule Job</Button>
                <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {sections.map(({ label, jobs: sectionJobs, emptyText }) => (
        <div key={label}>
          <h2 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</h2>
          {sectionJobs.length === 0 && emptyText ? (
            <div className="rounded-xl border border-white/5 bg-[#161b27] px-5 py-8 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">{emptyText}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sectionJobs.map(job => {
                const property = job.properties
                const displayName = property?.address ?? property?.name ?? 'Unknown property'
                const inspection = job.inspections?.[0]
                const isDone = job.status === 'done'
                return (
                  <div key={job.id} className={`flex items-center justify-between rounded-xl border px-5 py-4 group ${isDone ? 'border-white/5 bg-[#161b27] opacity-60' : 'border-white/10 bg-[#161b27]'}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-100 truncate">{displayName}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {formatDateTime(job.scheduled_at)}
                        {job.teams && <span className="mx-1.5 text-gray-600">·</span>}
                        {job.teams && <span>{(job.teams as any).name}</span>}
                      </p>
                      {job.notes && <p className="text-xs text-gray-500 mt-0.5">{job.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                      <Badge variant={isDone ? 'secondary' : job.status === 'in_progress' ? 'warning' : 'default'}>
                        {isDone ? 'Done' : job.status === 'in_progress' ? 'In progress' : 'Scheduled'}
                      </Badge>
                      {!isDone && inspection && (
                        <Link href={`/inspections/${inspection.id}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> View Inspection
                          </Button>
                        </Link>
                      )}
                      {!isDone && !inspection && (
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => startInspection(job)}>
                          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Start Inspection
                        </Button>
                      )}
                      {!isDone && (
                        <Button size="sm" variant="ghost" className="text-xs text-gray-500 hover:text-green-400" onClick={() => markDone(job)}>
                          <CheckCircle className="mr-1 h-3.5 w-3.5" /> Done
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)}
                        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

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
