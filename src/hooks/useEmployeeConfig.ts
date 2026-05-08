import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { getEmployeeSummary, getContractVersions } from '../api/company'
import { DAILY_TARGET_HOURS } from '../config'

export interface EmployeeConfig {
  locationId: number | null
  weeklyHours: number
  dailyHours: number
}

export function useEmployeeConfig() {
  const employeeId = useAuthStore((s) => s.employeeId)

  return useQuery({
    queryKey: ['employeeConfig', employeeId],
    queryFn: async (): Promise<EmployeeConfig> => {
      const [employee, contracts] = await Promise.all([
        getEmployeeSummary(employeeId!).catch(() => null),
        getContractVersions(employeeId!).catch(() => []),
      ])

      const today = new Date().toISOString().split('T')[0]
      const active = [...contracts]
        .filter((c) => !c.starts_on || c.starts_on <= today)
        .sort((a, b) => (b.starts_on ?? '').localeCompare(a.starts_on ?? ''))[0]

      const weeklyHours =
        active?.working_week_hours ?? active?.weekly_hours ?? DAILY_TARGET_HOURS * 5

      return {
        locationId: employee?.location_id ?? null,
        weeklyHours,
        dailyHours: weeklyHours / 5,
      }
    },
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
    enabled: !!employeeId,
  })
}
