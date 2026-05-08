import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTodayShifts, toggleClock, startBreak, endBreak } from '../api/shifts'
import { useAuthStore } from '../store/auth'
import { ClockState, LocationType, Shift } from '../types'
import { scheduleBreakReminder, cancelBreakReminder } from '../utils/notifications'
import { useSettingsStore } from '../store/settings'

// Der offene Shift ist derjenige ohne clock_out
export function getOpenShift(shifts: Shift[]): Shift | null {
  return shifts.find((s) => s.clock_out === null) ?? null
}

export function getClockState(shifts: Shift[]): ClockState {
  const open = getOpenShift(shifts)
  if (!open) return 'clocked_out'
  return open.workable ? 'clocked_in' : 'on_break'
}

export function useShiftStatus() {
  const employeeId = useAuthStore((s) => s.employeeId)
  const queryClient = useQueryClient()
  const breakReminderEnabled = useSettingsStore((s) => s.breakReminderEnabled)
  const breakReminderHours = useSettingsStore((s) => s.breakReminderHours)

  const query = useQuery({
    queryKey: ['shifts', 'today', employeeId],
    queryFn: () => getTodayShifts(employeeId!),
    enabled: !!employeeId,
    refetchInterval: 60_000,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['shifts', 'today', employeeId] })

  const toggleMutation = useMutation({
    mutationFn: (locationType: LocationType) => toggleClock(employeeId!, locationType),
    onMutate: () => {
      const current = queryClient.getQueryData<Shift[]>(['shifts', 'today', employeeId]) ?? []
      return { wasClocked: getClockState(current) === 'clocked_in' }
    },
    onSuccess: (_, __, context) => {
      if (context?.wasClocked) {
        cancelBreakReminder()
      } else if (breakReminderEnabled) {
        scheduleBreakReminder(new Date(), breakReminderHours)
      }
      invalidate()
    },
    onError: (e: any) => console.error('[toggle]', JSON.stringify(e?.response?.data)),
  })

  const breakStartMutation = useMutation({
    mutationFn: () => startBreak(employeeId!),
    onSuccess: () => { cancelBreakReminder(); invalidate() },
    onError: (e: any) => console.error('[breakStart]', JSON.stringify(e?.response?.data)),
  })

  const breakEndMutation = useMutation({
    mutationFn: () => endBreak(employeeId!),
    onSuccess: () => {
      if (breakReminderEnabled) scheduleBreakReminder(new Date(), breakReminderHours)
      invalidate()
    },
    onError: (e) => console.error('[breakEnd]', e),
  })

  const shifts = query.data ?? []

  return {
    shifts,
    openShift: getOpenShift(shifts),
    clockState: getClockState(shifts),
    isLoading: query.isLoading,
    isError: query.isError,
    toggle: toggleMutation.mutate,
    startBreak: breakStartMutation.mutate,
    endBreak: breakEndMutation.mutate,
    isActing:
      toggleMutation.isPending ||
      breakStartMutation.isPending ||
      breakEndMutation.isPending,
  }
}
