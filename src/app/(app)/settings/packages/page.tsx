'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

export default function PackagesPage() {
  const supabase = createClient()
  const [orgId, setOrgId] = useState('')
  const [packages, setPackages] = useState<any[]>([])
  const [newPackageName, setNewPackageName] = useState('')
  const [copyFromId, setCopyFromId] = useState('')
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null)
  const [newItemLabel, setNewItemLabel] = useState<Record<string, string>>({})
  const [dialog, setDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)
  const [durationDraft, setDurationDraft] = useState<Record<string, { base: string; small: string; large: string; xl: string }>>({})
  const [durationSaving, setDurationSaving] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user!.id).single()
    if (!org) return
    setOrgId(org.id)
    const { data: pkgs } = await supabase.from('packages').select('*, package_items(*)').eq('org_id', org.id).order('created_at')
    setPackages((pkgs ?? []).map((p: any) => ({
      ...p,
      package_items: [...(p.package_items ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
    })))
  }

  async function addPackage(e: React.FormEvent) {
    e.preventDefault()
    if (!newPackageName.trim()) return
    const { data } = await supabase.from('packages').insert({ org_id: orgId, name: newPackageName.trim() }).select().single()
    if (data && copyFromId) {
      const source = packages.find(p => p.id === copyFromId)
      if (source?.package_items?.length) {
        await supabase.from('package_items').insert(
          source.package_items.map((item: any) => ({
            package_id: data.id,
            label: item.label,
            sort_order: item.sort_order,
          }))
        )
      }
    }
    setNewPackageName('')
    setCopyFromId('')
    if (data) setExpandedPackage(data.id)
    await load()
  }

  function deletePackage(id: string) {
    setDialog({
      title: 'Delete package?',
      message: 'This package and all its checklist items will be permanently deleted.',
      onConfirm: async () => {
        await supabase.from('packages').delete().eq('id', id)
        setDialog(null)
        await load()
      },
    })
  }

  async function addItem(packageId: string) {
    const label = newItemLabel[packageId]?.trim()
    if (!label) return
    const pkg = packages.find(p => p.id === packageId)
    const nextOrder = pkg?.package_items?.length ?? 0
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

  async function renamePackage(id: string, name: string) {
    await supabase.from('packages').update({ name }).eq('id', id)
    await load()
  }

  function openDuration(pkg: any) {
    const m = pkg.size_multipliers ?? {}
    setDurationDraft(prev => ({
      ...prev,
      [pkg.id]: {
        base: pkg.base_duration_minutes != null ? String(Math.round(pkg.base_duration_minutes / 60 * 10) / 10) : '2',
        small: String(m.small ?? 0.75),
        large: String(m.large ?? 1.5),
        xl: String(m.xl ?? 2.0),
      },
    }))
  }

  async function saveDuration(pkgId: string) {
    const d = durationDraft[pkgId]
    if (!d) return
    setDurationSaving(pkgId)
    const base = Math.round(parseFloat(d.base) * 60)
    await supabase.from('packages').update({
      base_duration_minutes: isNaN(base) ? null : base,
      size_multipliers: {
        small: parseFloat(d.small) || 0.75,
        medium: 1.0,
        large: parseFloat(d.large) || 1.5,
        xl: parseFloat(d.xl) || 2.0,
      },
    }).eq('id', pkgId)
    setDurationSaving(null)
    await load()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/settings" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Packages</h1>
          <p className="text-sm text-gray-400 mt-0.5">Define checklist templates for each type of clean.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Create Package</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={addPackage} className="space-y-3">
            <Input
              placeholder="e.g. Standard Clean, Deep Clean, Move-Out"
              value={newPackageName}
              onChange={e => setNewPackageName(e.target.value)}
            />
            {packages.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-400">Start from existing package <span className="text-gray-600">(optional)</span></label>
                <select
                  className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={copyFromId}
                  onChange={e => setCopyFromId(e.target.value)}
                >
                  <option value="">Start blank</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>Copy from: {p.name} ({p.package_items?.length ?? 0} items)</option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit"><Plus className="mr-2 h-4 w-4" />Create Package</Button>
          </form>
        </CardContent>
      </Card>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <p>No packages yet. Create your first one above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="rounded-xl border border-white/10 bg-[#161b27] overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                  onClick={() => {
                    const next = expandedPackage === pkg.id ? null : pkg.id
                    setExpandedPackage(next)
                    if (next) openDuration(pkg)
                  }}
                >
                  <span className="font-medium text-gray-100 truncate">{pkg.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{pkg.package_items?.length ?? 0} items</span>
                  {expandedPackage === pkg.id
                    ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                </button>
                <Button variant="ghost" size="icon" onClick={() => deletePackage(pkg.id)} className="text-gray-500 hover:text-red-400 flex-shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Items */}
              {expandedPackage === pkg.id && (
                <div className="border-t border-white/10 px-4 py-4 space-y-4 bg-[#1e2433]">
                  {pkg.package_items?.length === 0 && (
                    <p className="text-sm text-gray-500">No items yet. Add checklist items below.</p>
                  )}
                  <ul className="space-y-1">
                    {pkg.package_items?.map((item: any, idx: number) => (
                      <li key={item.id} className="flex items-center gap-2 group rounded-lg px-1 py-1.5 hover:bg-white/5">
                        <GripVertical className="h-4 w-4 text-gray-600 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-200">{item.label}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => moveItem(pkg.id, item.id, 'up')} disabled={idx === 0}
                            className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-20">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => moveItem(pkg.id, item.id, 'down')} disabled={idx === pkg.package_items.length - 1}
                            className="p-1 text-gray-500 hover:text-gray-200 disabled:opacity-20">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="p-1 text-gray-500 hover:text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
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

                  {/* Duration settings */}
                  <div className="pt-2 border-t border-white/10 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Job Duration</p>
                    <div>
                      <label className="mb-1 block text-xs text-gray-400">Base duration — Medium home <span className="text-gray-600">(hours)</span></label>
                      <Input
                        type="number" min="0.5" max="24" step="0.5" className="text-sm w-32"
                        placeholder="2"
                        value={durationDraft[pkg.id]?.base ?? ''}
                        onChange={e => setDurationDraft(prev => ({ ...prev, [pkg.id]: { ...prev[pkg.id], base: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs text-gray-400">Size multipliers <span className="text-gray-600">(relative to medium = 1.0×)</span></label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { key: 'small', label: 'Small' },
                          { key: 'medium', label: 'Medium' },
                          { key: 'large', label: 'Large' },
                          { key: 'xl', label: 'XL' },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="mb-1 block text-[11px] text-gray-500">{label}</label>
                            <Input
                              type="number" min="0.1" max="5" step="0.05" className="text-sm"
                              placeholder={key === 'small' ? '0.75' : key === 'medium' ? '1.0' : key === 'large' ? '1.5' : '2.0'}
                              disabled={key === 'medium'}
                              value={key === 'medium' ? '1.0' : (durationDraft[pkg.id] as any)?.[key] ?? ''}
                              onChange={e => setDurationDraft(prev => ({ ...prev, [pkg.id]: { ...prev[pkg.id], [key]: e.target.value } }))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => saveDuration(pkg.id)} disabled={durationSaving === pkg.id}>
                      {durationSaving === pkg.id ? 'Saving…' : 'Save Duration Settings'}
                    </Button>
                  </div>
                </div>
              )}
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
