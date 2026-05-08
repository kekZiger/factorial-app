import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const KEYS = {
  accessToken: 'factorial_access_token',
  refreshToken: 'factorial_refresh_token',
  employeeId: 'factorial_employee_id',
} as const

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  employeeId: number | null
  isLoading: boolean
  setTokens: (access: string, refresh: string) => Promise<void>
  setEmployeeId: (id: number) => Promise<void>
  loadFromStorage: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  employeeId: null,
  isLoading: true,

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync(KEYS.accessToken, access)
    await SecureStore.setItemAsync(KEYS.refreshToken, refresh)
    set({ accessToken: access, refreshToken: refresh })
  },

  setEmployeeId: async (id) => {
    await SecureStore.setItemAsync(KEYS.employeeId, String(id))
    set({ employeeId: id })
  },

  loadFromStorage: async () => {
    const [access, refresh, employeeIdStr] = await Promise.all([
      SecureStore.getItemAsync(KEYS.accessToken),
      SecureStore.getItemAsync(KEYS.refreshToken),
      SecureStore.getItemAsync(KEYS.employeeId),
    ])
    set({
      accessToken: access,
      refreshToken: refresh,
      employeeId: employeeIdStr ? parseInt(employeeIdStr, 10) : null,
      isLoading: false,
    })
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken),
      SecureStore.deleteItemAsync(KEYS.refreshToken),
      SecureStore.deleteItemAsync(KEYS.employeeId),
    ])
    set({ accessToken: null, refreshToken: null, employeeId: null })
  },
}))
