import { useCallback, useState } from 'react'
import { View, Text, SectionList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { getOrgForUser } from '@/lib/get-org'

type Job = {
  id: string
  status: string
  scheduled_at: string
  properties: { name: string; address: string } | null
  teams: { name: string } | null
}

type Section = { title: string; data: Job[] }

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  done: '#22c55e',
}

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  done: 'Done',
}

function groupByDate(jobs: Job[]): Section[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  const groups: Record<string, Job[]> = {}

  for (const job of jobs) {
    const d = new Date(job.scheduled_at)
    d.setHours(0, 0, 0, 0)
    let key: string
    if (d.getTime() === today.getTime()) {
      key = 'Today'
    } else if (d.getTime() === tomorrow.getTime()) {
      key = 'Tomorrow'
    } else if (d < nextWeek) {
      key = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    } else {
      key = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (!groups[key]) groups[key] = []
    groups[key].push(job)
  }

  return Object.entries(groups).map(([title, data]) => ({ title, data }))
}

export default function ScheduleScreen() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { org } = await getOrgForUser(user.id, user.email)
      if (!org) return
      const { data } = await supabase
        .from('jobs')
        .select('id, status, scheduled_at, properties(name, address), teams(name)')
        .eq('org_id', org.id)
        .neq('status', 'done')
        .order('scheduled_at', { ascending: true })
      setSections(groupByDate((data as any) ?? []))
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2563eb" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '700' }}>Schedule</Text>
        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Upcoming jobs</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={j => j.id}
        contentContainerStyle={{ padding: 20, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563eb" />}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 64 }}>
            <Ionicons name="calendar-outline" size={48} color="#374151" />
            <Text style={{ color: '#6b7280', fontSize: 15, marginTop: 16 }}>No upcoming jobs</Text>
            <Text style={{ color: '#4b5563', fontSize: 13, marginTop: 4 }}>Schedule jobs on the web dashboard</Text>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={{ color: '#9ca3af', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/job/${item.id}`)}
            activeOpacity={0.7}
            style={{
              backgroundColor: '#1a1d27',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              padding: 14,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View style={{ width: 3, height: 48, borderRadius: 2, backgroundColor: STATUS_COLOR[item.status] ?? '#6b7280' }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                {(item.properties as any)?.name || 'Job'}
              </Text>
              {(item.properties as any)?.address && (
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                  {(item.properties as any).address}
                </Text>
              )}
              <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 4 }}>
                {new Date(item.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                {(item.teams as any)?.name ? `  ·  ${(item.teams as any).name}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ color: STATUS_COLOR[item.status] ?? '#6b7280', fontSize: 11, fontWeight: '600' }}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#374151" />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}
