'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DEFAULT_CHECKLIST = [
  'Floors vacuumed/mopped',
  'Surfaces wiped down',
  'Bathrooms cleaned and sanitized',
  'Kitchen cleaned',
  'Trash emptied',
  'Windows/mirrors cleaned',
  'Baseboards dusted',
  'Appliances wiped',
]

export default function NewInspectionPage() {
  const router = useRouter()
  const supabase = createClient()

  const [orgId, setOrgId] = useState<string>('')
  const [properties, setProperties] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [propertyId, setPropertyId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [newProperty, setNewProperty] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: org } = await supabase.from('organizations').select('id').eq('owner_id', user!.id).single()
      if (!org) return
      setOrgId(org.id)
      const [{ data: props }, { data: tms }] = await Promise.all([
        supabase.from('properties').select('*').eq('org_id', org.id),
        supabase.from('teams').select('*').eq('org_id', org.id),
      ])
      setProperties(props ?? [])
      setTeams(tms ?? [])
    }
    load()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    let finalPropertyId = propertyId

    // Create property on the fly if user typed one
    if (!propertyId && newProperty) {
      const { data: prop } = await supabase
        .from('properties')
        .insert({ org_id: orgId, name: newProperty })
        .select()
        .single()
      finalPropertyId = prop?.id ?? ''
    }

    const { data: inspection } = await supabase
      .from('inspections')
      .insert({
        org_id: orgId,
        property_id: finalPropertyId || null,
        team_id: teamId || null,
        notes,
        status: 'in_progress',
      })
      .select()
      .single()

    if (inspection) {
      // Insert default checklist items
      await supabase.from('checklist_items').insert(
        DEFAULT_CHECKLIST.map(label => ({ inspection_id: inspection.id, label, completed: false }))
      )
      router.push(`/inspections/${inspection.id}`)
    } else {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Inspection</h1>
      <Card>
        <CardHeader>
          <CardTitle>Inspection Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Property</label>
              {properties.length > 0 ? (
                <select
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={propertyId}
                  onChange={e => setPropertyId(e.target.value)}
                >
                  <option value="">Select a property</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                  <option value="__new">+ Add new property</option>
                </select>
              ) : (
                <Input
                  placeholder="123 Main St or Client Name"
                  value={newProperty}
                  onChange={e => setNewProperty(e.target.value)}
                />
              )}
              {propertyId === '__new' && (
                <Input
                  className="mt-2"
                  placeholder="New property name"
                  value={newProperty}
                  onChange={e => { setNewProperty(e.target.value); setPropertyId('') }}
                />
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Team (optional)</label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
              >
                <option value="">No team assigned</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes (optional)</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any special instructions or notes..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Start Inspection'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
