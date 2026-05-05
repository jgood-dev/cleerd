import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image, Linking, ActionSheetIOS, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

type ChecklistItem = { id: string; label: string; completed: boolean }
type Photo = { id: string; storage_path: string; photo_type: string }
type PhotoType = 'before' | 'after' | 'issue'

const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: 'Before',
  after: 'After',
  issue: 'Issue',
}

const PHOTO_TYPE_COLORS: Record<PhotoType, string> = {
  before: '#3b82f6',
  after: '#22c55e',
  issue: '#ef4444',
}

function pickPhotoType(): Promise<PhotoType | null> {
  return new Promise(resolve => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Photo type',
          options: ['Cancel', 'Before', 'After', 'Issue'],
          cancelButtonIndex: 0,
        },
        index => {
          if (index === 0) resolve(null)
          else if (index === 1) resolve('before')
          else if (index === 2) resolve('after')
          else resolve('issue')
        }
      )
    } else {
      Alert.alert('Photo type', 'Choose a photo type', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Before', onPress: () => resolve('before') },
        { text: 'After', onPress: () => resolve('after') },
        { text: 'Issue', onPress: () => resolve('issue') },
      ])
    }
  })
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<any>(null)
  const [inspection, setInspection] = useState<any>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const load = useCallback(async () => {
    const [{ data: jobData }, { data: inspData }] = await Promise.all([
      supabase.from('jobs').select('*, properties(name, address), teams(name)').eq('id', id).single(),
      supabase.from('inspections').select('*').eq('job_id', id).maybeSingle(),
    ])
    setJob(jobData)
    setInspection(inspData)

    if (inspData?.id) {
      const [{ data: cl }, { data: ph }] = await Promise.all([
        supabase.from('checklist_items').select('*').eq('inspection_id', inspData.id).order('created_at'),
        supabase.from('inspection_photos').select('*').eq('inspection_id', inspData.id).order('created_at'),
      ])
      setChecklist(cl ?? [])
      setPhotos(ph ?? [])
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function toggleItem(item: ChecklistItem) {
    await supabase.from('checklist_items').update({ completed: !item.completed }).eq('id', item.id)
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c))
  }

  async function startJob() {
    await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', id)
    const { data: newInspection } = await supabase
      .from('inspections')
      .insert({ job_id: id, org_id: job.org_id, status: 'in_progress' })
      .select()
      .single()
    setJob((prev: any) => ({ ...prev, status: 'in_progress' }))
    setInspection(newInspection)
  }

  async function markDone() {
    await supabase.from('jobs').update({ status: 'done' }).eq('id', id)
    if (inspection?.id) await supabase.from('inspections').update({ status: 'completed' }).eq('id', inspection.id)
    setJob((prev: any) => ({ ...prev, status: 'done' }))
  }

  async function reopenJob() {
    await supabase.from('jobs').update({ status: 'in_progress' }).eq('id', id)
    setJob((prev: any) => ({ ...prev, status: 'in_progress' }))
  }

  async function uploadUri(uri: string, fileName: string, photoType: PhotoType) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/inspection-photos/${fileName}`
    const result = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: 1,
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'false',
      },
    })
    if (result.status !== 200 && result.status !== 201) {
      throw new Error(`Storage ${result.status}: ${result.body}`)
    }
    const { error: dbError } = await supabase.from('inspection_photos').insert({
      inspection_id: inspection.id,
      storage_path: fileName,
      photo_type: photoType,
    })
    if (dbError) throw new Error(`DB insert: ${dbError.message}`)
  }

  async function takePhoto() {
    if (!inspection?.id) return Alert.alert('No inspection', 'Job must be started first.')
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') return Alert.alert('Permission needed', 'Camera access is required to take photos.')
    const photoType = await pickPhotoType()
    if (!photoType) return

    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
    if (result.canceled) return

    setUploadingPhoto(true)
    try {
      const uri = result.assets[0].uri
      const fileName = `${inspection.id}/${Date.now()}.jpg`
      await uploadUri(uri, fileName, photoType)
      await load()
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? JSON.stringify(err))
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function pickFromLibrary() {
    if (!inspection?.id) return Alert.alert('No inspection', 'Job must be started first.')
    const photoType = await pickPhotoType()
    if (!photoType) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    })
    if (result.canceled) return

    setUploadingPhoto(true)
    try {
      for (const asset of result.assets) {
        const fileName = `${inspection.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        await uploadUri(asset.uri, fileName, photoType)
      }
      await load()
    } catch (err: any) {
      Alert.alert('Upload failed', err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2563eb" />
      </SafeAreaView>
    )
  }

  const completedCount = checklist.filter(c => c.completed).length
  const photosByType = {
    before: photos.filter(p => p.photo_type === 'before'),
    after: photos.filter(p => p.photo_type === 'after'),
    issue: photos.filter(p => p.photo_type === 'issue'),
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 17 }} numberOfLines={1}>
            {job?.properties?.name || 'Job'}
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 12 }}>{job?.properties?.address}</Text>
        </View>
        <View style={{
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
          backgroundColor: job?.status === 'in_progress' ? 'rgba(245,158,11,0.15)' : job?.status === 'done' ? 'rgba(34,197,94,0.15)' : 'rgba(59,130,246,0.15)',
        }}>
          <Text style={{
            fontSize: 12, fontWeight: '600',
            color: job?.status === 'in_progress' ? '#f59e0b' : job?.status === 'done' ? '#22c55e' : '#3b82f6',
          }}>
            {job?.status === 'in_progress' ? 'In Progress' : job?.status === 'done' ? 'Done' : 'Scheduled'}
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Start job */}
        {job?.status === 'scheduled' && (
          <TouchableOpacity
            style={{ backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
            onPress={startJob}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>Start Job</Text>
          </TouchableOpacity>
        )}

        {/* Mark as done */}
        {job?.status === 'in_progress' && (
          <TouchableOpacity
            style={{ backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
            onPress={() => Alert.alert('Mark as Done?', 'This will mark the job as completed.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Mark Done', onPress: markDone },
            ])}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>Mark as Done</Text>
          </TouchableOpacity>
        )}

        {/* Reopen job */}
        {job?.status === 'done' && (
          <TouchableOpacity
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 16, alignItems: 'center' }}
            onPress={reopenJob}
          >
            <Text style={{ color: '#9ca3af', fontWeight: '600', fontSize: 16 }}>Reopen Job</Text>
          </TouchableOpacity>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <View style={{ backgroundColor: '#1a1d27', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }}>Checklist</Text>
              <Text style={{ color: '#6b7280', fontSize: 13 }}>{completedCount}/{checklist.length}</Text>
            </View>
            {checklist.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: idx < checklist.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}
                onPress={() => toggleItem(item)}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.completed ? '#22c55e' : '#6b7280'}
                />
                <Text style={{ marginLeft: 12, fontSize: 14, flex: 1, color: item.completed ? '#6b7280' : '#f3f4f6', textDecorationLine: item.completed ? 'line-through' : 'none' }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Photos */}
        <View style={{ backgroundColor: '#1a1d27', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 15 }}>Photos</Text>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>{photos.length}</Text>
          </View>

          {(['before', 'after', 'issue'] as PhotoType[]).map(type => {
            const group = photosByType[type]
            if (group.length === 0) return null
            return (
              <View key={type}>
                <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: PHOTO_TYPE_COLORS[type] }} />
                  <Text style={{ color: '#9ca3af', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {PHOTO_TYPE_LABELS[type]}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {group.map(p => {
                      const { data: { publicUrl } } = supabase.storage.from('inspection-photos').getPublicUrl(p.storage_path)
                      return (
                        <Image
                          key={p.id}
                          source={{ uri: publicUrl }}
                          style={{ width: 96, height: 96, borderRadius: 8, backgroundColor: '#374151' }}
                        />
                      )
                    })}
                  </View>
                </ScrollView>
              </View>
            )
          })}

          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
            <TouchableOpacity
              onPress={takePhoto}
              disabled={uploadingPhoto}
              style={{ flex: 1, backgroundColor: 'rgba(37,99,235,0.15)', borderWidth: 1, borderColor: 'rgba(37,99,235,0.3)', borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="camera-outline" size={18} color="#3b82f6" />
              <Text style={{ color: '#3b82f6', fontWeight: '600', fontSize: 14 }}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromLibrary}
              disabled={uploadingPhoto}
              style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 10, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Ionicons name="images-outline" size={18} color="#9ca3af" />
              <Text style={{ color: '#9ca3af', fontWeight: '600', fontSize: 14 }}>Library</Text>
            </TouchableOpacity>
          </View>

          {uploadingPhoto && (
            <View style={{ alignItems: 'center', paddingBottom: 12 }}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>Uploading…</Text>
            </View>
          )}
        </View>

        {/* Send report / invoice */}
        {inspection?.id && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://www.cleerd.io/inspections/${inspection.id}`)}
            style={{ backgroundColor: '#1a1d27', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View>
              <Text style={{ color: '#e5e7eb', fontSize: 14, fontWeight: '500' }}>Send report / invoice</Text>
              <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 2 }}>Opens cleerd.io</Text>
            </View>
            <Ionicons name="open-outline" size={18} color="#4b5563" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
