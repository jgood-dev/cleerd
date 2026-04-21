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

export default function PropertiesPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newOwnerName, setNewOwnerName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const addressRef = useRef<HTMLInputElement>(null)

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
    setError('')
    const address = addressRef.current?.value?.trim() ?? ''
    if (!address) { setError('Address is required.'); return }
    if (!newOwnerName.trim()) { setError('Owner name is required.'); return }
    if (!newPhone.trim()) { setError('Phone number is required.'); return }
    if (!newEmail.trim()) { setError('Client email is required.'); return }
    await supabase.from('properties').insert({
      org_id: orgId,
      name: address,
      address,
      owner_name: newOwnerName.trim(),
      phone: newPhone.trim(),
      client_email: newEmail.trim(),
    })
    if (addressRef.current) addressRef.current.value = ''
    setNewEmail(''); setNewOwnerName(''); setNewPhone(''); setAdding(false)
    await load()
  }

  function deleteProperty(id: string) {
    setDialog({
      title: 'Delete property?',
      message: 'This property will be permanently removed. Past inspections will remain.',
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
          <h1 className="text-2xl font-bold text-white">Properties</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage client locations and report delivery emails.</p>
        </div>
      </div>

      <div className="flex justify-end">
        {!adding && (
          <Button onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Property
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardHeader><CardTitle>New Property</CardTitle></CardHeader>
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
                  Owner name <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="Jane Smith"
                  value={newOwnerName}
                  onChange={e => setNewOwnerName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Phone number <span className="text-red-400">*</span>
                </label>
                <Input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Client email <span className="text-red-400">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit">Save Property</Button>
                <Button type="button" variant="outline" onClick={() => {
                  setAdding(false)
                  if (addressRef.current) addressRef.current.value = ''
                  setNewEmail(''); setNewOwnerName(''); setNewPhone(''); setError('')
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
            <p className="text-gray-400">No properties yet.</p>
            <p className="text-sm text-gray-500 mt-1">Add your first client location to get started.</p>
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
                <p className="text-sm text-gray-500 mt-0.5">{p.client_email ?? <span className="text-yellow-400">No email — reports cannot be sent</span>}</p>
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
