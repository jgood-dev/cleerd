import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

type ChecklistItem = { id: string; label: string; completed: boolean }
type Photo = { id: string; url: string; label?: string }

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
    setJob((prev: any) => ({ ...prev, status: 'in_progress' }))
  }

  async function takePhoto() {
    if (!inspection?.id) return Alert.alert('No inspection', 'Job must be started first.')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const result = await ImagePicker.launchCameraAsync({ quality: 0.85, allowsEditing: false })
    if (result.canceled) return

    setUploadingPhoto(true)
    try {
      const uri = result.assets[0].uri
      const fileName = `${inspection.id}/${Date.now()}.jpg`
      const response = await fetch(uri)
      const blob = await response.blob()

      const { error: uploadError } = await supabase.storage
        .from('inspection-photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('inspection-photos')
        .getPublicUrl(fileName)

      await supabase.from('inspection_photos').insert({
        inspection_id: inspection.id,
        url: publicUrl,
        label: 'Photo',
      })

      await load()
    } catch (err: any) {
      Alert.alert('Upload failed', err.message)
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function pickFromLibrary() {
    if (!inspection?.id) return Alert.alert('No inspection', 'Job must be started first.')
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    })
    if (result.canceled) return

    setUploadingPhoto(true)
    try {
      for (const asset of result.assets) {
        const fileName = `${inspection.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        const { error } = await supabase.storage
          .from('inspection-photos')
          .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('inspection-photos').getPublicUrl(fileName)
        await supabase.from('inspection_photos').insert({ inspection_id: inspection.id, url: publicUrl, label: 'Photo' })
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
      <SafeAreaView className="flex-1 bg-[#0f1117] items-center justify-center">
        <ActivityIndicator color="#2563eb" />
      </SafeAreaView>
    )
  }

  const completedCount = checklist.filter(c => c.completed).length

  return (
    <SafeAreaView className="flex-1 bg-[#0f1117]">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-white/10">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white font-bold text-lg" numberOfLines={1}>
            {job?.title || job?.properties?.name || 'Job'}
          </Text>
          <Text className="text-gray-400 text-xs">{job?.properties?.address}</Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${job?.status === 'in_progress' ? 'bg-amber-500/20' : job?.status === 'done' ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
          <Text className={`text-xs font-medium ${job?.status === 'in_progress' ? 'text-amber-400' : job?.status === 'done' ? 'text-green-400' : 'text-blue-400'}`}>
            {job?.status === 'in_progress' ? 'In Progress' : job?.status === 'done' ? 'Done' : 'Scheduled'}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Start job */}
        {job?.status === 'scheduled' && (
          <TouchableOpacity
            className="bg-brand rounded-xl py-4 items-center"
            onPress={startJob}
          >
            <Text className="text-white font-semibold text-base">Start Job</Text>
          </TouchableOpacity>
        )}

        {/* Checklist */}
        {checklist.length > 0 && (
          <View className="bg-surface rounded-xl border border-white/10 overflow-hidden">
            <View className="px-4 py-3 border-b border-white/10 flex-row justify-between items-center">
              <Text className="text-white font-semibold">Checklist</Text>
              <Text className="text-gray-400 text-sm">{completedCount}/{checklist.length}</Text>
            </View>
            {checklist.map((item, idx) => (
              <TouchableOpacity
                key={item.id}
                className={`flex-row items-center px-4 py-3.5 ${idx < checklist.length - 1 ? 'border-b border-white/5' : ''}`}
                onPress={() => toggleItem(item)}
                activeOpacity={0.6}
              >
                <Ionicons
                  name={item.completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={item.completed ? '#22c55e' : '#6b7280'}
                />
                <Text className={`ml-3 text-sm flex-1 ${item.completed ? 'text-gray-500 line-through' : 'text-gray-100'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Photos */}
        <View className="bg-surface rounded-xl border border-white/10 overflow-hidden">
          <View className="px-4 py-3 border-b border-white/10 flex-row justify-between items-center">
            <Text className="text-white font-semibold">Photos</Text>
            <Text className="text-gray-400 text-sm">{photos.length}</Text>
          </View>

          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
              <View className="flex-row gap-2">
                {photos.map(p => (
                  <Image key={p.id} source={{ uri: p.url }} className="w-24 h-24 rounded-lg" />
                ))}
              </View>
            </ScrollView>
          )}

          <View className="flex-row gap-3 px-4 py-3">
            <TouchableOpacity
              className="flex-1 bg-brand/20 border border-brand/30 rounded-xl py-3 items-center flex-row justify-center gap-2"
              onPress={takePhoto}
              disabled={uploadingPhoto}
            >
              <Ionicons name="camera-outline" size={18} color="#2563eb" />
              <Text className="text-blue-400 font-medium text-sm">Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 items-center flex-row justify-center gap-2"
              onPress={pickFromLibrary}
              disabled={uploadingPhoto}
            >
              <Ionicons name="images-outline" size={18} color="#9ca3af" />
              <Text className="text-gray-400 font-medium text-sm">Library</Text>
            </TouchableOpacity>
          </View>
          {uploadingPhoto && (
            <View className="items-center py-2">
              <ActivityIndicator size="small" color="#2563eb" />
              <Text className="text-gray-400 text-xs mt-1">Uploading…</Text>
            </View>
          )}
        </View>

        {/* Web link for report/invoice */}
        <TouchableOpacity
          className="bg-surface border border-white/10 rounded-xl p-4 flex-row items-center justify-between"
          onPress={() => Alert.alert('Open on web', 'Open this job on cleerd.io to send reports and invoices.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open', onPress: () => {} },
          ])}
        >
          <Text className="text-gray-300 text-sm">Send report / invoice</Text>
          <Text className="text-gray-500 text-xs">Opens cleerd.io →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}
