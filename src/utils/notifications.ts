import * as Notifications from 'expo-notifications'

const BREAK_REMINDER_ID = 'break_reminder'
const ONGOING_ID = 'ongoing_status'

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// --- Pause-Erinnerung ---

export async function scheduleBreakReminder(
  workStartTime: Date,
  thresholdHours: number = 6
): Promise<void> {
  await cancelBreakReminder()

  const granted = await requestNotificationPermission()
  if (!granted) return

  const triggerDate = new Date(workStartTime.getTime() + thresholdHours * 3_600_000)

  if (triggerDate.getTime() <= Date.now()) {
    await Notifications.scheduleNotificationAsync({
      identifier: BREAK_REMINDER_ID,
      content: {
        title: 'Pause nicht vergessen!',
        body: `Du arbeitest bereits mehr als ${thresholdHours} Stunden ohne Pause.`,
        sound: true,
      },
      trigger: null,
    })
  } else {
    await Notifications.scheduleNotificationAsync({
      identifier: BREAK_REMINDER_ID,
      content: {
        title: 'Pause nicht vergessen!',
        body: `Du arbeitest jetzt ${thresholdHours} Stunden ohne Pause.`,
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    })
  }
}

export async function cancelBreakReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(BREAK_REMINDER_ID)
}

// --- Dauerhafte Status-Notification ---

function fmtMs(ms: number): string {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`
}

export async function updateOngoingNotification(
  workMs: number,
  remainingMs: number,
  endTimeStr: string
): Promise<void> {
  const granted = await requestNotificationPermission()
  if (!granted) return

  const isOvertime = remainingMs < 0
  const body = isOvertime
    ? `${fmtMs(workMs)} gearbeitet · ${fmtMs(-remainingMs)} Überstunden`
    : `${fmtMs(workMs)} gearbeitet · Feierabend ca. ${endTimeStr}`

  await Notifications.dismissNotificationAsync(ONGOING_ID).catch(() => {})
  await Notifications.scheduleNotificationAsync({
    identifier: ONGOING_ID,
    content: {
      title: 'Eingestempelt',
      body,
      sticky: true,
      autoDismiss: false,
      priority: Notifications.AndroidNotificationPriority.LOW,
    } as any,
    trigger: null,
  })
}

export async function cancelOngoingNotification(): Promise<void> {
  await Notifications.dismissNotificationAsync(ONGOING_ID).catch(() => {})
  await Notifications.cancelScheduledNotificationAsync(ONGOING_ID).catch(() => {})
}
