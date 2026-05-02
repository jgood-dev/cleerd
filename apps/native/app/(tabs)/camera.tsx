import { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, Image, FlatList, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

// Standalone job-site camera — attach photos to active job
// Manus: wire up job selection and upload to inspection_photos table
export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<CameraType>('back')
  const [captured, setCaptured] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  if (!permission) return <View className="flex-1 bg-[#0f1117]" />

  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-[#0f1117] items-center justify-center px-8">
        <Ionicons name="camera-outline" size={48} color="#6b7280" />
        <Text className="text-white text-xl font-bold mt-4 mb-2">Camera access needed</Text>
        <Text className="text-gray-400 text-center mb-8">
          Cleerd needs camera access to photograph job sites.
        </Text>
        <TouchableOpacity className="bg-brand rounded-xl px-8 py-4" onPress={requestPermission}>
          <Text className="text-white font-semibold">Allow Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  async function takePicture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 })
    if (photo?.uri) setCaptured(prev => [...prev, photo.uri])
  }

  async function pickFromLibrary() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!result.canceled) {
      setCaptured(prev => [...prev, ...result.assets.map(a => a.uri)])
    }
  }

  function removePhoto(uri: string) {
    setCaptured(prev => prev.filter(p => p !== uri))
  }

  // TODO: Manus — implement uploadPhotos to upload to Supabase Storage
  // and insert rows into inspection_photos for the selected inspection
  async function uploadPhotos() {
    Alert.alert('Upload', `${captured.length} photo(s) ready to attach to a job. Job selection coming soon.`)
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} className="flex-1" facing={facing}>
        <SafeAreaView className="flex-1 justify-between">
          {/* Top controls */}
          <View className="flex-row justify-end p-4">
            <TouchableOpacity
              className="bg-black/40 rounded-full p-2"
              onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Bottom controls */}
          <View className="pb-8 px-6">
            {/* Thumbnail strip */}
            {captured.length > 0 && (
              <FlatList
                data={captured}
                keyExtractor={u => u}
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <TouchableOpacity onLongPress={() => removePhoto(item)}>
                    <Image source={{ uri: item }} className="w-16 h-16 rounded-lg" />
                  </TouchableOpacity>
                )}
              />
            )}

            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                className="bg-white/20 rounded-full p-3"
                onPress={pickFromLibrary}
              >
                <Ionicons name="images-outline" size={24} color="white" />
              </TouchableOpacity>

              {/* Shutter */}
              <TouchableOpacity
                className="bg-white rounded-full w-20 h-20 items-center justify-center border-4 border-white/40"
                onPress={takePicture}
              />

              <TouchableOpacity
                className="bg-brand rounded-full p-3"
                onPress={uploadPhotos}
                disabled={captured.length === 0 || uploading}
              >
                {uploading
                  ? <ActivityIndicator color="white" size="small" />
                  : <Ionicons name="cloud-upload-outline" size={24} color="white" />
                }
              </TouchableOpacity>
            </View>

            {captured.length > 0 && (
              <Text className="text-white/60 text-xs text-center mt-3">
                {captured.length} photo{captured.length !== 1 ? 's' : ''} · long press thumbnail to remove
              </Text>
            )}
          </View>
        </SafeAreaView>
      </CameraView>
    </View>
  )
}
