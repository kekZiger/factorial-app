import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { FACTORIAL_CONFIG } from '../config'

const KEYS = {
  accessToken: 'factorial_access_token',
  refreshToken: 'factorial_refresh_token',
}

export const apiClient = axios.create({
  baseURL: 'https://api.factorialhr.com',
  headers: { 'Content-Type': 'application/json' },
})

// Hängt bei jedem Request den aktuellen Access Token an
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(KEYS.accessToken)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Verhindert mehrfache parallele Refresh-Versuche
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error)
    else resolve(token!)
  })
  failedQueue = []
}

// Bei 401: Token automatisch erneuern, Request wiederholen
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`
        return apiClient(originalRequest)
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshToken = await SecureStore.getItemAsync(KEYS.refreshToken)
      if (!refreshToken) throw new Error('Kein Refresh Token vorhanden')

      const response = await axios.post(FACTORIAL_CONFIG.tokenEndpoint, {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: FACTORIAL_CONFIG.clientId,
        client_secret: FACTORIAL_CONFIG.clientSecret,
      })

      const { access_token, refresh_token } = response.data
      await SecureStore.setItemAsync(KEYS.accessToken, access_token)
      await SecureStore.setItemAsync(KEYS.refreshToken, refresh_token)

      processQueue(null, access_token)
      originalRequest.headers.Authorization = `Bearer ${access_token}`
      return apiClient(originalRequest)
    } catch (err) {
      processQueue(err, null)
      await SecureStore.deleteItemAsync(KEYS.accessToken)
      await SecureStore.deleteItemAsync(KEYS.refreshToken)
      await SecureStore.deleteItemAsync('factorial_employee_id')
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)
