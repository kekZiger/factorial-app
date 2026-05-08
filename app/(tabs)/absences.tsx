import { useState, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Calendar } from 'react-native-calendars'
import { useLeaves, useLeaveTypes, useCreateLeave, useAllowanceSummary } from '../../src/hooks/useLeaves'
import { Leave } from '../../src/types'
import { toDateStr } from '../../src/utils/publicHolidays'

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

function leaveStatus(leave: Leave): { label: string; color: string } {
  if (leave.approved) return { label: 'Genehmigt', color: '#16A34A' }
  const today = toDateStr(new Date())
  const past = (leave.finish_on ?? leave.start_on) < today
  return past
    ? { label: 'Abgelehnt', color: '#DC2626' }
    : { label: 'Ausstehend', color: '#D97706' }
}

function LeaveCard({ leave, typeName }: { leave: Leave; typeName: string }) {
  const config = leaveStatus(leave)
  return (
    <View style={styles.leaveCard}>
      <View style={styles.leaveHeader}>
        <Text style={styles.leaveType}>{typeName}</Text>
        <View style={[styles.badge, { backgroundColor: config.color + '18' }]}>
          <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
        </View>
      </View>
      <Text style={styles.leaveDates}>
        {fmtDate(leave.start_on)}
        {leave.finish_on && leave.finish_on !== leave.start_on
          ? ` – ${fmtDate(leave.finish_on)}`
          : ''}
      </Text>
      {leave.description ? (
        <Text style={styles.leaveDesc}>{leave.description}</Text>
      ) : null}
    </View>
  )
}

