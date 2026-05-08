import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

const KEYS = {
  breakReminderEnabled: 'setting_break_reminder_enabled',
  breakReminderHours: 'setting_break_reminder_hours',
  ongoingNotificationEnabled: 'setting_ongoing_notification_enabled',
} as const

interface SettingsState {
  breakReminderEnabled: boolean
  breakReminderHours: number
  ongoingNotificationEnabled: boolean
  isLoaded: boolean
  load: () => Promise<void>
  setBreakReminderEnabled: (v: boolean) => Promise<void>
  setBreakReminderHours: (v: number) => Promise<void>
  setOngoingNotificationEnabled: (v: boolean) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  breakReminderEnabled: true,
  breakReminderHours: 6,
  ongoingNotificationEnabled: false,
  isLoaded: false,

  load: async () => {
    const [enabled, hours, ongoing] = await Promise.all([
      SecureStore.getItemAsync(KEYS.breakReminderEnabled),
      SecureStore.getItemAsync(KEYS.breakReminderHours),
      SecureStore.getItemAsync(KEYS.ongoingNotificationEnabled),
    ])
    set({
      breakReminderEnabled: enabled !== 'false',
      breakReminderHours: hours ? parseInt(hours, 10) : 6,
      ongoingNotificationEnabled: ongoing === 'true',
      isLoaded: true,
    })
  },

  setBreakReminderEnabled: async (v) => {
    await SecureStore.setItemAsync(KEYS.breakReminderEnabled, String(v))
    set({ breakReminderEnabled: v })
  },

  setBreakReminderHours: async (v) => {
    await SecureStore.setItemAsync(KEYS.breakReminderHours, String(v))
    set({ breakReminderHours: v })
  },

  setOngoingNotificationEnabled: async (v) => {
    await SecureStore.setItemAsync(KEYS.ongoingNotificationEnabled, String(v))
    set({ ongoingNotificationEnabled: v })
  },
}))
