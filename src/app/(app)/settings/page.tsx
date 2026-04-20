'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2 } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const [org, setOrg] = useState<any>(null)
  const [orgName, setOrgName] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [newPropName, setNewPropName] = useState('')
  const [newPropAddress, setNewPropAddress] = useState('')
  const [newPropEmail, setNewPropEmail] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: o } = await supabase.from('organizations').select('*').eq('owner_id', user!.id).single()
    setOrg(o)
    setOrgName(o?.name ?? '')
    const { data: props } = await supabase.from('properties').select('*').eq('org_id', o?.id)
    setProperties(props ?? [])
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('organizations').update({ name: orgName }).eq('id', org.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addProperty(e: React.FormEvent) {
    e.preventDefault()
    if (!newPropName.trim()) return
    await supabase.from('properties').insert({
      org_id: org.id,
      name: newPropName.trim(),
      address: newPropAddress.trim() || null,
      client_email: newPropEmail.trim() || null,
    })
    setNewPropName('')
    setNewPropAddress('')
    setNewPropEmail('')
    await load()
  }

  async function deleteProperty(id: string) {
    if (!confirm('Delete this property?')) return
    await supabase.from('properties').delete().eq('id', id)
    await load()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Business Info</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={saveOrg} className="flex gap-3">
            <Input value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Business name" />
            <Button type="submit">{saved ? 'Saved!' : 'Save'}</Button>
          </form>
          <p className="mt-3 text-sm text-gray-400">Plan: <span className="font-medium capitalize text-gray-200">{org?.plan ?? 'solo'}</span></p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Properties / Client Locations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addProperty} className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-gray-300">Add Property</p>
            <Input placeholder="Property name (e.g. 123 Oak St)" value={newPropName} onChange={e => setNewPropName(e.target.value)} />
            <Input placeholder="Address (optional)" value={newPropAddress} onChange={e => setNewPropAddress(e.target.value)} />
            <Input type="email" placeholder="Client email for reports (optional)" value={newPropEmail} onChange={e => setNewPropEmail(e.target.value)} />
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" /> Add Property
            </Button>
          </form>
          <div className="divide-y divide-white/5">
            {properties.map(p => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-100">{p.name}</p>
                  <p className="text-sm text-gray-400">{p.address ?? 'No address'} · {p.client_email ?? 'No client email'}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteProperty(p.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
