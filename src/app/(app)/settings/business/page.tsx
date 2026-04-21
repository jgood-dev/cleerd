'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Pencil, Globe, Star } from 'lucide-react'
import Link from 'next/link'
import { getOrgForUser } from '@/lib/get-org'

const TIMEZONE_GROUPS = [
  {
    label: 'United States & Canada',
    zones: [
      { value: 'America/New_York', label: 'Eastern Time — New York, Miami, Atlanta' },
      { value: 'America/Chicago', label: 'Central Time — Chicago, Dallas, Houston' },
      { value: 'America/Denver', label: 'Mountain Time — Denver, Phoenix area' },
      { value: 'America/Phoenix', label: 'Mountain Time (no DST) — Phoenix' },
      { value: 'America/Los_Angeles', label: 'Pacific Time — Los Angeles, Seattle' },
      { value: 'America/Anchorage', label: 'Alaska Time — Anchorage' },
      { value: 'Pacific/Honolulu', label: 'Hawaii Time — Honolulu' },
      { value: 'America/Toronto', label: 'Eastern Time — Toronto' },
      { value: 'America/Vancouver', label: 'Pacific Time — Vancouver' },
      { value: 'America/Edmonton', label: 'Mountain Time — Calgary, Edmonton' },
      { value: 'America/Winnipeg', label: 'Central Time — Winnipeg' },
      { value: 'America/Halifax', label: 'Atlantic Time — Halifax' },
    ],
  },
  {
    label: 'Europe',
    zones: [
      { value: 'Europe/London', label: 'GMT/BST — London, Dublin' },
      { value: 'Europe/Paris', label: 'CET — Paris, Brussels, Amsterdam' },
      { value: 'Europe/Berlin', label: 'CET — Berlin, Vienna, Zurich' },
      { value: 'Europe/Rome', label: 'CET — Rome, Milan' },
      { value: 'Europe/Madrid', label: 'CET — Madrid, Barcelona' },
      { value: 'Europe/Helsinki', label: 'EET — Helsinki, Kyiv' },
    ],
  },
  {
    label: 'Australia & Pacific',
    zones: [
      { value: 'Australia/Sydney', label: 'AEDT — Sydney, Melbourne' },
      { value: 'Australia/Brisbane', label: 'AEST — Brisbane (no DST)' },
      { value: 'Australia/Perth', label: 'AWST — Perth' },
      { value: 'Pacific/Auckland', label: 'NZDT — Auckland' },
    ],
  },
  {
    label: 'Americas (other)',
    zones: [
      { value: 'America/Mexico_City', label: 'CST — Mexico City' },
      { value: 'America/Sao_Paulo', label: 'BRT — São Paulo' },
      { value: 'America/Argentina/Buenos_Aires', label: 'ART — Buenos Aires' },
    ],
  },
  {
    label: 'Asia & Middle East',
    zones: [
      { value: 'Asia/Dubai', label: 'GST — Dubai, Abu Dhabi' },
      { value: 'Asia/Kolkata', label: 'IST — Mumbai, Delhi' },
      { value: 'Asia/Singapore', label: 'SGT — Singapore, Kuala Lumpur' },
      { value: 'Asia/Tokyo', label: 'JST — Tokyo' },
      { value: 'Asia/Shanghai', label: 'CST — Beijing, Shanghai' },
    ],
  },
  {
    label: 'Africa',
    zones: [
      { value: 'Africa/Johannesburg', label: 'SAST — Johannesburg, Cape Town' },
      { value: 'Africa/Cairo', label: 'EET — Cairo' },
      { value: 'Africa/Lagos', label: 'WAT — Lagos, Accra' },
    ],
  },
]

