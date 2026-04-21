'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

export default function NewInspectionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [orgId, setOrgId] = useState('')
  const [properties, setProperties] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [packages, setPackages] = useState<any[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [newProperty, setNewProperty] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState('custom')
  const [customItems, setCustomItems] = useState<string[]>([])
  const [newCustomItem, setNewCustomItem] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user!.id).single()
      if (!org) return
      setOrgId(org.id)
      const [{ data: props }, { data: tms }, { data: pkgs }] = await Promise.all([
        supabase.from('properties').select('*').eq('org_id', org.id),
        supabase.from('teams').select('*').eq('org_id', org.id),
        supabase.from('packages').select('*, package_items(*)').eq('org_id', org.id).order('created_at'),
      ])
      setProperties(props ?? [])
      setTeams(tms ?? [])
      const sortedPkgs = (pkgs ?? []).map((p: any) => ({
        ...p,
        package_items: [...(p.package_items ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
      }))
      setPackages(sortedPkgs)
      // Default to first package if available
      if (sortedPkgs.length > 0) {
        setSelectedPackageId(sortedPkgs[0].id)
        setCustomItems(sortedPkgs[0].package_items.map((i: any) => i.label))
      }
    }
    load()
  }, [])

  function handlePackageChange(pkgId: string) {
    setSelectedPackageId(pkgId)
    if (pkgId === 'custom') {
      setCustomItems([])
    } else {
      const pkg = packages.find(p => p.id === pkgId)
      setCustomItems(pkg?.package_items.map((i: any) => i.label) ?? [])
    }
  }

  function addCustomItem() {
    if (!newCustomItem.trim()) return
    setCustomItems(prev => [...prev, newCustomItem.trim()])
    setNewCustomItem('')
  }

  function removeCustomItem(idx: number) {
    setCustomItems(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (customItems.length === 0) return
    setLoading(true)

    let finalPropertyId = (propertyId === '__new' || !propertyId) ? '' : propertyId
    if (!finalPropertyId && newProperty.trim()) {
      const { data: prop } = await supabase.from('properties')
        .insert({ org_id: orgId, name: newProperty.trim() })
        .select().single()
      finalPropertyId = prop?.id ?? ''
    }

    const { data: inspection } = await supabase.from('inspections').insert({
      org_id: orgId,
      property_id: finalPropertyId || null,
      team_id: teamId || null,
      notes,
      status: 'in_progress',
    }).select().single()

    if (inspection) {
      await supabase.from('checklist_items').insert(
        customItems.map(label => ({ inspection_id: inspection.id, label, completed: false }))
      )
      router.push(`/inspections/${inspection.id}`)
    } else {
      setLoading(false)
    }
  }

  const isCustomMode = selectedPackageId === 'custom' || packages.length > 0

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-white">New Inspection</h1>
      <form onSubmit={handleCreate} className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Inspection Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Property */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Property</label>
              {properties.length > 0 ? (
                <>
                  <select
                    className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={propertyId}
                    onChange={e => setPropertyId(e.target.value)}
                  >
                    <option value="">Select a property</option>
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="__new">+ Add new property</option>
                  </select>
                  {propertyId === '__new' && (
                    <Input className="mt-2" placeholder="New property name" value={newProperty}
                      onChange={e => setNewProperty(e.target.value)} />
                  )}
                </>
              ) : (
                <Input placeholder="123 Main St or Client Name" value={newProperty} onChange={e => setNewProperty(e.target.value)} />
              )}
            </div>

            {/* Team */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Team (optional)</label>
              <select
                className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
              >
                <option value="">No team assigned</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">Notes (optional)</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special instructions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Checklist</CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              {packages.length > 0 ? 'Select a package or build a custom list.' : 'Add the services to inspect for this job.'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Package selector */}
            {packages.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">Starting from</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedPackageId}
                  onChange={e => handlePackageChange(e.target.value)}
                >
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.package_items?.length ?? 0} items)</option>)}
                  <option value="custom">Custom (start from scratch)</option>
                </select>
                {selectedPackageId !== 'custom' && (
                  <p className="mt-1.5 text-xs text-gray-500">Items loaded from package — you can add or remove below before starting.</p>
                )}
              </div>
            )}

            {/* Current items */}
            {customItems.length > 0 && (
              <ul className="space-y-1.5">
                {customItems.map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2 group rounded-lg px-2 py-1.5 hover:bg-white/5">
                    <span className="flex-1 text-sm text-gray-200">{item}</span>
                    <button type="button" onClick={() => removeCustomItem(idx)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity p-0.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* Add item */}
            <div className="flex gap-2">
              <Input
                placeholder="Add a checklist item..."
                value={newCustomItem}
                onChange={e => setNewCustomItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomItem() } }}
                className="text-sm"
              />
              <Button type="button" size="sm" variant="outline" onClick={addCustomItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {customItems.length === 0 && (
              <p className="text-sm text-red-400">Add at least one checklist item to continue.</p>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={loading || customItems.length === 0}>
          {loading ? 'Creating...' : `Start Inspection (${customItems.length} items)`}
        </Button>
      </form>
    </div>
  )
}
