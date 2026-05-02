import '../global.css'
import { useEffect, useState, useRef } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { Session } from '@supabase/supabase-js'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import { supabase } from '@/lib/supabase'
import { registerForPushNotifications, savePushToken } from '@/lib/notifications'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const segments = useSegments()
  const notificationListener = useRef<any>()
  const responseListener = useRef<any>()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {})

    // Handle tapping a notification — navigate to job if job_id provided
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const jobId = response.notification.request.content.data?.job_id
      if (jobId) router.push(`/job/${jobId}`)
    })

    return () => {
      subscription.unsubscribe()
      Notifications.removeNotificationSubscription(notificationListener.current)
      Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [])

  // Register push token whenever a session starts
  useEffect(() => {
    if (!session) return
    registerForPushNotifications().then(token => {
      if (token) savePushToken(token)
    })
  }, [session?.user?.id])

  useEffect(() => {
    if (!ready) return
    const inAuth = segments[0] === '(auth)'
    if (!session && !inAuth) router.replace('/(auth)/login')
    if (session && inAuth) router.replace('/(tabs)')
  }, [session, ready, segments])

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="dashboard" />
    </Stack>
  )
}
