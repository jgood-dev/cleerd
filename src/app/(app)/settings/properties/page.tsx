'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ArrowLeft, MapPin } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { AddressAutocomplete } from '@/components/ui/address-autocomplete'
import { PhoneInput } from '@/components/ui/phone-input'
import { getOrgForUser } from '@/lib/get-org'

export default function PropertiesPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newContactName, setNewContactName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newSize, setNewSize] = useState('medium')
  const [newEntryNotes, setNewEntryNotes] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const addressRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { org } = await getOrgForUser(supabase, user!.id)
    if (!org) return
    setOrgId(org.id)
    const { data } = await supabase.from('properties').select('*').eq('org_id', org.id).order('created_at')
    setProperties(data ?? [])
  }

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Client Locations</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage customers, service sites, contacts, and access notes.</p>
        </div>
      </div>

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

      {properties.length === 0 && !adding ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-gray-600" />
            <p className="text-gray-400">No client locations yet.</p>
            <p className="text-sm text-gray-500 mt-1">Add one customer or service site to unlock scheduling and client updates.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {properties.map(p => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#161b27] px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-100">{p.address ?? p.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  {p.owner_name && <span>{p.owner_name}</span>}
                  {p.owner_name && p.phone && <span className="mx-1.5 text-gray-600">·</span>}
                  {p.phone && <span>{p.phone}</span>}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {p.size && <span className="capitalize mr-2">{p.size}</span>}
                  {p.client_email ?? <span className="text-yellow-400">No email — client updates cannot be sent</span>}
                </p>
                {p.entry_notes && (
                  <p className="text-xs text-amber-400 mt-1">Access notes: {p.entry_notes}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteProperty(p.id)} className="text-gray-500 hover:text-red-400 flex-shrink-0 ml-4">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
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
