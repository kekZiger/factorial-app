import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useShiftStatus } from '../../src/hooks/useShiftStatus'
import { useShiftTimer } from '../../src/hooks/useShiftTimer'
import { useAuthStore } from '../../src/store/auth'
import { useEmployeeConfig } from '../../src/hooks/useEmployeeConfig'
import { useSettingsStore } from '../../src/store/settings'
import { updateOngoingNotification, cancelOngoingNotification } from '../../src/utils/notifications'
import { LocationType } from '../../src/types'

const LOCATION_OPTIONS: { label: string; value: LocationType }[] = [
  { label: 'Büro', value: 'office' },
  { label: 'Homeoffice', value: 'work_from_home' },
  { label: 'Dienstreise', value: 'business_trip' },
]

export default function HomeScreen() {
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const { shifts, clockState, isLoading, isError, toggle, startBreak, endBreak, isActing } =
    useShiftStatus()
  const { data: config } = useEmployeeConfig()
  const timer = useShiftTimer(shifts, config?.dailyHours)

  const ongoingEnabled = useSettingsStore((s) => s.ongoingNotificationEnabled)
  const lastOngoingUpdate = useRef(0)

  useEffect(() => {
    if (!ongoingEnabled || clockState !== 'clocked_in') {
      cancelOngoingNotification()
      return
    }
    const now = Date.now()
    if (now - lastOngoingUpdate.current < 60_000) return
    lastOngoingUpdate.current = now

    const workMs = timer.remainingMs !== null
      ? (config?.dailyHours ?? 8) * 3_600_000 - timer.remainingMs
      : 0
    updateOngoingNotification(workMs, timer.remainingMs ?? 0, timer.endTimeStr ?? '')
  })

  const today = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const handleLogout = () => {
    Alert.alert('Abmelden', 'Wirklich abmelden?', [
      {
        text: 'Abmelden',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
      { text: 'Abbrechen', style: 'cancel' },
    ])
  }

  const handleClockIn = () => {
    Alert.alert('Wo arbeitest du heute?', '', [
      ...LOCATION_OPTIONS.map(({ label, value }) => ({
        text: label,
        onPress: () => toggle(value),
      })),
      { text: 'Abbrechen', style: 'cancel' },
    ])
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Verbindungsfehler</Text>
        <Text style={styles.errorSub}>Bitte prüfe deine Internetverbindung</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topRow}>
        <Text style={styles.date}>{today}</Text>
        <TouchableOpacity onPress={handleLogout} hitSlop={12}>
          <Text style={styles.logoutBtn}>Abmelden</Text>
        </TouchableOpacity>
      </View>

      {/* Arbeitszeit-Karte — nur wenn eingestempelt oder in Pause */}
      {clockState !== 'clocked_out' && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>
            Eingestempelt seit {timer.clockInTime} Uhr
          </Text>
          <Text
            style={[
              styles.timerLarge,
              clockState === 'on_break' && styles.timerPaused,
            ]}
          >
            {timer.workDuration}
          </Text>
          <Text style={styles.cardSub}>Netto-Arbeitszeit</Text>
        </View>
      )}

      {/* Pausen-Karte — nur wenn eingestempelt oder in Pause */}
      {clockState !== 'clocked_out' && (
        <View style={[styles.card, styles.breakCard]}>
          <Text style={styles.cardLabel}>Pausen heute</Text>
          <Text style={styles.timerMedium}>{timer.totalBreakDuration}</Text>
          {clockState === 'on_break' && timer.currentBreakDuration && (
            <Text style={styles.currentBreakText}>
              Läuft seit {timer.currentBreakDuration}
            </Text>
          )}
        </View>
      )}

      {/* Feierabend-Karte */}
      {clockState !== 'clocked_out' && (
        <View style={[styles.card, styles.endCard]}>
          {timer.isOvertime ? (
            <>
              <Text style={styles.cardLabel}>Überstunden</Text>
              <Text style={styles.endTimeValue}>{timer.remainingFormatted}</Text>
            </>
          ) : (
            <>
              <Text style={styles.cardLabel}>Feierabend um</Text>
              <Text style={styles.endTimeValue}>{timer.endTimeStr} Uhr</Text>
              <Text style={styles.endTimeSub}>Noch {timer.remainingFormatted}</Text>
            </>
          )}
        </View>
      )}

      {/* Ausgestempelt-Zustand */}
      {clockState === 'clocked_out' && (
        <View style={styles.centerFlex}>
          <Text style={styles.clockedOutText}>Nicht eingestempelt</Text>
        </View>
      )}

      {/* Aktions-Buttons */}
      <View style={styles.actions}>
        {clockState === 'clocked_out' && (
          <TouchableOpacity
            style={[styles.btn, styles.btnGreen]}
            onPress={handleClockIn}
            disabled={isActing}
            activeOpacity={0.85}
          >
            {isActing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Einstempeln</Text>
            )}
          </TouchableOpacity>
        )}

        {clockState === 'clocked_in' && (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.btnAmber]}
              onPress={() => startBreak()}
              disabled={isActing}
              activeOpacity={0.85}
            >
              {isActing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Pause starten</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnRed]}
              onPress={() => toggle('office')}
              disabled={isActing}
              activeOpacity={0.85}
            >
              {isActing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Ausstempeln</Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {clockState === 'on_break' && (
          <TouchableOpacity
            style={[styles.btn, styles.btnBlue]}
            onPress={() => endBreak()}
            disabled={isActing}
            activeOpacity={0.85}
          >
            {isActing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Pause beenden</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  date: {
    fontSize: 15,
    color: '#9CA3AF',
    textTransform: 'capitalize',
  },
  logoutBtn: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  breakCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#D97706',
  },
  endCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
  },
  endTimeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  endTimeSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  cardLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  cardSub: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 6,
  },
  timerLarge: {
    fontSize: 52,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  timerPaused: {
    color: '#D1D5DB',
  },
  timerMedium: {
    fontSize: 30,
    fontWeight: '600',
    color: '#D97706',
    fontVariant: ['tabular-nums'],
  },
  currentBreakText: {
    fontSize: 13,
    color: '#D97706',
    marginTop: 6,
  },
  clockedOutText: {
    fontSize: 18,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  errorSub: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  actions: {
    marginTop: 'auto',
    gap: 10,
  },
  btn: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  btnGreen: { backgroundColor: '#16A34A' },
  btnRed: { backgroundColor: '#DC2626' },
  btnAmber: { backgroundColor: '#D97706' },
  btnBlue: { backgroundColor: '#2563EB' },
})
