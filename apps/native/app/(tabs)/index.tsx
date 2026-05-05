import { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
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

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  done: 'Done',
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  done: '#22c55e',
}

export default function JobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { org } = await getOrgForUser(user.id, user.email)
      if (!org) { setError('No organization found for your account.'); return }

      const { data, error: queryError } = await supabase
        .from('jobs')
        .select('id, status, scheduled_at, properties(name, address), teams(name)')
        .eq('org_id', org.id)
        .in('status', showCompleted ? ['done'] : ['scheduled', 'in_progress'])
        .order('scheduled_at', { ascending: !showCompleted })

      if (queryError) setError(queryError.message)
      setJobs((data as any) ?? [])
    } finally {
      setLoading(false)
    }
  }, [showCompleted])

  // Reload whenever this tab comes into focus so status changes from job detail are reflected
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
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '700' }}>Jobs</Text>
          <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{showCompleted ? 'Completed jobs' : 'Active and scheduled'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowCompleted(v => !v)}
          style={{ backgroundColor: showCompleted ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: showCompleted ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
        >
          <Text style={{ color: showCompleted ? '#22c55e' : '#9ca3af', fontSize: 13, fontWeight: '600' }}>
            {showCompleted ? 'Active' : 'Completed'}
          </Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: 'rgba(127,29,29,0.4)', borderWidth: 1, borderColor: '#b91c1c', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ color: '#fca5a5', fontSize: 13 }}>{error}</Text>
        </View>
      )}

      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563eb" />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 64 }}>
            <Ionicons name="briefcase-outline" size={48} color="#374151" />
            <Text style={{ color: '#6b7280', fontSize: 15, marginTop: 16 }}>No active jobs</Text>
            <Text style={{ color: '#4b5563', fontSize: 13, marginTop: 4 }}>Schedule a job on the web dashboard</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{ backgroundColor: '#1a1d27', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16 }}
            onPress={() => router.push(`/job/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15, flex: 1, marginRight: 8 }} numberOfLines={1}>
                {(item.properties as any)?.name || 'Job'}
              </Text>
              <Text style={{ color: STATUS_COLOR[item.status] ?? '#6b7280', fontSize: 11, fontWeight: '600' }}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
            {(item.properties as any)?.address && (
              <Text style={{ color: '#6b7280', fontSize: 13 }} numberOfLines={1}>{(item.properties as any).address}</Text>
            )}
            {item.teams && (
              <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 2 }}>{(item.teams as any).name}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
              <Ionicons name="calendar-outline" size={12} color="#4b5563" />
              <Text style={{ color: '#4b5563', fontSize: 12 }}>
                {new Date(item.scheduled_at).toLocaleDateString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}
