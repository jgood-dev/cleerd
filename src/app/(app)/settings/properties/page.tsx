'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ArrowLeft, MapPin, CalendarPlus, Mail, MailWarning, RotateCw } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { PhoneInput } from '@/components/ui/phone-input'
import { getOrgForUser } from '@/lib/get-org'

type ClientProperty = {
  id: string
  name: string | null
  address: string | null
  owner_name: string | null
  phone: string | null
  client_email: string | null
  size: string | null
  entry_notes: string | null
  created_at?: string | null
}

type JobSummary = {
  id: string
  property_id: string | null
  scheduled_at: string | null
  status: string | null
  recurrence: string | null
  price: number | null
}

type PropertyInsight = {
  property: ClientProperty
  jobs: JobSummary[]
  completedJobs: JobSummary[]
  upcomingJobs: JobSummary[]
  lastCompletedJob: JobSummary | null
  daysSinceLastService: number | null
  needsEmail: boolean
  neverBooked: boolean
  followUpDue: boolean
  priorityLabel: string
  priorityDescription: string
  priority: number
}

function formatDate(value: string | null) {
  if (!value) return 'Not scheduled yet'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getPropertyLabel(property: ClientProperty) {
  return property.address ?? property.name ?? 'Client location'
}

function buildScheduleHref(property: ClientProperty) {
  return `/schedule?new=1&propertyId=${encodeURIComponent(property.id)}`
}

function buildFollowUpMailto(insight: PropertyInsight) {
  const email = insight.property.client_email?.trim()
  if (!email) return '#'

  const firstName = insight.property.owner_name?.trim().split(/\s+/)[0] ?? 'there'
  const location = getPropertyLabel(insight.property)
  const subject = `Follow-up service for ${location}`
  const body = [
    `Hi ${firstName},`,
    '',
    insight.daysSinceLastService !== null
      ? `I wanted to check whether you would like to schedule the next service visit for ${location}. It has been about ${insight.daysSinceLastService} days since the last completed visit.`
      : `I wanted to check whether you would like to schedule a service visit for ${location}.`,
    '',
    'Reply with a day/time that works and we can get it on the calendar.',
    '',
    'Thanks!',
  ].join('\n')

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export default function PropertiesPage() {
  const [supabase] = useState(() => createClient())
  const [orgId, setOrgId] = useState('')
  const [properties, setProperties] = useState<ClientProperty[]>([])
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newSize, setNewSize] = useState('medium')
  const [newEntryNotes, setNewEntryNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [referenceTime] = useState(() => Date.now())
  const addressRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { org } = await getOrgForUser(supabase, user.id)
    if (!org) return

    setOrgId(org.id)

    const [{ data: propertyRows }, { data: jobRows }] = await Promise.all([
      supabase.from('properties').select('*').eq('org_id', org.id).order('created_at'),
      supabase
        .from('jobs')
        .select('id, property_id, scheduled_at, status, recurrence, price')
        .eq('org_id', org.id)
        .order('scheduled_at', { ascending: false }),
    ])

    setProperties((propertyRows ?? []) as ClientProperty[])
    setJobs((jobRows ?? []) as JobSummary[])
  }, [supabase])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [load])

  const propertyInsights = useMemo<PropertyInsight[]>(() => {
    const now = referenceTime
    const oneDay = 1000 * 60 * 60 * 24

    return properties.map(property => {
      const propertyJobs = jobs.filter(job => job.property_id === property.id)
      const completedJobs = propertyJobs.filter(job => job.status === 'done' && job.scheduled_at)
      const upcomingJobs = propertyJobs.filter(job => {
        if (!job.scheduled_at || job.status === 'done' || job.status === 'cancelled') return false
        return new Date(job.scheduled_at).getTime() >= now
      })
      const lastCompletedJob = completedJobs[0] ?? null
      const daysSinceLastService = lastCompletedJob?.scheduled_at
        ? Math.max(0, Math.floor((now - new Date(lastCompletedJob.scheduled_at).getTime()) / oneDay))
        : null
      const needsEmail = !property.client_email?.trim()
      const neverBooked = propertyJobs.length === 0
      const followUpDue = Boolean(lastCompletedJob && upcomingJobs.length === 0 && !lastCompletedJob.recurrence)

      let priorityLabel = 'Ready'
      let priorityDescription = upcomingJobs.length > 0
        ? `Next job already scheduled for ${formatDate(upcomingJobs[0].scheduled_at)}.`
        : 'Contact details are ready for future scheduling.'
      let priority = 0

      if (followUpDue) {
        priorityLabel = 'Follow up due'
        priorityDescription = daysSinceLastService !== null
          ? `Last completed ${daysSinceLastService} days ago with no future job booked.`
          : 'Completed work has no future job booked.'
        priority = 3
      } else if (neverBooked) {
        priorityLabel = 'Book first job'
        priorityDescription = 'Client location exists but has no scheduled work yet.'
        priority = 2
      } else if (needsEmail) {
        priorityLabel = 'Add email'
        priorityDescription = 'Client updates and follow-up messages need an email address.'
        priority = 1
      }

      return {
        property,
        jobs: propertyJobs,
        completedJobs,
        upcomingJobs,
        lastCompletedJob,
        daysSinceLastService,
        needsEmail,
        neverBooked,
        followUpDue,
        priorityLabel,
        priorityDescription,
        priority,
      }
    }).sort((a, b) => b.priority - a.priority || getPropertyLabel(a.property).localeCompare(getPropertyLabel(b.property)))
  }, [jobs, properties, referenceTime])

  const followUpCount = propertyInsights.filter(insight => insight.followUpDue).length
  const neverBookedCount = propertyInsights.filter(insight => insight.neverBooked).length
  const missingEmailCount = propertyInsights.filter(insight => insight.needsEmail).length
  const topOpportunity = propertyInsights.find(insight => insight.priority > 0) ?? null

  async function addProperty(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const address = addressRef.current?.value?.trim() ?? ''
    if (!address) { setError('Address is required.'); return }
    if (!newContactName.trim()) { setError('Primary contact is required.'); return }
    if (!newPhone.trim()) { setError('Phone number is required.'); return }
    if (!newEmail.trim()) { setError('Client email is required.'); return }
    await supabase.from('properties').insert({
      org_id: orgId,
      name: address,
      address,
      owner_name: newContactName.trim(),
      phone: newPhone.trim(),
      client_email: newEmail.trim(),
      size: newSize,
      entry_notes: newEntryNotes.trim() || null,
    })
    if (addressRef.current) addressRef.current.value = ''
    setNewEmail(''); setNewContactName(''); setNewPhone(''); setNewSize('medium'); setNewEntryNotes(''); setAdding(false)
    await load()
  }

  function deleteProperty(id: string) {
    setDialog({
      title: 'Delete client location?',
      message: 'This client location will be permanently removed. Past jobs and reports will remain.',
      onConfirm: async () => {
        await supabase.from('properties').delete().eq('id', id)
        setDialog(null)
        await load()
      },
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Client Locations</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage customers, service sites, contacts, and access notes.</p>
        </div>
      </div>

      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-300">Repeat-service pipeline</p>
              <h2 className="mt-1 text-lg font-semibold text-white">
                {topOpportunity ? topOpportunity.priorityLabel : 'Every client location is caught up'}
              </h2>
              <p className="mt-1 text-sm text-gray-300">
                {topOpportunity
                  ? `${getPropertyLabel(topOpportunity.property)} — ${topOpportunity.priorityDescription}`
                  : 'No obvious missing contact or repeat-booking opportunities right now.'}
              </p>
            </div>
            {topOpportunity && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Link
                  href={buildScheduleHref(topOpportunity.property)}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <CalendarPlus className="h-4 w-4" /> Book service
                </Link>
                {topOpportunity.property.client_email && (
                  <a
                    href={buildFollowUpMailto(topOpportunity)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-transparent px-2.5 text-sm font-medium text-gray-100 transition-colors hover:bg-white/10"
                  >
                    <Mail className="h-4 w-4" /> Email follow-up
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-[#111723] p-3">
              <p className="text-2xl font-bold text-white">{followUpCount}</p>
              <p className="text-xs text-gray-400">completed sites ready for repeat outreach</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#111723] p-3">
              <p className="text-2xl font-bold text-white">{neverBookedCount}</p>
              <p className="text-xs text-gray-400">saved locations with no first job yet</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#111723] p-3">
              <p className="text-2xl font-bold text-white">{missingEmailCount}</p>
              <p className="text-xs text-gray-400">locations missing an update email</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        {!adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Location
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardHeader><CardTitle>New Client Location</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addProperty} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Address <span className="text-red-400">*</span>
                </label>
                <AddressAutocomplete ref={addressRef} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Primary contact <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="Jane Smith"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Phone number <span className="text-red-400">*</span>
                </label>
                <PhoneInput value={newPhone} onChange={setNewPhone} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Job or location size</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={newSize} onChange={e => setNewSize(e.target.value)}
                >
                  <option value="small">Small — quick visit or compact site</option>
                  <option value="medium">Standard — typical recurring service</option>
                  <option value="large">Large — extended visit or larger site</option>
                  <option value="xl">Extra large — multi-zone or complex site</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Client email for updates <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Access or service notes (optional)</label>
                <textarea
                  className="flex min-h-[70px] w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Gate code, lockbox details, preferred entrance, site-specific notes..."
                  value={newEntryNotes}
                  onChange={e => setNewEntryNotes(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit">Save Location</Button>
                <Button type="button" variant="outline" onClick={() => {
                  setAdding(false)
                  if (addressRef.current) addressRef.current.value = ''
                  setNewEmail(''); setNewContactName(''); setNewPhone(''); setNewEntryNotes(''); setError('')
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {propertyInsights.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No client locations yet.</p>
            <p className="text-sm text-gray-500 mt-1">Add one customer or service site to unlock scheduling and client updates.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {propertyInsights.map(insight => {
            const p = insight.property
            return (
              <div key={p.id} className="rounded-xl border border-white/10 bg-[#161b27] px-5 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-100">{getPropertyLabel(p)}</p>
                      {insight.followUpDue && <Badge variant="warning">Follow-up due</Badge>}
                      {insight.neverBooked && <Badge variant="secondary">No jobs yet</Badge>}
                      {insight.needsEmail && <Badge variant="warning">Missing email</Badge>}
                    </div>
                    <p className="text-sm text-gray-400">
                      {p.owner_name && <span>{p.owner_name}</span>}
                      {p.owner_name && p.phone && <span className="mx-1.5 text-gray-600">·</span>}
                      {p.phone && <span>{p.phone}</span>}
                    </p>
                    <p className="text-sm text-gray-500">
                      {p.size && <span className="capitalize mr-2">{p.size}</span>}
                      {p.client_email ?? <span className="text-yellow-400">No email — client updates cannot be sent</span>}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                      <span>{insight.completedJobs.length} completed</span>
                      <span className="text-gray-600">·</span>
                      <span>{insight.upcomingJobs.length} upcoming</span>
                      <span className="text-gray-600">·</span>
                      <span>Last service: {formatDate(insight.lastCompletedJob?.scheduled_at ?? null)}</span>
                    </div>
                    <p className="text-xs text-blue-300">{insight.priorityDescription}</p>
                    {p.entry_notes && (
                      <p className="text-xs text-amber-400">Access notes: {p.entry_notes}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link
                      href={buildScheduleHref(p)}
                      className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <CalendarPlus className="h-4 w-4" /> Book
                    </Link>
                    {p.client_email ? (
                      <a
                        href={buildFollowUpMailto(insight)}
                        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/20 bg-transparent px-2.5 text-sm font-medium text-gray-100 transition-colors hover:bg-white/10"
                      >
                        <RotateCw className="h-4 w-4" /> Follow up
                      </a>
                    ) : (
                      <span className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 text-sm font-medium text-amber-300">
                        <MailWarning className="h-4 w-4" /> Add email
                      </span>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteProperty(p.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
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
