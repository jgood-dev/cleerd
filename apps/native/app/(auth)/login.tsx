import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { Link } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) Alert.alert('Sign in failed', error.message)
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#0f1117]"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        {/* Logo */}
        <View className="items-center mb-10">
          <View className="bg-brand rounded-xl px-4 py-2.5">
            <Text className="text-white text-2xl font-bold tracking-tight">✓ Cleerd</Text>
          </View>
        </View>

        <Text className="text-white text-2xl font-bold mb-1">Welcome back</Text>
        <Text className="text-gray-400 mb-8">Sign in to your Cleerd account</Text>

        <View className="space-y-4">
          <View>
            <Text className="text-gray-300 text-sm font-medium mb-1.5">Email</Text>
            <TextInput
              className="bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white text-base"
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View>
            <Text className="text-gray-300 text-sm font-medium mb-1.5">Password</Text>
            <TextInput
              className="bg-surface border border-white/10 rounded-xl px-4 py-3.5 text-white text-base"
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
          </View>

          <TouchableOpacity
            className="bg-brand rounded-xl py-4 items-center mt-2"
            onPress={signIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text className="text-white text-base font-semibold">Sign in</Text>
            }
          </TouchableOpacity>
        </View>

        <Link href="/(auth)/forgot-password" asChild>
          <TouchableOpacity className="mt-4 items-center">
            <Text className="text-blue-400 text-sm">Forgot password?</Text>
          </TouchableOpacity>
        </Link>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-500 text-sm">Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity>
              <Text className="text-blue-400 text-sm font-medium">Sign up at cleerd.io</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
