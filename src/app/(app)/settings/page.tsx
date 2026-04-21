'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const [org, setOrg] = useState<any>(null)
  const [orgName, setOrgName] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [newPropName, setNewPropName] = useState('')
  const [newPropAddress, setNewPropAddress] = useState('')
  const [newPropEmail, setNewPropEmail] = useState('')
  const [saved, setSaved] = useState(false)
  const [newPackageName, setNewPackageName] = useState('')
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null)
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({})

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: o } = await supabase.from('organizations').select('*').eq('owner_id', user!.id).single()
    if (!o) return
    setOrg(o)
    setOrgName(o.name ?? '')
    const [{ data: props }, { data: pkgs }] = await Promise.all([
      supabase.from('properties').select('*').eq('org_id', o.id),
      supabase.from('packages').select('*, package_items(*)').eq('org_id', o.id).order('created_at'),
    ])
    setProperties(props ?? [])
    setPackages((pkgs ?? []).map((p: any) => ({
      ...p,
      package_items: [...(p.package_items ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
    })))
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
    setNewPropName(''); setNewPropAddress(''); setNewPropEmail('')
    await load()
  }

  async function deleteProperty(id: string) {
    if (!confirm('Delete this property?')) return
    await supabase.from('properties').delete().eq('id', id)
    await load()
  }

  async function addPackage(e: React.FormEvent) {
    e.preventDefault()
    if (!newPackageName.trim()) return
    const { data } = await supabase.from('packages').insert({ org_id: org.id, name: newPackageName.trim() }).select().single()
    setNewPackageName('')
    if (data) setExpandedPackage(data.id)
    await load()
  }

  async function deletePackage(id: string) {
    if (!confirm('Delete this package and all its checklist items?')) return
    await supabase.from('packages').delete().eq('id', id)
    await load()
  }

  async function addItem(packageId: string) {
    const label = newItemLabel[packageId]?.trim()
    if (!label) return
    const pkg = packages.find(p => p.id === packageId)
    const nextOrder = (pkg?.package_items?.length ?? 0)
    await supabase.from('package_items').insert({ package_id: packageId, label, sort_order: nextOrder })
    setNewItemLabel(prev => ({ ...prev, [packageId]: '' }))
    await load()
  }

  async function deleteItem(id: string) {
    await supabase.from('package_items').delete().eq('id', id)
    await load()
  }

  async function moveItem(packageId: string, itemId: string, direction: 'up' | 'down') {
    const pkg = packages.find(p => p.id === packageId)
    if (!pkg) return
    const items = [...pkg.package_items]
    const idx = items.findIndex((i: any) => i.id === itemId)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return
    await Promise.all([
      supabase.from('package_items').update({ sort_order: items[swapIdx].sort_order }).eq('id', items[idx].id),
      supabase.from('package_items').update({ sort_order: items[idx].sort_order }).eq('id', items[swapIdx].id),
    ])
    await load()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Business Info */}
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

      {/* Checklist Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist Packages</CardTitle>
          <p className="text-sm text-gray-400 mt-1">Define the services included in each type of clean. Select a package when starting an inspection.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addPackage} className="flex gap-3">
            <Input
              placeholder="Package name (e.g. Standard Clean, Deep Clean)"
              value={newPackageName}
              onChange={e => setNewPackageName(e.target.value)}
            />
            <Button type="submit"><Plus className="mr-2 h-4 w-4" />Add</Button>
          </form>

          <div className="space-y-3">
            {packages.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No packages yet. Create one above to get started.</p>
            )}
            {packages.map(pkg => (
              <div key={pkg.id} className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
                {/* Package header */}
                <div className="flex items-center justify-between px-4 py-3">
                  <button
                    className="flex items-center gap-2 text-left flex-1"
                    onClick={() => setExpandedPackage(expandedPackage === pkg.id ? null : pkg.id)}
                  >
                    <span className="font-medium text-gray-100">{pkg.name}</span>
                    <span className="text-xs text-gray-500">{pkg.package_items?.length ?? 0} items</span>
                    {expandedPackage === pkg.id
                      ? <ChevronUp className="h-4 w-4 text-gray-400 ml-auto" />
                      : <ChevronDown className="h-4 w-4 text-gray-400 ml-auto" />}
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => deletePackage(pkg.id)} className="text-gray-500 hover:text-red-400 ml-2 flex-shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Package items */}
                {expandedPackage === pkg.id && (
                  <div className="border-t border-white/10 px-4 py-3 space-y-3">
                    <ul className="space-y-1">
                      {pkg.package_items?.length === 0 && (
                        <li className="text-sm text-gray-500 py-2">No items yet. Add checklist items below.</li>
                      )}
                      {pkg.package_items?.map((item: any, idx: number) => (
                        <li key={item.id} className="flex items-center gap-2 group">
                          <GripVertical className="h-4 w-4 text-gray-600 flex-shrink-0" />
                          <span className="flex-1 text-sm text-gray-200">{item.label}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => moveItem(pkg.id, item.id, 'up')} disabled={idx === 0} className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-20">
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => moveItem(pkg.id, item.id, 'down')} disabled={idx === pkg.package_items.length - 1} className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-20">
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => deleteItem(item.id)} className="p-1 text-gray-500 hover:text-red-400">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="Add checklist item..."
                        value={newItemLabel[pkg.id] ?? ''}
                        onChange={e => setNewItemLabel(prev => ({ ...prev, [pkg.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(pkg.id) } }}
                        className="text-sm"
                      />
                      <Button size="sm" onClick={() => addItem(pkg.id)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Properties */}
      <Card>
        <CardHeader><CardTitle>Properties / Client Locations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={addProperty} className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium text-gray-300">Add Property</p>
            <Input placeholder="Property name (e.g. 123 Oak St)" value={newPropName} onChange={e => setNewPropName(e.target.value)} />
            <Input placeholder="Address (optional)" value={newPropAddress} onChange={e => setNewPropAddress(e.target.value)} />
            <Input type="email" placeholder="Client email for reports (optional)" value={newPropEmail} onChange={e => setNewPropEmail(e.target.value)} />
            <Button type="submit"><Plus className="mr-2 h-4 w-4" /> Add Property</Button>
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
