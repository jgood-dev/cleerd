'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { PhoneInput } from '@/components/ui/phone-input'
import { Plus, Calendar, Trash2, ClipboardCheck, CheckCircle, Loader2, Pencil } from 'lucide-react'
import { getOrgForUser } from '@/lib/get-org'
import { TeamTimeline } from '@/components/ui/team-timeline'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Job = {
  id: string
  property_id: string | null
  team_id: string | null
  package_id: string | null
  duration_minutes: number | null
  scheduled_at: string
  status: string
  notes: string | null
  recurrence: string | null
  properties: { name: string; address: string } | null
  teams: { name: string } | null
  inspections: { id: string }[]
}

function nextScheduledAt(from: string, recurrence: string): string {
  const d = new Date(from)
  if (recurrence === 'weekly') d.setDate(d.getDate() + 7)
  else if (recurrence === 'biweekly') d.setDate(d.getDate() + 14)
  else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1)
  return d.toISOString()
}

const RECURRENCE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
}

function groupJobs(jobs: Job[]) {
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000)
  const today: Job[] = [], upcoming: Job[] = [], later: Job[] = [], past: Job[] = []
  for (const job of jobs) {
    const d = new Date(job.scheduled_at)
    if (d < todayStart) past.push(job)
    else if (d < todayEnd) today.push(job)
    else if (d < weekEnd) upcoming.push(job)
    else later.push(job)
  }
  return { today, upcoming, later, past }
}

function formatDateTime(iso: string, tz: string) {
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: tz })
}

