import { useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useHoursData, getWeekRange, getMonthRange, DayData, AbsenceInfo } from '../../src/hooks/useHoursData'
import { useEmployeeConfig } from '../../src/hooks/useEmployeeConfig'

type ViewMode = 'week' | 'month'

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

function formatMs(ms: number): string {
  if (ms <= 0) return '–'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function formatDelta(ms: number): string {
  if (Math.abs(ms) < 60000) return '±0'
  const abs = Math.abs(ms)
  const sign = ms >= 0 ? '+' : '-'
  const hours = Math.floor(abs / 3600000)
  const minutes = Math.floor((abs % 3600000) / 60000)
  if (hours === 0) return `${sign}${minutes}m`
  return `${sign}${hours}h ${String(minutes).padStart(2, '0')}m`
}

function AbsenceBadge({ absence }: { absence: AbsenceInfo }) {
  const fg = absence.color
  const bg = fg + '22'
  const pending = absence.status === 'pending'
  return (
    <View style={[styles.absenceBadge, { backgroundColor: bg, borderColor: fg + '66' }, pending && styles.absenceBadgePending]}>
      <Text style={[styles.absenceBadgeText, { color: fg }]} numberOfLines={1}>
        {absence.typeName}{pending ? ' · ausstehend' : ''}
      </Text>
    </View>
  )
}

function HolidayBadge({ name }: { name: string }) {
  return (
    <View style={styles.holidayBadge}>
      <Text style={styles.holidayBadgeText} numberOfLines={1}>{name}</Text>
    </View>
  )
}

function DayRow({ day, maxMs, today }: { day: DayData; maxMs: number; today: string }) {
  const isToday = day.date === today
  const workWidth = day.workMs > 0 && maxMs > 0 ? (day.workMs / maxMs) * 100 : 0
  const breakWidth = day.breakMs > 0 && maxMs > 0 ? (day.breakMs / maxMs) * 100 : 0

  const dateObj = new Date(day.date + 'T00:00:00')
  const dayNum = dateObj.getDate()
  const weekday = WEEKDAY_SHORT[dateObj.getDay()]

  const showBars = !day.absence && day.workMs > 0
  const showBadge = day.absence || (day.holidayName && day.workMs === 0)

  return (
    <View style={[styles.dayRow, isToday && styles.dayRowToday]}>
      <View style={styles.dayLabelCol}>
        <Text style={[styles.dayNum, isToday && styles.dayToday]}>{String(dayNum).padStart(2, '0')}</Text>
        <Text style={[styles.dayWeekday, isToday && styles.dayToday]}>{weekday}</Text>
      </View>

      <View style={styles.barsColumn}>
        {day.absence ? (
          <AbsenceBadge absence={day.absence} />
        ) : day.holidayName && day.workMs === 0 ? (
          <HolidayBadge name={day.holidayName} />
        ) : (
          <>
            <View style={styles.barTrack}>
              {day.workMs > 0 && <View style={[styles.barWork, { width: `${workWidth}%` }]} />}
            </View>
            {day.breakMs > 0 && (
              <View style={styles.barTrack}>
                <View style={[styles.barBreak, { width: `${breakWidth}%` }]} />
              </View>
            )}
            {day.holidayName && (
              <Text style={styles.holidayInline}>{day.holidayName}</Text>
            )}
          </>
        )}
      </View>

      <View style={styles.timeColumn}>
        {!day.absence && day.workMs > 0 && (
          <>
            <Text style={styles.timeWork}>{formatMs(day.workMs)}</Text>
            {day.breakMs > 0 && <Text style={styles.timeBreak}>{formatMs(day.breakMs)}</Text>}
          </>
        )}
      </View>
    </View>
  )
}

export default function HoursScreen() {
  const [mode, setMode] = useState<ViewMode>('week')
  const [offset, setOffset] = useState(0)

  const range = mode === 'week' ? getWeekRange(offset) : getMonthRange(offset)
  const { data: config } = useEmployeeConfig()
  const { data, isLoading } = useHoursData(range.start, range.end, config?.locationId, config?.dailyHours)
  const today = new Date().toISOString().split('T')[0]

  const maxMs = Math.max(...(data?.days.map((d) => d.workMs + d.breakMs) ?? []), 1)

  const handleModeSwitch = (newMode: ViewMode) => {
    setMode(newMode)
    setOffset(0)
  }

  const deltaMs = data?.deltaMs ?? 0
  const deltaColor = deltaMs >= 0 ? '#16A34A' : '#DC2626'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'week' && styles.modeBtnActive]}
            onPress={() => handleModeSwitch('week')}
          >
            <Text style={[styles.modeBtnText, mode === 'week' && styles.modeBtnTextActive]}>Woche</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'month' && styles.modeBtnActive]}
            onPress={() => handleModeSwitch('month')}
          >
            <Text style={[styles.modeBtnText, mode === 'month' && styles.modeBtnTextActive]}>Monat</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => setOffset((o) => o - 1)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.rangeLabel}>{range.label}</Text>
          <TouchableOpacity
            onPress={() => setOffset((o) => o + 1)}
            disabled={offset >= 0}
            style={styles.navBtn}
          >
            <Text style={[styles.navBtnText, offset >= 0 && styles.navBtnDisabled]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gesamtkarte Ist-Zeit */}
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalLabel}>Arbeitszeit</Text>
          <Text style={styles.totalValue}>{formatMs(data?.totalWorkMs ?? 0)}</Text>
        </View>
        <View style={styles.divider} />
        <View>
          <Text style={styles.totalLabelBreak}>Pausen</Text>
          <Text style={styles.totalValueBreak}>{formatMs(data?.totalBreakMs ?? 0)}</Text>
        </View>
      </View>

      {/* Soll / Delta */}
      {data && (
        <View style={styles.targetCard}>
          <View>
            <Text style={styles.targetLabel}>Soll</Text>
            <Text style={styles.targetValue}>{formatMs(data.targetWorkMs)}</Text>
          </View>
          <View style={styles.targetDivider} />
          <View>
            <Text style={styles.targetLabel}>Differenz</Text>
            <Text style={[styles.deltaValue, { color: deltaColor }]}>{formatDelta(deltaMs)}</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 32 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {data?.days.map((day) => (
            <DayRow key={day.date} day={day} maxMs={maxMs} today={today} />
          ))}

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
              <Text style={styles.legendText}>Arbeitszeit</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Pause</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  header: {
    marginBottom: 16,
    gap: 10,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    padding: 3,
    alignSelf: 'flex-start',
  },
  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  modeBtnTextActive: {
    color: '#111827',
    fontWeight: '600',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navBtnText: {
    fontSize: 18,
    color: '#374151',
    lineHeight: 22,
  },
  navBtnDisabled: {
    color: '#D1D5DB',
  },
  rangeLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  totalCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#BFDBFE',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: '#3B82F6',
    marginHorizontal: 20,
  },
  totalLabelBreak: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  totalValueBreak: {
    color: '#FEF3C7',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.5,
  },
  targetCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 3,
  },
  targetValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  targetDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  deltaValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  dayRowToday: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  dayLabelCol: {
    width: 36,
    alignItems: 'center',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 16,
  },
  dayWeekday: {
    fontSize: 10,
    color: '#9CA3AF',
    lineHeight: 13,
  },
  dayToday: {
    color: '#2563EB',
  },
  barsColumn: {
    flex: 1,
    marginHorizontal: 10,
    gap: 3,
  },
  barTrack: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barWork: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  barBreak: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
  },
  timeColumn: {
    width: 52,
    alignItems: 'flex-end',
  },
  timeWork: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  timeBreak: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '500',
  },
  absenceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  absenceBadgePending: {
    opacity: 0.7,
  },
  absenceBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  holidayBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  holidayBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  holidayInline: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
})
