import { useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import { useAuthRequest, makeRedirectUri } from 'expo-auth-session'
import { useRouter } from 'expo-router'
import { FACTORIAL_CONFIG } from '../../src/config'
import { exchangeCodeForTokens, fetchCurrentEmployeeId } from '../../src/api/auth'
import { useAuthStore } from '../../src/store/auth'

WebBrowser.maybeCompleteAuthSession()

const redirectUri = makeRedirectUri({ scheme: 'factorialapp', path: 'oauth/callback' })
console.log('[OAuth] Redirect URI:', redirectUri)

const discovery = {
  authorizationEndpoint: FACTORIAL_CONFIG.authorizationEndpoint,
  tokenEndpoint: FACTORIAL_CONFIG.tokenEndpoint,
}

export default function LoginScreen() {
  const router = useRouter()
  const { setTokens, setEmployeeId } = useAuthStore()

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: FACTORIAL_CONFIG.clientId,
      scopes: [...FACTORIAL_CONFIG.scopes],
      redirectUri,
      usePKCE: false,
    },
    discovery
  )

  useEffect(() => {
    if (response?.type !== 'success') return
    const { code } = response.params

    ;(async () => {
      try {
        const tokens = await exchangeCodeForTokens(code, redirectUri)
        await setTokens(tokens.access_token, tokens.refresh_token)
        const employeeId = await fetchCurrentEmployeeId(tokens.access_token)
        await setEmployeeId(employeeId)
        router.replace('/(tabs)')
      } catch (err) {
        console.error('Login-Fehler:', err)
        Alert.alert(
          'Anmeldung fehlgeschlagen',
          'Bitte prüfe deine Internetverbindung und versuche es erneut.'
        )
      }
    })()
  }, [response])

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.top}>
        <Text style={styles.logo}>Factorial</Text>
        <Text style={styles.subtitle}>Zeiterfassung</Text>
      </View>
      <TouchableOpacity
        style={[styles.button, !request && styles.buttonDisabled]}
        onPress={() => promptAsync()}
        disabled={!request}
        activeOpacity={0.85}
      >
        {!request ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Mit Factorial anmelden</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 28,
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 40,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 6,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
})