export default function BusinessSettingsPage() {
  const supabase = createClient()
  const [org, setOrg] = useState<any>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tzSaving, setTzSaving] = useState(false)
  const [tzSaved, setTzSaved] = useState(false)
  const [reviewLink, setReviewLink] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [reviewSaved, setReviewSaved] = useState(false)
  const [reminderLeadHours, setReminderLeadHours] = useState('48')
  const [reminderSaving, setReminderSaving] = useState(false)
  const [reminderSaved, setReminderSaved] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { org: o, isOwner: owner } = await getOrgForUser(supabase, user!.id)
    setOrg(o)
    setIsOwner(owner)
    setOrgName(o?.name ?? '')
    setTimezone(o?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
    setReviewLink(o?.review_link ?? '')
    setReminderLeadHours(String(o?.reminder_lead_hours ?? 48))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!orgName.trim()) return
    setSaving(true)
    await supabase.from('organizations').update({ name: orgName.trim() }).eq('id', org.id)
    setSaving(false)
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2000)
    await load()
  }

  async function saveReminderSettings() {
    if (!org) return
    setReminderSaving(true)
    await supabase.from('organizations').update({ reminder_lead_hours: parseInt(reminderLeadHours) || 48 }).eq('id', org.id)
    setReminderSaving(false)
    setReminderSaved(true)
    setTimeout(() => setReminderSaved(false), 2000)
  }

  async function saveReviewLink() {
    if (!org) return
    setReviewSaving(true)
    await supabase.from('organizations').update({ review_link: reviewLink.trim() || null }).eq('id', org.id)
    setReviewSaving(false)
    setReviewSaved(true)
    setTimeout(() => setReviewSaved(false), 2000)
  }

  async function saveTimezone() {
    if (!org) return
    setTzSaving(true)
    await supabase.from('organizations').update({ timezone }).eq('id', org.id)
    setTzSaving(false)
    setTzSaved(true)
    setTimeout(() => setTzSaved(false), 2000)
  }

  function cancel() {
    setOrgName(org?.name ?? '')
    setEditing(false)
  }

  function detectTimezone() {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
  }

  const currentTzLabel = TIMEZONE_GROUPS.flatMap(g => g.zones).find(z => z.value === timezone)?.label

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Business Info</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Business Name</CardTitle>
            {isOwner && !editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-gray-400 hover:text-white">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isOwner && editing ? (
            <form onSubmit={save} className="space-y-3">
              <Input value={orgName} onChange={e => setOrgName(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
                <Button type="button" variant="outline" onClick={cancel}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div>
              <p className="text-gray-100 font-medium">{org?.name ?? '—'}</p>
              {saved && <p className="text-sm text-green-400 mt-2">Saved successfully.</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-gray-400" />
            <CardTitle>Time Zone</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-400">Used for scheduling, the team availability calendar, and all time displays across the app.</p>
          {isOwner ? (
            <>
              <select
                className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
              >
                {TIMEZONE_GROUPS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.zones.map(z => (
                      <option key={z.value} value={z.value}>{z.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {timezone && !currentTzLabel && (
                <p className="text-xs text-gray-500">Current: {timezone}</p>
              )}
              <div className="flex gap-2">
                <Button onClick={saveTimezone} disabled={tzSaving}>
                  {tzSaving ? 'Saving...' : 'Save timezone'}
                </Button>
                <Button type="button" variant="outline" onClick={detectTimezone}>
                  Detect from browser
                </Button>
              </div>
              {tzSaved && <p className="text-sm text-green-400">Timezone saved.</p>}
            </>
          ) : (
            <p className="text-gray-100 font-medium">{currentTzLabel ?? timezone ?? '—'}</p>
          )}
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader><CardTitle>Appointment Reminders</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-400">Automatically email clients before their scheduled appointment. Set how far in advance to send the reminder.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Send reminder</label>
              <select
                className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={reminderLeadHours}
                onChange={e => setReminderLeadHours(e.target.value)}
              >
                <option value="24">24 hours before</option>
                <option value="48">48 hours before</option>
                <option value="72">72 hours before (3 days)</option>
                <option value="168">1 week before</option>
              </select>
            </div>
            <div className="flex gap-2 items-center">
              <Button onClick={saveReminderSettings} disabled={reminderSaving}>
                {reminderSaving ? 'Saving...' : 'Save'}
              </Button>
              {reminderSaved && <p className="text-sm text-green-400">Saved.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {isOwner && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <CardTitle>Review Link</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-400">Paste your Google, Yelp, or other review page URL. It will appear as a "Leave a Review" button at the bottom of every client report.</p>
            <Input
              placeholder="https://g.page/r/your-business/review"
              value={reviewLink}
              onChange={e => setReviewLink(e.target.value)}
            />
            <div className="flex gap-2 items-center">
              <Button onClick={saveReviewLink} disabled={reviewSaving}>
                {reviewSaving ? 'Saving...' : 'Save review link'}
              </Button>
              {reviewSaved && <p className="text-sm text-green-400">Saved.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <span className="text-sm text-gray-400">Plan</span>
            <span className="text-sm font-medium text-gray-100 capitalize">{org?.plan ?? 'solo'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-400">Member since</span>
            <span className="text-sm text-gray-100">
              {org?.created_at ? new Date(org.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
