import { useState, useEffect } from 'react'
import { Shift, ClockState } from '../types'
import { getOpenShift, getClockState } from './useShiftStatus'
import { toDateStr } from '../utils/publicHolidays'
import { DAILY_TARGET_HOURS } from '../config'

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m 00s'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
  }
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function formatHM(ms: number): string {
  const abs = Math.abs(ms)
  const hours = Math.floor(abs / 3_600_000)
  const minutes = Math.floor((abs % 3_600_000) / 60_000)
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

// Factorial liefert Zeiten als "HH:MM" oder "HH:MM:SS" (ohne Datum, Lokalzeit)
function parseTimeMs(timeStr: string): number {
  return new Date(`${toDateStr(new Date())}T${timeStr}`).getTime()
}

function shiftDurationMs(shift: Shift, now: number): number {
  if (shift.clock_out !== null) return shift.minutes * 60_000
  const clockInStr = shift.clock_in_with_seconds ?? shift.clock_in
  if (!clockInStr) return 0
  return Math.max(0, now - parseTimeMs(clockInStr))
}

export function useShiftTimer(shifts: Shift[], dailyHours: number = DAILY_TARGET_HOURS) {
  const TARGET_MS = dailyHours * 3_600_000
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const clockState: ClockState = getClockState(shifts)
  const openShift = getOpenShift(shifts)

  if (shifts.length === 0) {
    return {
      clockState,
      clockInTime: null,
      workDuration: null,
      totalBreakDuration: '0m 00s',
      currentBreakDuration: null,
      remainingMs: TARGET_MS,
      remainingFormatted: formatHM(TARGET_MS),
      endTimeStr: null,
      isOvertime: false,
    }
  }

  let totalWorkMs = 0
  let totalBreakMs = 0
  for (const shift of shifts) {
    const ms = shiftDurationMs(shift, now)
    if (shift.workable) totalWorkMs += ms
    else totalBreakMs += ms
  }

  const currentBreakMs =
    openShift && !openShift.workable ? shiftDurationMs(openShift, now) : 0

  const firstWorkShift = shifts.find((s) => s.workable && s.clock_in)
  const clockInTime = firstWorkShift?.clock_in
    ? new Date(parseTimeMs(firstWorkShift.clock_in)).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  const remainingMs = TARGET_MS - totalWorkMs
  const isOvertime = remainingMs < 0
  // Feierabendzeit: jetzt + verbleibende Arbeitszeit (live, pausiert während Pausen)
  const endTimeStr = new Date(now + Math.max(0, remainingMs)).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return {
    clockState,
    clockInTime,
    workDuration: formatDuration(totalWorkMs),
    totalBreakDuration: formatDuration(totalBreakMs),
    currentBreakDuration: currentBreakMs > 0 ? formatDuration(currentBreakMs) : null,
    remainingMs,
    remainingFormatted: formatHM(Math.abs(remainingMs)),
    endTimeStr,
    isOvertime,
  }
}
