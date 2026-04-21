'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ArrowLeft, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function PropertiesPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [newAddress, setNewAddress] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user!.id).single()
    if (!org) return
    setOrgId(org.id)
    const { data } = await supabase.from('properties').select('*').eq('org_id', org.id).order('created_at')
    setProperties(data ?? [])
  }

  async function addProperty(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    await supabase.from('properties').insert({
      org_id: orgId,
      name: newName.trim(),
      address: newAddress.trim() || null,
      client_email: newEmail.trim() || null,
    })
    setNewName(''); setNewAddress(''); setNewEmail(''); setAdding(false)
    await load()
  }

  async function deleteProperty(id: string) {
    if (!confirm('Delete this property? This cannot be undone.')) return
    await supabase.from('properties').delete().eq('id', id)
    await load()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Properties</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage client locations and report delivery emails.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setAdding(true)} className={adding ? 'hidden' : ''}>
          <Plus className="mr-2 h-4 w-4" /> Add Property
        </Button>
      </div>

      {adding && (
        <Card>
          <CardHeader><CardTitle>New Property</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={addProperty} className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Property name <span className="text-red-400">*</span></label>
                <Input placeholder="e.g. 123 Oak St or Johnson Residence" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Address <span className="text-gray-500">(optional)</span></label>
                <Input placeholder="123 Oak St, Springfield, IL" value={newAddress} onChange={e => setNewAddress(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Client email <span className="text-gray-500">(optional — for report delivery)</span></label>
                <Input type="email" placeholder="client@example.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="submit">Save Property</Button>
                <Button type="button" variant="outline" onClick={() => { setAdding(false); setNewName(''); setNewAddress(''); setNewEmail('') }}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {properties.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No properties yet.</p>
            <p className="text-sm text-gray-500 mt-1">Add your first client location to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {properties.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#161b27] px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-100">{p.name}</p>
                <p className="text-sm text-gray-400 mt-0.5 truncate">
                  {[p.address, p.client_email].filter(Boolean).join(' · ') || 'No address or email'}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteProperty(p.id)} className="text-gray-500 hover:text-red-400 flex-shrink-0 ml-4">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
