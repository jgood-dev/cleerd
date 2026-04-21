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
import { Plus, Calendar, Trash2, ClipboardCheck, CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type Job = {
  id: string
  property_id: string | null
  team_id: string | null
  package_id: string | null
  scheduled_at: string
  status: string
  notes: string | null
  properties: { name: string; address: string } | null
  teams: { name: string } | null
  inspections: { id: string }[]
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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function SchedulePage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [orgId, setOrgId] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [properties, setProperties] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [adding, setAdding] = useState(searchParams.get('new') === '1')
  const [startingJobId, setStartingJobId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

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
    const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user!.id).single()
    if (!org) return
    setOrgId(org.id)
    const [{ data: jobData }, { data: props }, { data: tms }, { data: pkgs }] = await Promise.all([
      supabase.from('jobs').select('*, properties(name, address), teams(name), inspections(id)').eq('org_id', org.id).order('scheduled_at'),
      supabase.from('properties').select('*').eq('org_id', org.id).order('created_at'),
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
  }

  function handlePackageChange(id: string) {
    setPackageId(id)
    // When switching to a named package, clear custom items; when switching to custom, keep items
    if (id) setJobItems([])
    setTemplateId('')
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    const pkg = packages.find(p => p.id === id)
    setJobItems(pkg?.package_items?.map((i: any) => i.label) ?? [])
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

    await supabase.from('jobs').insert({
      org_id: orgId,
      property_id: finalPropertyId,
      team_id: teamId || null,
      package_id: packageId || null,
      custom_items: jobItems.length > 0 ? jobItems : null,
      scheduled_at: scheduledAt,
      notes: notes || null,
      status: 'scheduled',
    })

    setAdding(false); setAddingProperty(false)
    setPropertyId(''); setTeamId(''); setPackageId(''); setScheduledAt(''); setNotes('')
    setJobItems([]); setNewItem(''); setTemplateId('')
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

  const groups = groupJobs(jobs)
  const sections = [
    { label: 'Today', jobs: groups.today, showEmpty: true },
    { label: 'Next 7 Days', jobs: groups.upcoming, showEmpty: false },
    { label: 'Later', jobs: groups.later, showEmpty: false },
    { label: 'Past', jobs: groups.past, showEmpty: false },
  ].filter(s => s.jobs.length > 0 || s.showEmpty)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Schedule</h1>
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
                  <div className="flex gap-2">
                    <select
                      className="flex h-10 flex-1 rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={propertyId} onChange={e => setPropertyId(e.target.value)}
                    >
                      <option value="">Select property</option>
                      {properties.map(p => <option key={p.id} value={p.id}>{p.address ?? p.name}</option>)}
                    </select>
                    <Button type="button" variant="outline" onClick={() => { setAddingProperty(true); setPropertyId('') }}>
                      <Plus className="h-4 w-4" />
                    </Button>
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

              {/* Date & Time */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Date & Time <span className="text-red-400">*</span></label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} required />
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
                return (
                  <div key={job.id} className={`flex items-center justify-between rounded-xl border px-5 py-4 group transition-opacity ${isDone ? 'border-white/5 bg-[#161b27] opacity-50' : 'border-white/10 bg-[#161b27]'}`}>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-100 truncate">{displayName}</p>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {formatDateTime(job.scheduled_at)}
                        {job.teams && <><span className="mx-1.5 text-gray-600">·</span><span>{(job.teams as any).name}</span></>}
                      </p>
                      {job.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{job.notes}</p>}
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
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => startInspection(job)} disabled={isStarting}>
                          {isStarting
                            ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Starting...</>
                            : <><ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Start Inspection</>}
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
        open={!!dialog} title={dialog?.title ?? ''} message={dialog?.message ?? ''}
        onConfirm={dialog?.onConfirm ?? (() => {})} onCancel={() => setDialog(null)}
      />
    </div>
  )
}
