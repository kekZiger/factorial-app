import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

// Diese Route fängt den OAuth-Redirect auf und gibt die Kontrolle
// zurück an expo-auth-session im Login-Screen
export default function OAuthCallback() {
  useEffect(() => {
    WebBrowser.maybeCompleteAuthSession()
  }, [])

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  )
}