export default function SchedulePage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orgId, setOrgId] = useState('')
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [adding, setAdding] = useState(searchParams.get('new') === '1')
  const [startingJobId, setStartingJobId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [editingJobId, setEditingJobId] = useState<string | null>(null)
  const [editPropertyId, setEditPropertyId] = useState('')
  const [editTeamId, setEditTeamId] = useState('')
  const [editPackageId, setEditPackageId] = useState('')
  const [editScheduledAt, setEditScheduledAt] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editItems, setEditItems] = useState<string[]>([])
  const [editNewItem, setEditNewItem] = useState('')
  const [editTemplateId, setEditTemplateId] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editDuration, setEditDuration] = useState('')
  const [editRecurrence, setEditRecurrence] = useState('')
  const [overlapError, setOverlapError] = useState('')
  const [editOverlapError, setEditOverlapError] = useState('')

  // New job form state
  const [propertyId, setPropertyId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [packageId, setPackageId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [jobItems, setJobItems] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [durationMinutes, setDurationMinutes] = useState<string>('')
  const [recurrence, setRecurrence] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const [jobSize, setJobSize] = useState<string>('medium')
  const [editSize, setEditSize] = useState<string>('medium')
  const [editPrice, setEditPrice] = useState<string>('')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [isOwner, setIsOwner] = useState(true)

  // Inline new property state
  const [addingProperty, setAddingProperty] = useState(false)
  const [newOwnerName, setNewOwnerName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [propError, setPropError] = useState('')
  const addressRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { org, isOwner: owner } = await getOrgForUser(supabase, user!.id, user!.email)
    if (!org) return
    setOrgId(org.id)
    setIsOwner(owner)
    if (org.timezone) setTimezone(org.timezone)
    const [{ data: jobData }, { data: props }, { data: tms }, { data: pkgs }] = await Promise.all([
      supabase.from('jobs').select('*, properties(name, address), teams(name), inspections(id)').eq('org_id', org.id).order('scheduled_at'),
      supabase.from('properties').select('id, name, address, size, entry_notes').eq('org_id', org.id).order('created_at'),
      supabase.from('teams').select('*').eq('org_id', org.id),
      supabase.from('packages').select('*, package_items(*)').eq('org_id', org.id).order('created_at'),
    ])
    setJobs(jobData ?? [])
    setProperties(props ?? [])
    setTeams(tms ?? [])
    setPackages((pkgs ?? []).map((p: any) => ({
      ...p,
      package_items: [...(p.package_items ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
    })))

    // Default team filter to the team whose member email matches the logged-in user
    const { data: memberMatch } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('email', user!.email ?? '')
      .in('team_id', (tms ?? []).map((t: any) => t.id))
      .single()
    if (memberMatch?.team_id) {
      setTeamFilter(memberMatch.team_id)
    }
  }

  function handlePackageChange(id: string) {
    setPackageId(id)
    if (id) setJobItems([])
    setTemplateId('')
    setDurationMinutes(calcDuration(id, jobSize))
    setPrice(calcPrice(id, jobSize) || (packages.find((p: any) => p.id === id)?.base_price != null ? String(packages.find((p: any) => p.id === id).base_price) : ''))
  }

  function handleSizeChange(size: string) {
    setJobSize(size)
    setDurationMinutes(calcDuration(packageId, size))
    if (packageId) setPrice(calcPrice(packageId, size))
  }

  function handleEditSizeChange(size: string) {
    setEditSize(size)
    setEditDuration(calcDuration(editPackageId, size))
    if (editPackageId) setEditPrice(calcPrice(editPackageId, size))
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    const pkg = packages.find(p => p.id === id)
    setJobItems(pkg?.package_items?.map((i: any) => i.label) ?? [])
  }

  function checkOverlap(teamId: string, scheduledAtVal: string, durationMins: number, excludeJobId?: string): Job | null {
    const start = new Date(scheduledAtVal).getTime()
    const end = start + durationMins * 60000
    for (const job of jobs) {
      if (job.id === excludeJobId) continue
      if (job.team_id !== teamId) continue
      if (job.status === 'done') continue
      const jStart = new Date(job.scheduled_at).getTime()
      const jEnd = jStart + (job.duration_minutes ?? 60) * 60000
      if (start < jEnd && jStart < end) return job
    }
    return null
  }

  async function spawnNextJob(job: Job) {
    if (!job.recurrence) return
    await supabase.from('jobs').insert({
      org_id: orgId,
      property_id: job.property_id,
      team_id: job.team_id,
      package_id: job.package_id,
      custom_items: (job as any).custom_items ?? null,
      duration_minutes: job.duration_minutes,
      recurrence: job.recurrence,
      recurrence_parent_id: job.id,
      scheduled_at: nextScheduledAt(job.scheduled_at, job.recurrence),
      notes: job.notes,
      status: 'scheduled',
    })
  }

  function calcDuration(pkgId: string, size: string): string {
    const pkg = packages.find(p => p.id === pkgId)
    if (!pkg?.base_duration_minutes) return ''
    const multiplier = (pkg.size_multipliers ?? {})[size] ?? 1.0
    return String(Math.round(pkg.base_duration_minutes * multiplier))
  }

  function calcPrice(pkgId: string, size: string): string {
    const pkg = packages.find(p => p.id === pkgId)
    if (pkg?.base_price == null) return ''
    const multiplier = (pkg.size_multipliers ?? {})[size] ?? 1.0
    return String(Math.round(pkg.base_price * multiplier * 100) / 100)
  }

  function addItem() {
    const label = newItem.trim()
    if (!label) return
    setJobItems(prev => [...prev, label])
    setNewItem('')
  }

  function removeItem(idx: number) {
    setJobItems(prev => prev.filter((_, i) => i !== idx))
  }

  function openEdit(job: Job) {
    setEditingJobId(job.id)
    setEditPropertyId(job.property_id ?? '')
    setEditTeamId(job.team_id ?? '')
    setEditPackageId(job.package_id ?? '')
    setEditScheduledAt(job.scheduled_at ? job.scheduled_at.slice(0, 16) : '')
    setEditNotes(job.notes ?? '')
    setEditItems((job as any).custom_items ?? [])
    setEditTemplateId('')
    setEditDuration(job.duration_minutes ? String(job.duration_minutes) : '')
    setEditRecurrence(job.recurrence ?? '')
    setEditSize((job as any).size ?? properties.find(p => p.id === job.property_id)?.size ?? 'medium')
    setEditPrice((job as any).price != null ? String((job as any).price) : '')
  }

  function closeEdit() {
    setEditingJobId(null)
    setEditNewItem('')
    setEditOverlapError('')
  }

  function handleTimelineJobClick(id: string) {
    const job = jobs.find(j => j.id === id)
    if (!job) return
    openEdit(job)
    setTimeout(() => {
      document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
  }

  function handleEditPackageChange(id: string) {
    setEditPackageId(id)
    if (id) setEditItems([])
    setEditTemplateId('')
  }

  function handleEditTemplateChange(id: string) {
    setEditTemplateId(id)
    const pkg = packages.find(p => p.id === id)
    setEditItems(pkg?.package_items?.map((i: any) => i.label) ?? [])
  }

  function addEditItem() {
    const label = editNewItem.trim()
    if (!label) return
    setEditItems(prev => [...prev, label])
    setEditNewItem('')
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingJobId || !editScheduledAt) return

    if (editTeamId) {
      const mins = editDuration ? parseInt(editDuration) : 60
      const conflict = checkOverlap(editTeamId, editScheduledAt, mins, editingJobId)
      if (conflict) {
        const prop = (conflict.properties as any)?.address ?? (conflict.properties as any)?.name ?? 'another job'
        setEditOverlapError(`This team is already booked from ${formatDateTime(conflict.scheduled_at, timezone)} (${prop}). Choose a different time or team.`)
        return
      }
    }
    setEditOverlapError('')
    setEditSaving(true)
    await supabase.from('jobs').update({
      property_id: editPropertyId || null,
      team_id: editTeamId || null,
      package_id: editPackageId || null,
      custom_items: !editPackageId && editItems.length > 0 ? editItems : null,
      duration_minutes: editDuration ? parseInt(editDuration) : null,
      recurrence: editRecurrence || null,
      scheduled_at: editScheduledAt,
      notes: editNotes || null,
      size: editSize || null,
      price: editPrice ? parseFloat(editPrice) : null,
    }).eq('id', editingJobId)

    // If recurrence was just enabled on a done job, create the next visit now
    const currentJob = jobs.find(j => j.id === editingJobId)
    if (editRecurrence && !currentJob?.recurrence && currentJob?.status === 'done') {
      await spawnNextJob({ ...currentJob, recurrence: editRecurrence, scheduled_at: editScheduledAt })
    }
    setEditSaving(false)
    closeEdit()
    await load()
  }

  async function saveNewProperty(): Promise<string | null> {
    const address = addressRef.current?.value?.trim() ?? ''
    if (!address) { setPropError('Address is required.'); return null }
    if (!newOwnerName.trim()) { setPropError('Owner name is required.'); return null }
    if (!newPhone.trim()) { setPropError('Phone is required.'); return null }
    if (!newEmail.trim()) { setPropError('Email is required.'); return null }
    const { data } = await supabase.from('properties').insert({
      org_id: orgId, name: address, address,
      owner_name: newOwnerName.trim(), phone: newPhone.trim(), client_email: newEmail.trim(),
    }).select().single()
    return data?.id ?? null
  }

  async function addJob(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    let finalPropertyId = propertyId

    if (addingProperty) {
      const id = await saveNewProperty()
      if (!id) { setSaving(false); return }
      finalPropertyId = id
      await load() // refresh properties list
    }

    if (!finalPropertyId || !scheduledAt) { setSaving(false); return }

    if (teamId) {
      const mins = durationMinutes ? parseInt(durationMinutes) : 60
      const conflict = checkOverlap(teamId, scheduledAt, mins)
      if (conflict) {
        const prop = (conflict.properties as any)?.address ?? (conflict.properties as any)?.name ?? 'another job'
        setOverlapError(`This team is already booked from ${formatDateTime(conflict.scheduled_at, timezone)} (${prop}). Choose a different time or team.`)
        setSaving(false)
        return
      }
    }
    setOverlapError('')

    const { data: newJob } = await supabase.from('jobs').insert({
      org_id: orgId,
      property_id: finalPropertyId,
      team_id: teamId || null,
      package_id: packageId || null,
      custom_items: jobItems.length > 0 ? jobItems : null,
      duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
      recurrence: recurrence || null,
      scheduled_at: scheduledAt,
      notes: notes || null,
      status: 'scheduled',
      price: price ? parseFloat(price) : null,
      size: jobSize || null,
    }).select().single()

    if (newJob?.id) {
      fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: newJob.id }),
      }).catch(() => {})
    }

    setAdding(false); setAddingProperty(false)
    setPropertyId(''); setTeamId(''); setPackageId(''); setScheduledAt(''); setNotes('')
    setJobItems([]); setNewItem(''); setTemplateId(''); setDurationMinutes(''); setRecurrence(''); setJobSize('medium'); setPrice('')
    setNewOwnerName(''); setNewPhone(''); setNewEmail('')
    if (addressRef.current) addressRef.current.value = ''
    setSaving(false)
    await load()
  }

  async function startInspection(job: Job) {
    setStartingJobId(job.id)
    const items: string[] = (job as any).custom_items
      ?? packages.find(p => p.id === job.package_id)?.package_items?.map((i: any) => i.label)
      ?? []

    const { data: inspection } = await supabase.from('inspections').insert({
      org_id: orgId,
      property_id: job.property_id,
      team_id: job.team_id,
      job_id: job.id,
      status: 'in_progress',
    }).select().single()

    if (inspection) {
      if (items.length > 0) {
        await supabase.from('checklist_items').insert(
          items.map(label => ({ inspection_id: inspection.id, label, completed: false }))
        )
      }
      await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', job.id)
      router.push(`/inspections/${inspection.id}`)
    }
    setStartingJobId(null)
  }

  async function markDone(job: Job) {
    await supabase.from('jobs').update({ status: 'done' }).eq('id', job.id)
    await spawnNextJob(job)
    await load()
  }

  function deleteJob(id: string) {
    setDialog({
      title: 'Delete job?',
      message: 'This job will be removed. Any linked inspection will remain.',
      onConfirm: async () => {
        await supabase.from('jobs').delete().eq('id', id)
        setDialog(null); await load()
      },
    })
  }

  const visibleJobs = teamFilter === 'all' ? jobs : jobs.filter(j => j.team_id === teamFilter)
  const groups = groupJobs(visibleJobs)
  const sections = [
    { label: 'Today', jobs: groups.today, showEmpty: true },
    { label: 'Next 7 Days', jobs: groups.upcoming, showEmpty: false },
    { label: 'Later', jobs: groups.later, showEmpty: false },
    { label: 'Past', jobs: groups.past, showEmpty: false },
  ].filter(s => s.jobs.length > 0 || s.showEmpty)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Schedule</h1>
          {isOwner && teams.length > 0 && (
            <select
              className="h-8 rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
            >
              <option value="all">All teams</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Schedule Job
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardHeader><CardTitle>Schedule New Job</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addJob} className="space-y-4">
              {/* Property */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Property <span className="text-red-400">*</span></label>
                {!addingProperty ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        className="flex h-10 flex-1 rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={propertyId} onChange={e => {
                          setPropertyId(e.target.value)
                          const prop = properties.find(p => p.id === e.target.value)
                          const sz = prop?.size ?? 'medium'
                          setJobSize(sz)
                          setDurationMinutes(calcDuration(packageId, sz))
                          if (packageId) setPrice(calcPrice(packageId, sz))
                        }}
                      >
                        <option value="">Select property</option>
                        {properties.map(p => <option key={p.id} value={p.id}>{p.address ?? p.name}</option>)}
                      </select>
                      <Button type="button" variant="outline" onClick={() => { setAddingProperty(true); setPropertyId('') }}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {propertyId && properties.find(p => p.id === propertyId)?.entry_notes && (
                      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-300">
                        <span className="font-semibold">Entry instructions: </span>
                        {properties.find(p => p.id === propertyId)!.entry_notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-400">New Property</span>
                      <button type="button" onClick={() => { setAddingProperty(false); setPropError('') }} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">Address <span className="text-red-400">*</span></label>
                      <AddressAutocomplete ref={addressRef} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">Owner name <span className="text-red-400">*</span></label>
                      <Input placeholder="Jane Smith" value={newOwnerName} onChange={e => { setNewOwnerName(e.target.value); setPropError('') }} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">Phone <span className="text-red-400">*</span></label>
                      <PhoneInput value={newPhone} onChange={v => { setNewPhone(v); setPropError('') }} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">Client email <span className="text-red-400">*</span></label>
                      <Input type="email" placeholder="client@example.com" value={newEmail} onChange={e => { setNewEmail(e.target.value); setPropError('') }} />
                    </div>
                    {propError && <p className="text-xs text-red-400">{propError}</p>}
                  </div>
                )}
              </div>

              {/* Team */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Team (optional)</label>
                <select className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={teamId} onChange={e => setTeamId(e.target.value)}>
                  <option value="">No team assigned</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Checklist */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Checklist</label>
                {/* Primary: Custom or named package */}
                <select
                  className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  value={packageId}
                  onChange={e => handlePackageChange(e.target.value)}
                >
                  <option value="">Custom</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>

                {/* Custom mode: template picker + editable list */}
                {!packageId && (
                  <>
                    <select
                      className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                      value={templateId}
                      onChange={e => handleTemplateChange(e.target.value)}
                    >
                      <option value="">Start blank</option>
                      {packages.map(p => <option key={p.id} value={p.id}>Start from: {p.name}</option>)}
                    </select>
                    <div className="rounded-lg border border-white/10 bg-[#1e2433] p-3 space-y-2">
                      {jobItems.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-1">No items yet — add below.</p>
                      )}
                      {jobItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 group">
                          <span className="flex-1 text-sm text-gray-200">{item}</span>
                          <button type="button" onClick={() => removeItem(idx)}
                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2 pt-1">
                        <Input
                          placeholder="Add checklist item..."
                          value={newItem}
                          onChange={e => setNewItem(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                          className="text-sm h-8"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-8 px-2">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Named package mode: read-only item list */}
                {packageId && (() => {
                  const pkg = packages.find(p => p.id === packageId)
                  const items: string[] = pkg?.package_items?.map((i: any) => i.label) ?? []
                  return (
                    <div className="rounded-lg border border-white/10 bg-[#1e2433] p-3 space-y-2">
                      {items.length === 0
                        ? <p className="text-xs text-gray-500 text-center py-1">This package has no items.</p>
                        : items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="flex-1 text-sm text-gray-400">{item}</span>
                          </div>
                        ))
                      }
                    </div>
                  )
                })()}
              </div>

              {/* Property Size */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Property Size
                  <span className="ml-2 text-xs text-gray-500 font-normal">affects duration & price</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['small', 'medium', 'large', 'xl'] as const).map(s => (
                    <button
                      key={s} type="button"
                      onClick={() => handleSizeChange(s)}
                      className={`rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${jobSize === s ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-white/20 bg-[#1e2433] text-gray-400 hover:border-white/40'}`}
                    >
                      {s === 'xl' ? 'XL' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Date & Time <span className="text-red-400">*</span></label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Duration (minutes)
                  {durationMinutes && <span className="ml-2 text-xs text-gray-500 font-normal">auto-calculated — override if needed</span>}
                </label>
                <div className="flex items-center gap-2">
                  <Input type="number" min="15" step="15" placeholder="e.g. 120" className="w-36"
                    value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
                  {durationMinutes && (
                    <span className="text-sm text-gray-400">
                      = {Math.floor(parseInt(durationMinutes) / 60)}h {parseInt(durationMinutes) % 60 > 0 ? `${parseInt(durationMinutes) % 60}m` : ''}
                    </span>
                  )}
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Recurrence</label>
                <select className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={recurrence} onChange={e => setRecurrence(e.target.value)}>
                  <option value="">One-time (no recurrence)</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Price
                  {price && <span className="ml-2 text-xs text-gray-500 font-normal">auto-filled from package — override if needed</span>}
                </label>
                <div className="relative w-36">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" className="pl-6 w-36"
                    value={price} onChange={e => setPrice(e.target.value)} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Notes (optional)</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Any special instructions..."
                  value={notes} onChange={e => setNotes(e.target.value)}
                />
              </div>

              {overlapError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                  {overlapError}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={saving}>
                  {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Schedule Job'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setAdding(false); setAddingProperty(false) }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <TeamTimeline
        jobs={jobs
          .filter(j => isOwner || !teamFilter || teamFilter === 'all' || j.team_id === teamFilter)
          .map(j => ({
            id: j.id,
            scheduled_at: j.scheduled_at,
            duration_minutes: j.duration_minutes,
            team_id: j.team_id,
            property_name: j.properties?.address ?? j.properties?.name ?? 'Unknown',
            status: j.status,
          }))}
        teams={isOwner ? teams : teams.filter(t => t.id === teamFilter)}
        timezone={timezone}
        onJobClick={handleTimelineJobClick}
      />

      {sections.map(({ label, jobs: sectionJobs, showEmpty }) => (
        <div key={label}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">{label}</h2>
          {sectionJobs.length === 0 && showEmpty ? (
            <div className="rounded-xl border border-white/5 bg-[#161b27] px-5 py-8 text-center">
              <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">No jobs scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sectionJobs.map(job => {
                const displayName = job.properties?.address ?? job.properties?.name ?? 'Unknown property'
                const inspection = job.inspections?.[0]
                const isDone = job.status === 'done'
                const isStarting = startingJobId === job.id
                const isEditing = editingJobId === job.id
                return (
                  <div key={job.id} id={`job-${job.id}`} className={`rounded-xl border transition-opacity ${isDone ? 'border-white/5 bg-[#161b27] opacity-50' : 'border-white/10 bg-[#161b27]'}`}>
                    <div className="flex items-center justify-between px-5 py-4 group">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-100 truncate">{displayName}</p>
                        <p className="text-sm text-gray-400 mt-0.5">
                          {formatDateTime(job.scheduled_at, timezone)}
                          {job.teams && <><span className="mx-1.5 text-gray-600">·</span><span>{(job.teams as any).name}</span></>}
                        </p>
                        {job.recurrence && (
                          <p className="text-xs text-blue-400 mt-0.5">↻ {RECURRENCE_LABELS[job.recurrence] ?? job.recurrence}</p>
                        )}
                        {job.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{job.notes}</p>}
                        {(() => {
                          const prop = properties.find(p => p.id === job.property_id)
                          return prop?.entry_notes ? (
                            <p className="text-xs text-amber-400 mt-0.5">🔑 {prop.entry_notes}</p>
                          ) : null
                        })()}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        <Badge variant={isDone ? 'secondary' : job.status === 'in_progress' ? 'warning' : 'default'}>
                          {isDone ? 'Done' : job.status === 'in_progress' ? 'In progress' : 'Scheduled'}
                        </Badge>
                        {!isDone && inspection && (
                          <Link href={`/inspections/${inspection.id}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> View Checklist
                            </Button>
                          </Link>
                        )}
                        {!isDone && !inspection && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => startInspection(job)} disabled={isStarting}>
                            {isStarting
                              ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Starting...</>
                              : <><ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Start Job</>}
                          </Button>
                        )}
                        {!isDone && (
                          <Button size="sm" variant="ghost" className="text-xs text-gray-500 hover:text-green-400" onClick={() => markDone(job)}>
                            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Done
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => isEditing ? closeEdit() : openEdit(job)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${isEditing ? 'text-blue-400' : 'text-gray-500 hover:text-blue-400'}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteJob(job.id)}
                          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="border-t border-white/10 px-5 py-4">
                        <form onSubmit={saveEdit} className="space-y-3">
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Property</label>
                            <select className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={editPropertyId} onChange={e => setEditPropertyId(e.target.value)}>
                              <option value="">No property</option>
                              {properties.map(p => <option key={p.id} value={p.id}>{p.address ?? p.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Team (optional)</label>
                            <select className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={editTeamId} onChange={e => setEditTeamId(e.target.value)}>
                              <option value="">No team assigned</option>
                              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Checklist</label>
                            <select className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                              value={editPackageId} onChange={e => handleEditPackageChange(e.target.value)}>
                              <option value="">Custom</option>
                              {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {!editPackageId && (
                              <>
                                <select className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                                  value={editTemplateId} onChange={e => handleEditTemplateChange(e.target.value)}>
                                  <option value="">Start blank</option>
                                  {packages.map(p => <option key={p.id} value={p.id}>Start from: {p.name}</option>)}
                                </select>
                                <div className="rounded-lg border border-white/10 bg-[#1e2433] p-3 space-y-2">
                                  {editItems.length === 0 && <p className="text-xs text-gray-500 text-center py-1">No items yet — add below.</p>}
                                  {editItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 group/item">
                                      <span className="flex-1 text-sm text-gray-200">{item}</span>
                                      <button type="button" onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))}
                                        className="text-gray-600 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <div className="flex gap-2 pt-1">
                                    <Input placeholder="Add checklist item..." value={editNewItem}
                                      onChange={e => setEditNewItem(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEditItem() } }}
                                      className="text-sm h-8" />
                                    <Button type="button" size="sm" variant="outline" onClick={addEditItem} className="h-8 px-2">
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              </>
                            )}
                            {editPackageId && (() => {
                              const pkg = packages.find(p => p.id === editPackageId)
                              const items: string[] = pkg?.package_items?.map((i: any) => i.label) ?? []
                              return (
                                <div className="rounded-lg border border-white/10 bg-[#1e2433] p-3 space-y-2">
                                  {items.length === 0
                                    ? <p className="text-xs text-gray-500 text-center py-1">This package has no items.</p>
                                    : items.map((item, idx) => <div key={idx} className="text-sm text-gray-400">{item}</div>)}
                                </div>
                              )
                            })()}
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Date & Time <span className="text-red-400">*</span></label>
                            <Input type="datetime-local" value={editScheduledAt} onChange={e => setEditScheduledAt(e.target.value)} required />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Duration (minutes)</label>
                            <div className="flex items-center gap-2">
                              <Input type="number" min="15" step="15" placeholder="e.g. 120" className="w-36"
                                value={editDuration} onChange={e => setEditDuration(e.target.value)} />
                              {editDuration && (
                                <span className="text-sm text-gray-400">
                                  = {Math.floor(parseInt(editDuration) / 60)}h {parseInt(editDuration) % 60 > 0 ? `${parseInt(editDuration) % 60}m` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">
                              Property Size
                              <span className="ml-2 text-xs text-gray-500 font-normal">affects duration & price</span>
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                              {(['small', 'medium', 'large', 'xl'] as const).map(s => (
                                <button
                                  key={s} type="button"
                                  onClick={() => handleEditSizeChange(s)}
                                  className={`rounded-lg border py-2 text-sm font-medium capitalize transition-colors ${editSize === s ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-white/20 bg-[#1e2433] text-gray-400 hover:border-white/40'}`}
                                >
                                  {s === 'xl' ? 'XL' : s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Price</label>
                            <div className="relative w-36">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                              <Input type="number" min="0" step="0.01" placeholder="0.00" className="pl-6 w-36"
                                value={editPrice} onChange={e => setEditPrice(e.target.value)} />
                            </div>
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Recurrence</label>
                            <select className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={editRecurrence} onChange={e => setEditRecurrence(e.target.value)}>
                              <option value="">One-time (no recurrence)</option>
                              <option value="weekly">Weekly</option>
                              <option value="biweekly">Every 2 weeks</option>
                              <option value="monthly">Monthly</option>
                            </select>
                            {editRecurrence && (() => {
                              const job = jobs.find(j => j.id === editingJobId)
                              if (job?.status === 'done' && !job.recurrence) {
                                return <p className="mt-1.5 text-xs text-blue-400">Saving will schedule the next {RECURRENCE_LABELS[editRecurrence]?.toLowerCase()} visit immediately.</p>
                              }
                              return null
                            })()}
                          </div>
                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-300">Notes (optional)</label>
                            <textarea className="flex min-h-[60px] w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Any special instructions..." value={editNotes} onChange={e => setEditNotes(e.target.value)} />
                          </div>
                          {editOverlapError && (
                            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                              {editOverlapError}
                            </div>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button type="submit" disabled={editSaving}>
                              {editSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
                            </Button>
                            <Button type="button" variant="outline" onClick={closeEdit}>Cancel</Button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}

      <ConfirmDialog
        open={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''}
        onConfirm={dialog?.onConfirm ?? (() => {})} onCancel={() => setDialog(null)}
      />
    </div>
  )
}
