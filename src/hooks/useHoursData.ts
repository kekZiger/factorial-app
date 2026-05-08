import { useQuery } from '@tanstack/react-query'
import { getShifts } from '../api/shifts'
import { getLeaves, getLeaveTypes } from '../api/leaves'
import { getCompanyHolidays } from '../api/company'
import { useAuthStore } from '../store/auth'
import { toDateStr } from '../utils/publicHolidays'
import { DAILY_TARGET_HOURS } from '../config'

export interface AbsenceInfo {
  typeName: string
  color: string
  status: string
}

export interface DayData {
  date: string
  workMs: number
  breakMs: number
  absence?: AbsenceInfo
  holidayName?: string
  isHalfDayHoliday?: boolean
}

export interface HoursData {
  days: DayData[]
  totalWorkMs: number
  totalBreakMs: number
  targetWorkMs: number
  deltaMs: number
}

export function useHoursData(
  start: string,
  end: string,
  locationId: number | null | undefined,
  dailyHours: number = DAILY_TARGET_HOURS
) {
  const employeeId = useAuthStore((s) => s.employeeId)

  return useQuery({
    queryKey: ['hours', employeeId, start, end, locationId, dailyHours],
    queryFn: async (): Promise<HoursData> => {
      const [shifts, leaves, leaveTypes, allHolidays] = await Promise.all([
        getShifts(employeeId!, start, end),
        getLeaves(employeeId!),
        getLeaveTypes(),
        getCompanyHolidays().catch((e) => { console.warn('[holidays] fetch failed:', e?.response?.status); return [] }),
      ])

      console.log('[hours] leaves:', leaves.length, '| holidays:', allHolidays.length, '| leaveTypes:', leaveTypes.length)
      if (leaves.length > 0) console.log('[hours] sample leave:', JSON.stringify(leaves[0]))
      if (allHolidays.length > 0) console.log('[hours] sample holiday:', JSON.stringify(allHolidays[0]))
      if (leaves.length === 0) console.warn('[hours] keine Leaves zurückgekommen!')

      // LeaveType-Map: id → { name, color, workable }
      const typeMap: Record<number, { name: string; color: string; workable: boolean }> = {}
      for (const t of leaveTypes) {
        typeMap[t.id] = {
          name: t.translated_name || t.name,
          color: '#' + t.color,
          workable: t.workable,
        }
      }

      // Abwesenheiten auf einzelne Tage expandieren
      const absenceByDate: Record<string, AbsenceInfo> = {}
      for (const leave of leaves) {
        if (leave.deleted_at != null) continue
        const typeInfo = leave.leave_type_id ? typeMap[leave.leave_type_id] : null
        if (typeInfo?.workable) continue
        const info: AbsenceInfo = {
          typeName: typeInfo?.name ?? 'Abwesend',
          color: typeInfo?.color ?? '#6B7280',
          status: leave.approved ? 'approved' : 'pending',
        }
        const cursor = new Date(leave.start_on + 'T00:00:00')
        const last = new Date((leave.finish_on ?? leave.start_on) + 'T00:00:00')
        while (cursor <= last) {
          absenceByDate[toDateStr(cursor)] = info
          cursor.setDate(cursor.getDate() + 1)
        }
      }

      console.log('[hours] absenceByDate keys:', Object.keys(absenceByDate))

      // Feiertage für diesen Standort filtern
      const holidayMap: Record<string, { name: string; halfDay: boolean }> = {}
      for (const h of allHolidays) {
        if (h.date < start || h.date > end) continue
        // Feiertag gilt, wenn kein Standort gesetzt ODER Standort passt
        if (h.location_id != null && locationId != null && h.location_id !== locationId) continue
        holidayMap[h.date] = { name: h.name, halfDay: !!h.half_day }
      }

      // Shift-Daten pro Tag aggregieren
      const byDate: Record<string, { workMs: number; breakMs: number }> = {}
      let totalWorkMs = 0
      let totalBreakMs = 0

      for (const shift of shifts) {
        if (shift.clock_out === null) continue
        const ms = shift.minutes * 60_000
        if (!byDate[shift.date]) byDate[shift.date] = { workMs: 0, breakMs: 0 }
        if (shift.workable) {
          byDate[shift.date].workMs += ms
          totalWorkMs += ms
        } else {
          byDate[shift.date].breakMs += ms
          totalBreakMs += ms
        }
      }

      // Alle Tage im Bereich zusammenführen
      const days: DayData[] = []
      const cursor = new Date(start + 'T00:00:00')
      const endDate = new Date(end + 'T00:00:00')
      while (cursor <= endDate) {
        const d = toDateStr(cursor)
        const holiday = holidayMap[d]
        days.push({
          date: d,
          workMs: byDate[d]?.workMs ?? 0,
          breakMs: byDate[d]?.breakMs ?? 0,
          absence: absenceByDate[d],
          holidayName: holiday?.name,
          isHalfDayHoliday: holiday?.halfDay,
        })
        cursor.setDate(cursor.getDate() + 1)
      }

      // Soll & Delta: nur abgeschlossene Tage vor heute.
      // Heute zählt weder in Soll noch in Ist der Differenz — der Tag ist noch nicht fertig.
      const todayStr = toDateStr(new Date())
      let targetWorkMs = 0
      let workMsCompleted = 0  // Ist-Zeit nur aus abgeschlossenen Tagen (für Delta)

      for (const day of days) {
        if (day.date >= todayStr) break           // heute und Zukunft ausschließen
        workMsCompleted += day.workMs
        const weekday = new Date(day.date + 'T00:00:00').getDay()
        if (weekday === 0 || weekday === 6) continue  // Wochenende
        if (day.absence) continue                     // Abwesenheit (Urlaub, Krank…)
        if (day.holidayName) {
          if (day.isHalfDayHoliday) {
            targetWorkMs += (dailyHours / 2) * 3_600_000  // halber Feiertag
          }
          continue                                    // ganzer Feiertag: 0 Soll
        }
        targetWorkMs += dailyHours * 3_600_000
      }

      return {
        days,
        totalWorkMs,
        totalBreakMs,
        targetWorkMs,
        deltaMs: workMsCompleted - targetWorkMs,
      }
    },
    enabled: !!employeeId,
  })
}

// --- Hilfsfunktionen für Datumsbereiche ---

function isoWeekNumber(date: Date): number {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const jan4 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
}

export function getWeekRange(offset: number): { start: string; end: string; label: string } {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const kw = isoWeekNumber(monday)
  const monthLabel = monday.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  return {
    start: toDateStr(monday),
    end: toDateStr(sunday),
    label: `KW ${kw} · ${monthLabel}`,
  }
}

export function getMonthRange(offset: number): { start: string; end: string; label: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0)
  return {
    start: toDateStr(first),
    end: toDateStr(last),
    label: first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
  }
}
