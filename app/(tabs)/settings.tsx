import { useEffect } from 'react'
import { View, Text, ScrollView, Switch, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/auth'
import { useSettingsStore } from '../../src/store/settings'
import { cancelBreakReminder, cancelOngoingNotification } from '../../src/utils/notifications'

const HOUR_OPTIONS = [4, 5, 6, 7, 8]

export default function SettingsScreen() {
  const logout = useAuthStore((s) => s.logout)
  const {
    breakReminderEnabled, setBreakReminderEnabled,
    breakReminderHours, setBreakReminderHours,
    ongoingNotificationEnabled, setOngoingNotificationEnabled,
    isLoaded, load,
  } = useSettingsStore()

  useEffect(() => {
    if (!isLoaded) load()
  }, [])

  const handleBreakReminderToggle = async (v: boolean) => {
    await setBreakReminderEnabled(v)
    if (!v) cancelBreakReminder()
  }

  const handleOngoingToggle = async (v: boolean) => {
    await setOngoingNotificationEnabled(v)
    if (!v) cancelOngoingNotification()
  }

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Wirklich abmelden?', [
      { text: 'Abbrechen', style: 'cancel' },
      { text: 'Abmelden', style: 'destructive', onPress: logout },
    ])
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.heading}>Einstellungen</Text>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

        {/* Benachrichtigungen */}
        <Text style={styles.sectionTitle}>Benachrichtigungen</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Pause-Erinnerung</Text>
              <Text style={styles.rowSub}>Wenn du zu lange ohne Pause arbeitest</Text>
            </View>
            <Switch
              value={breakReminderEnabled}
              onValueChange={handleBreakReminderToggle}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={breakReminderEnabled ? '#2563EB' : '#fff'}
            />
          </View>

          {breakReminderEnabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.rowLabel}>
                <Text style={styles.rowTitle}>Erinnerung nach</Text>
                <Text style={styles.rowSub}>Stunden ohne Pause</Text>
              </View>
              <View style={styles.segmentRow}>
                {HOUR_OPTIONS.map((h) => (
                  <TouchableOpacity
                    key={h}
                    style={[styles.segment, breakReminderHours === h && styles.segmentActive]}
                    onPress={() => setBreakReminderHours(h)}
                  >
                    <Text style={[styles.segmentText, breakReminderHours === h && styles.segmentTextActive]}>
                      {h}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowLabel}>
              <Text style={styles.rowTitle}>Status-Benachrichtigung</Text>
              <Text style={styles.rowSub}>Zeigt Arbeitszeit und Feierabend dauerhaft an</Text>
            </View>
            <Switch
              value={ongoingNotificationEnabled}
              onValueChange={handleOngoingToggle}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={ongoingNotificationEnabled ? '#2563EB' : '#fff'}
            />
          </View>
        </View>

        {/* Konto */}
        <Text style={styles.sectionTitle}>Konto</Text>

        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={handleLogout}>
            <Text style={styles.logoutText}>Abmelden</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  rowSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  segmentActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  segmentTextActive: {
    color: '#fff',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#DC2626',
  },
})
