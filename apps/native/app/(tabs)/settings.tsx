import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Alert, Linking, ScrollView, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { getOrgForUser } from '@/lib/get-org'

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null)
  const [org, setOrg] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUser(user)
    const { org } = await getOrgForUser(user.id, user.email)
    setOrg(org)
    setLoading(false)
  }

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117' }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: '#ffffff', fontSize: 24, fontWeight: '700' }}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        {/* Account card */}
        <View style={{ backgroundColor: '#1a1d27', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, marginBottom: 4 }}>
          {loading ? (
            <ActivityIndicator color="#2563eb" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: '700' }}>
                  {(user?.email ?? '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16 }}>
                  {org?.owner_name ?? user?.email ?? ''}
                </Text>
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{user?.email}</Text>
                {org?.name && (
                  <Text style={{ color: '#4b5563', fontSize: 12, marginTop: 2 }}>{org.name}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Links */}
        <Row
          icon="card-outline"
          label="Manage subscription"
          sub="Opens cleerd.io"
          onPress={() => Linking.openURL('https://www.cleerd.io/settings/billing')}
        />
        <Row
          icon="people-outline"
          label="Team members"
          sub="Opens cleerd.io"
          onPress={() => Linking.openURL('https://www.cleerd.io/settings/members')}
        />
        <Row
          icon="business-outline"
          label="Business settings"
          sub="Opens cleerd.io"
          onPress={() => Linking.openURL('https://www.cleerd.io/settings/business')}
        />
        <Row
          icon="globe-outline"
          label="Open dashboard"
          sub="Opens cleerd.io"
          onPress={() => Linking.openURL('https://www.cleerd.io/dashboard')}
        />

        {/* Sign out */}
        <TouchableOpacity
          onPress={signOut}
          style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}
        >
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text style={{ color: '#f87171', fontWeight: '600', fontSize: 15 }}>Sign out</Text>
        </TouchableOpacity>

        <Text style={{ color: '#374151', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Cleerd v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ icon, label, sub, onPress }: { icon: any; label: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ backgroundColor: '#1a1d27', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon} size={20} color="#6b7280" />
        <Text style={{ color: '#ffffff', fontWeight: '500', fontSize: 15 }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ color: '#4b5563', fontSize: 12 }}>{sub}</Text>
        <Ionicons name="open-outline" size={14} color="#4b5563" />
      </View>
    </TouchableOpacity>
  )
}