export default function AbsencesScreen() {
  const { data: leaves, isLoading } = useLeaves()
  const { data: leaveTypes } = useLeaveTypes()
  const createLeave = useCreateLeave()

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const { data: allowances } = useAllowanceSummary()

  const [modalVisible, setModalVisible] = useState(false)

  // Datumsauswahl
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [openEnded, setOpenEnded] = useState(false)

  // Halbtag
  const [halfDay, setHalfDay] = useState(false)
  const [halfDayPart, setHalfDayPart] = useState<'beggining_of_day' | 'end_of_day'>('beggining_of_day')

  // Typ & Notiz
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [typeOpen, setTypeOpen] = useState(false)
  const [description, setDescription] = useState('')

  const typeMap = Object.fromEntries(
    (leaveTypes ?? []).map((t) => [t.id, t.translated_name || t.name])
  )

  const selectedType = (leaveTypes ?? []).find((t) => t.id === selectedTypeId)
  const supportsHalfDay = selectedType?.half_days_units_enabled === true
  const showHalfDay = supportsHalfDay && !!startDate && !endDate && !openEnded

  const availableYears = [
    ...new Set((leaves ?? []).map((l) => parseInt(l.start_on.slice(0, 4)))),
  ].sort((a, b) => b - a)
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear)

  const filteredLeaves = [...(leaves ?? [])]
    .filter((l) => l.start_on.startsWith(String(selectedYear)))
    .sort((a, b) => b.start_on.localeCompare(a.start_on))

  // Bereits beantragte Tage als disabled
  const disabledDateSet = useMemo(() => {
    const set = new Set<string>()
    for (const leave of leaves ?? []) {
      if (leave.deleted_at != null) continue
      const cursor = new Date(leave.start_on + 'T00:00:00')
      const last = new Date((leave.finish_on ?? leave.start_on) + 'T00:00:00')
      while (cursor <= last) {
        set.add(toDateStr(cursor))
        cursor.setDate(cursor.getDate() + 1)
      }
    }
    return set
  }, [leaves])

  // Kalender-Markierungen
  const calendarMarked = useMemo(() => {
    const result: Record<string, any> = {}
    for (const d of disabledDateSet) {
      result[d] = { disabled: true, disableTouchEvent: true }
    }
    if (!startDate) return result

    const effectiveEnd = openEnded ? '' : endDate
    const hasRange = !!effectiveEnd && effectiveEnd > startDate

    if (!hasRange) {
      if (!disabledDateSet.has(startDate))
        result[startDate] = { startingDay: true, endingDay: true, color: '#2563EB', textColor: 'white' }
      return result
    }

    if (!disabledDateSet.has(startDate))
      result[startDate] = { startingDay: true, color: '#2563EB', textColor: 'white' }
    if (!disabledDateSet.has(effectiveEnd))
      result[effectiveEnd] = { endingDay: true, color: '#2563EB', textColor: 'white' }

    const cursor = new Date(startDate + 'T00:00:00')
    cursor.setDate(cursor.getDate() + 1)
    const last = new Date(effectiveEnd + 'T00:00:00')
    while (cursor < last) {
      const d = toDateStr(cursor)
      if (!disabledDateSet.has(d)) result[d] = { color: '#BFDBFE', textColor: '#1D4ED8' }
      cursor.setDate(cursor.getDate() + 1)
    }
    return result
  }, [disabledDateSet, startDate, endDate, openEnded])

  const selectionHint = !startDate
    ? 'Startdatum antippen'
    : openEnded
      ? `Ab ${fmtDate(startDate)} · kein Enddatum`
      : !endDate
        ? 'Jetzt Enddatum antippen (oder gleicher Tag = ein Tag)'
        : `${fmtDate(startDate)} – ${fmtDate(endDate)}`

  const handleDayPress = (day: { dateString: string }) => {
    const d = day.dateString
    if (disabledDateSet.has(d)) return

    if (openEnded) {
      setStartDate(d)
      setEndDate('')
      return
    }

    if (!startDate || (startDate && endDate)) {
      setStartDate(d)
      setEndDate('')
    } else {
      if (d < startDate) {
        setStartDate(d)
        setEndDate('')
      } else if (d === startDate) {
        // Gleicher Tag = einzelner Tag, keine Aktion nötig
      } else {
        setEndDate(d)
      }
    }
  }

  const handleTypeSelect = (type: LeaveType) => {
    setSelectedTypeId(type.id)
    setTypeOpen(false)
    // Auto-Toggle für endlose Typen
    if (type.allow_endless) {
      setOpenEnded(true)
      setEndDate('')
    } else {
      setOpenEnded(false)
    }
    setHalfDay(false)
  }

  const resetForm = () => {
    setStartDate('')
    setEndDate('')
    setOpenEnded(false)
    setHalfDay(false)
    setHalfDayPart('beggining_of_day')
    setDescription('')
    setSelectedTypeId(null)
    setTypeOpen(false)
  }

  const handleSubmit = () => {
    if (!startDate) {
      Alert.alert('Kein Datum', 'Bitte wähle ein Datum aus.')
      return
    }
    createLeave.mutate(
      {
        start_on: startDate,
        finish_on: !openEnded && endDate && endDate !== startDate ? endDate : undefined,
        leave_type_id: selectedTypeId ?? undefined,
        description: description || undefined,
        half_day: halfDay ? halfDayPart : undefined,
      },
      {
        onSuccess: () => { setModalVisible(false); resetForm() },
        onError: () => Alert.alert('Fehler', 'Abwesenheit konnte nicht eingereicht werden.'),
      }
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.heading}>Abwesenheiten</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Neu</Text>
        </TouchableOpacity>
      </View>

      {/* Guthaben-Übersicht */}
      {allowances && allowances.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.balanceScroll}
          contentContainerStyle={styles.balanceScrollContent}
        >
          {allowances.map((a) => {
            const pct = a.total > 0 ? Math.min(a.used / a.total, 1) : 0
            const unit = a.unit === 'hours' ? 'Std.' : 'Tage'
            const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
            return (
              <View key={a.allowance_id} style={styles.balanceCard}>
                <Text style={styles.balanceName}>{a.name}</Text>
                <Text style={styles.balanceHighlight}>
                  {fmt(a.available)}<Text style={styles.balanceUnit}> {unit}</Text>
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { flex: pct }]} />
                  <View style={{ flex: 1 - pct }} />
                </View>
                <Text style={styles.balanceUsed}>{fmt(a.used)} von {fmt(a.total)} verbraucht</Text>
              </View>
            )
          })}
        </ScrollView>
      )}

      {/* Jahr-Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.yearScroll}
        contentContainerStyle={styles.yearScrollContent}
        alwaysBounceVertical={false}
      >
        {availableYears.map((year) => (
          <TouchableOpacity
            key={year}
            style={[styles.yearChip, selectedYear === year && styles.yearChipActive]}
            onPress={() => setSelectedYear(year)}
          >
            <Text style={[styles.yearChipText, selectedYear === year && styles.yearChipTextActive]}>
              {year}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {filteredLeaves.length === 0 ? (
            <Text style={styles.empty}>Keine Abwesenheiten in {selectedYear}</Text>
          ) : (
            filteredLeaves.map((leave) => (
              <LeaveCard
                key={leave.id}
                leave={leave}
                typeName={typeMap[leave.leave_type_id!] ?? 'Sonstige'}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* Formular-Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Neue Abwesenheit</Text>
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm() }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Typ-Dropdown (zuerst, damit Kalender-Verhalten klar ist) */}
            {leaveTypes && leaveTypes.length > 0 && (
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Typ</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setTypeOpen((v) => !v)}
                >
                  <Text style={[styles.dropdownButtonText, !selectedTypeId && styles.placeholder]}>
                    {selectedTypeId ? typeMap[selectedTypeId] : 'Typ wählen…'}
                  </Text>
                  <Text style={styles.dropdownArrow}>{typeOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {typeOpen && (
                  <View style={styles.dropdownList}>
                    {leaveTypes.filter((t) => t.active).map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.dropdownItem,
                          selectedTypeId === type.id && styles.dropdownItemActive,
                        ]}
                        onPress={() => handleTypeSelect(type)}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          selectedTypeId === type.id && styles.dropdownItemTextActive,
                        ]}>
                          {type.translated_name || type.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Kalender */}
            <Calendar
              markingType="period"
              markedDates={calendarMarked}
              onDayPress={handleDayPress}
              initialDate={startDate || toDateStr(new Date())}
              theme={{
                todayTextColor: '#2563EB',
                arrowColor: '#2563EB',
                textDisabledColor: '#D1D5DB',
                selectedDayBackgroundColor: '#2563EB',
                monthTextColor: '#111827',
                textMonthFontWeight: '600',
                calendarBackground: '#fff',
              }}
              style={styles.calendar}
            />

            {/* Hinweis */}
            <View style={styles.selectionInfo}>
              <Text style={[styles.selectionHint, startDate ? styles.selectionHintActive : null]}>
                {selectionHint}
              </Text>
            </View>

            {/* Kein Enddatum Toggle — nur wenn der gewählte Typ es erlaubt */}
            {selectedType?.allow_endless === true && (
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Text style={styles.toggleTitle}>Kein Enddatum</Text>
                  <Text style={styles.toggleSub}>Enddatum noch nicht bekannt</Text>
                </View>
                <Switch
                  value={openEnded}
                  onValueChange={(v) => {
                    setOpenEnded(v)
                    if (v) setEndDate('')
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                  thumbColor={openEnded ? '#2563EB' : '#fff'}
                />
              </View>
            )}

            {/* Halbtag — nur wenn Typ es unterstützt und ein einzelner Tag ausgewählt */}
            {showHalfDay && (
              <View style={styles.section}>
                <View style={styles.toggleRow}>
                  <View style={styles.toggleLabel}>
                    <Text style={styles.toggleTitle}>Halber Tag</Text>
                  </View>
                  <Switch
                    value={halfDay}
                    onValueChange={setHalfDay}
                    trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                    thumbColor={halfDay ? '#2563EB' : '#fff'}
                  />
                </View>
                {halfDay && (
                  <View style={styles.segmentRow}>
                    <TouchableOpacity
                      style={[styles.segment, halfDayPart === 'beggining_of_day' && styles.segmentActive]}
                      onPress={() => setHalfDayPart('beggining_of_day')}
                    >
                      <Text style={[styles.segmentText, halfDayPart === 'beggining_of_day' && styles.segmentTextActive]}>
                        Vormittag
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segment, halfDayPart === 'end_of_day' && styles.segmentActive]}
                      onPress={() => setHalfDayPart('end_of_day')}
                    >
                      <Text style={[styles.segmentText, halfDayPart === 'end_of_day' && styles.segmentTextActive]}>
                        Nachmittag
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Notiz */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Notiz</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional…"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, createLeave.isPending && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={createLeave.isPending}
            >
              {createLeave.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Einreichen</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  addBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  balanceScroll: {
    flexShrink: 0,
    flexGrow: 0,
    marginBottom: 16,
  },
  balanceScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    width: 175,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  balanceName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  balanceHighlight: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  balanceUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6B7280',
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    marginBottom: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: '#2563EB',
  },
  balanceUsed: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  yearScroll: {
    flexShrink: 0,
    flexGrow: 0,
    marginBottom: 12,
  },
  yearScrollContent: {
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  yearChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#D1D5DB',
    marginTop: 60,
    fontSize: 15,
  },
  leaveCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  leaveType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  leaveDates: {
    fontSize: 13,
    color: '#6B7280',
  },
  leaveDesc: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modal: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeBtn: {
    fontSize: 18,
    color: '#9CA3AF',
    padding: 4,
  },
  calendar: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  selectionInfo: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  selectionHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  selectionHintActive: {
    color: '#1D4ED8',
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleLabel: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  toggleSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  section: {
    marginBottom: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
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
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  dropdownButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  placeholder: {
    color: '#9CA3AF',
  },
  dropdownArrow: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 8,
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#EFF6FF',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#111827',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
})
