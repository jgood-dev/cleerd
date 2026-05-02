import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()

  async function send() {
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://www.cleerd.io/reset-password',
    })
    setLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <View className="flex-1 bg-[#0f1117] justify-center px-6">
        <Text className="text-white text-2xl font-bold mb-3">Check your email</Text>
        <Text className="text-gray-400 mb-8">
          If an account exists for {email}, we sent a reset link. Use the link to reset your password on cleerd.io, then sign in here.
        </Text>
        <TouchableOpacity className="bg-brand rounded-xl py-4 items-center" onPress={() => router.back()}>
          <Text className="text-white font-semibold">Back to sign in</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0f1117]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-white text-2xl font-bold mb-1">Reset password</Text>
        <Text className="text-gray-400 mb-8">Enter your email and we'll send a reset link.</Text>

        <Text className="text-gray-300 text-sm font-medium mb-1.5">Email</Text>
        <TextInput
          className="bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white text-base mb-4"
          placeholder="you@example.com"
          placeholderTextColor="#6b7280"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TouchableOpacity
          className="bg-brand rounded-xl py-4 items-center"
          onPress={send}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text className="text-white text-base font-semibold">Send reset link</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity className="mt-4 items-center" onPress={() => router.back()}>
          <Text className="text-blue-400 text-sm">Back to sign in</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
