export type ClockState = 'clocked_out' | 'clocked_in' | 'on_break'

export type LocationType = 'office' | 'work_from_home' | 'business_trip'

export interface Shift {
  id: number
  employee_id: number
  date: string
  clock_in: string | null
  clock_out: string | null
  clock_in_with_seconds: string | null  // "HH:MM:SS" — für laufenden Shift
  workable: boolean                     // true = Arbeitszeit, false = Pause
  minutes: number                       // Factorial-seitig berechnete Minuten (für abgeschlossene Shifts)
}

export interface Leave {
  id: number
  employee_id: number
  start_on: string
  finish_on: string | null
  leave_type_id: number | null
  description: string | null
  approved: boolean
  deleted_at: string | null
}

export interface LeaveType {
  id: number
  name: string
  translated_name: string
  color: string              // Hex ohne #, z.B. "07A2AD"
  workable: boolean          // true = Homeoffice (kein echter Ausfall)
  active: boolean                    // false = archiviert, nicht mehr verwendbar
  allow_endless: boolean             // kein Enddatum erforderlich (Krankheit, Elternzeit…)
  half_days_units_enabled: boolean   // Halbtag-Beantragung möglich
}

