'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Pencil } from 'lucide-react'
import Link from 'next/link'

export default function BusinessSettingsPage() {
  const supabase = createClient()
  const [org, setOrg] = useState<any>(null)
  const [orgName, setOrgName] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: o } = await supabase.from('organizations').select('*').eq('owner_id', user!.id).single()
    setOrg(o)
    setOrgName(o?.name ?? '')
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

  function cancel() {
    setOrgName(org?.name ?? '')
    setEditing(false)
  }

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
            {!editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-gray-400 hover:text-white">
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editing ? (
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
