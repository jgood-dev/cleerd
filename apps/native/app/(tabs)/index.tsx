import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

type Job = {
  id: string
  title: string
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
  scheduled: 'text-blue-400',
  in_progress: 'text-amber-400',
  done: 'text-green-400',
}

export default function JobsScreen() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const { data } = await supabase
      .from('jobs')
      .select('id, title, status, scheduled_at, properties(name, address), teams(name)')
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_at', { ascending: true })
    setJobs((data as any) ?? [])
    setLoading(false)
  }

  async function refresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0f1117] items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0f1117]">
      <View className="px-5 pt-4 pb-2">
        <Text className="text-white text-2xl font-bold">Jobs</Text>
        <Text className="text-gray-400 text-sm mt-0.5">Active and scheduled</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#2563eb" />}
        ListEmptyComponent={
          <View className="items-center py-16">
            <Text className="text-gray-500 text-base">No active jobs</Text>
            <Text className="text-gray-600 text-sm mt-1">Schedule a job on the web dashboard</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-surface rounded-xl border border-white/10 p-4"
            onPress={() => router.push(`/job/${item.id}`)}
            activeOpacity={0.7}
          >
            <View className="flex-row items-start justify-between mb-1">
              <Text className="text-white font-semibold text-base flex-1 mr-2" numberOfLines={1}>
                {item.title || item.properties?.name || 'Job'}
              </Text>
              <Text className={`text-xs font-medium ${STATUS_COLOR[item.status] ?? 'text-gray-400'}`}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
            {item.properties?.address && (
              <Text className="text-gray-400 text-sm" numberOfLines={1}>{item.properties.address}</Text>
            )}
            <Text className="text-gray-500 text-xs mt-2">
              {new Date(item.scheduled_at).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  )
}
