import { apiClient } from './client'
import { Shift, LocationType } from '../types'

const BASE = '/api/2026-04-01/resources/attendance'

export async function getTodayShifts(employeeId: number): Promise<Shift[]> {
  const today = new Date().toISOString().split('T')[0]
  const response = await apiClient.get(`${BASE}/shifts`, {
    params: {
      'employee_ids[]': employeeId,
      start_on: today,
      end_on: today,
    },
  })
  const shifts: Shift[] = response.data?.data ?? response.data
  return shifts
}

export async function getShifts(
  employeeId: number,
  startOn: string,
  endOn: string
): Promise<Shift[]> {
  const response = await apiClient.get(`${BASE}/shifts`, {
    params: {
      'employee_ids[]': employeeId,
      start_on: startOn,
      end_on: endOn,
    },
  })
  return response.data?.data ?? response.data
}

/** Lokalzeit ohne Z-Suffix, z.B. "2026-05-08T10:25:46.149" */
function localISOString(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, -1)
}

export async function toggleClock(
  employeeId: number,
  locationType: LocationType
): Promise<Shift> {
  const clock_time = localISOString()
  console.log('[toggleClock] sending clock_time:', clock_time)
  const response = await apiClient.post(`${BASE}/shifts/toggle_clock`, {
    employee_id: employeeId,
    clock_time,
    location_type: locationType,
  })
  return response.data
}

export async function startBreak(employeeId: number): Promise<Shift> {
  const now = localISOString()
  console.log('[startBreak] sending now:', now)
  const response = await apiClient.post(`${BASE}/shifts/break_start`, {
    now,
    employee_id: employeeId,
  })
  return response.data
}

export async function endBreak(employeeId: number): Promise<Shift> {
  const now = localISOString()
  console.log('[endBreak] sending now:', now)
  const response = await apiClient.post(`${BASE}/shifts/break_end`, {
    now,
    employee_id: employeeId,
  })
  return response.data
}
