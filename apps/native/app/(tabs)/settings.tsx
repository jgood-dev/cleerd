import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

export default function SettingsScreen() {
  async function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: () => supabase.auth.signOut(),
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0f1117]">
      <View className="px-5 pt-4 pb-6">
        <Text className="text-white text-2xl font-bold">Settings</Text>
      </View>

      <View className="px-5 space-y-3">
        <TouchableOpacity
          className="bg-surface border border-white/10 rounded-xl p-4 flex-row items-center justify-between"
          onPress={() => Linking.openURL('https://www.cleerd.io/settings/billing')}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="card-outline" size={20} color="#6b7280" />
            <Text className="text-white font-medium">Manage subscription</Text>
          </View>
          <Text className="text-gray-500 text-xs">Opens cleerd.io</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-surface border border-white/10 rounded-xl p-4 flex-row items-center justify-between"
          onPress={() => Linking.openURL('https://www.cleerd.io/settings')}
        >
          <View className="flex-row items-center gap-3">
            <Ionicons name="globe-outline" size={20} color="#6b7280" />
            <Text className="text-white font-medium">Account settings</Text>
          </View>
          <Text className="text-gray-500 text-xs">Opens cleerd.io</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex-row items-center gap-3"
          onPress={signOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text className="text-red-400 font-medium">Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
