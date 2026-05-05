import { useCallback, useState } from 'react'
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, ActionSheetIOS, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { supabase } from '@/lib/supabase'
import { getOrgForUser } from '@/lib/get-org'

type Job = { id: string; status: string; scheduled_at: string; properties: { name: string; address: string } | null; inspections: { id: string }[] }
type PhotoType = 'before' | 'after' | 'issue'

function pickPhotoType(): Promise<PhotoType | null> {
  return new Promise(resolve => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title: 'Photo type', options: ['Cancel', 'Before', 'After', 'Issue'], cancelButtonIndex: 0 },
        i => { if (i === 0) resolve(null); else if (i === 1) resolve('before'); else if (i === 2) resolve('after'); else resolve('issue') }
      )
    } else {
      Alert.alert('Photo type', '', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Before', onPress: () => resolve('before') },
        { text: 'After', onPress: () => resolve('after') },
        { text: 'Issue', onPress: () => resolve('issue') },
      ])
    }
  })
}

export default function QuickCameraTab() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const router = useRouter()

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { org } = await getOrgForUser(user.id, user.email)
      if (!org) return
      const { data } = await supabase
        .from('jobs')
        .select('id, status, scheduled_at, properties(name, address), inspections(id)')
        .eq('org_id', org.id)
        .eq('status', 'in_progress')
        .order('scheduled_at', { ascending: true })
      setJobs((data as any) ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function quickPhoto(job: Job) {
    const inspectionId = job.inspections?.[0]?.id
    if (!inspectionId) {
      Alert.alert('Not started', 'Open this job and tap "Start Job" first.')
      return
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access is required to take photos.')

    const photoType = await pickPhotoType()
    if (!photoType) return

    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 })
    if (result.canceled) return

    setUploading(job.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const uri = result.assets[0].uri
      const fileName = `${inspectionId}/${Date.now()}.jpg`
      const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/inspection-photos/${fileName}`

      const res = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: 'POST',
        uploadType: 1,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          'Content-Type': 'image/jpeg',
          'x-upsert': 'false',
        },
      })
      if (res.status !== 200 && res.status !== 201) throw new Error(`Storage ${res.status}: ${res.body}`)

      const { error: dbError } = await supabase.from('inspection_photos').insert({
        inspection_id: inspectionId,
        storage_path: fileName,
        photo_type: photoType,
      })
      if (dbError) throw new Error(dbError.message)

      Alert.alert('Uploaded', `${photoType.charAt(0).toUpperCase() + photoType.slice(1)} photo added to ${(job.properties as any)?.name ?? 'job'}.`)
    } catch (err: any) {
      Alert.alert('Upload failed', err.message)
    } finally {
      setUploading(null)
    }
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
        <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '700' }}>Quick Capture</Text>
        <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>Take a photo for an active job</Text>
      </View>

      <FlatList
        data={jobs}
        keyExtractor={j => j.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 64 }}>
            <Ionicons name="camera-outline" size={48} color="#374151" />
            <Text style={{ color: '#6b7280', fontSize: 15, marginTop: 16 }}>No jobs in progress</Text>
            <Text style={{ color: '#4b5563', fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              Start a job first, then come here to quickly add photos.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#1a1d27', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                {(item.properties as any)?.name ?? 'Job'}
              </Text>
              {(item.properties as any)?.address && (
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                  {(item.properties as any).address}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={() => router.push(`/job/${item.id}`)}
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 10 }}
              >
                <Ionicons name="open-outline" size={18} color="#6b7280" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => quickPhoto(item)}
                disabled={uploading === item.id}
                style={{ backgroundColor: '#2563eb', borderRadius: 8, padding: 10 }}
              >
                {uploading === item.id
                  ? <ActivityIndicator size="small" color="white" />
                  : <Ionicons name="camera" size={18} color="white" />
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  )
}
