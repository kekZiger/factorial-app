import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { useAuthStore } from '../src/store/auth'
import { requestNotificationPermission } from '../src/utils/notifications'

// Benachrichtigungen auch im Vordergrund anzeigen
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

const queryClient = new QueryClient()

function AuthGuard() {
  const { accessToken, isLoading, loadFromStorage } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  // Beim App-Start Token laden und Notification-Permission anfragen
  useEffect(() => {
    loadFromStorage()
    requestNotificationPermission()
  }, [])

  // Nach dem Laden: in die richtige Route weiterleiten
  useEffect(() => {
    if (isLoading) return
    const inAuthGroup = segments[0] === '(auth)'
    if (!accessToken && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (accessToken && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [accessToken, isLoading, segments])

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
