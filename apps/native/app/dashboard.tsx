import { useEffect, useRef, useState } from 'react'
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'

const DASHBOARD_URL = 'https://www.cleerd.io/dashboard'

export default function DashboardScreen() {
  const [sessionScript, setSessionScript] = useState<string | null>(null)
  const webRef = useRef<WebView>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.back(); return }
      // Inject the Supabase session into localStorage so the web app auto-authenticates
      const storageKey = `sb-${process.env.EXPO_PUBLIC_SUPABASE_URL!.split('//')[1].split('.')[0]}-auth-token`
      const sessionData = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        token_type: 'bearer',
        user: session.user,
      })
      const script = `
        (function() {
          try {
            localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(sessionData)});
          } catch(e) {}
          window.location.reload();
        })();
        true;
      `
      setSessionScript(script)
    })
  }, [])

  if (!sessionScript) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#2563eb" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0f1117' }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 16, flex: 1 }}>Dashboard</Text>
        <TouchableOpacity onPress={() => webRef.current?.reload()}>
          <Ionicons name="refresh-outline" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <WebView
        ref={webRef}
        source={{ uri: DASHBOARD_URL }}
        injectedJavaScriptBeforeContentLoaded={sessionScript}
        style={{ flex: 1 }}
        startInLoadingState
        renderLoading={() => (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: '#0f1117', alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#2563eb" />
          </View>
        )}
      />
    </SafeAreaView>
  )
}
