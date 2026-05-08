import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeaves, getLeaveTypes, createLeave, getAllowanceStats, getAllowancePolicies, AllowanceSummary, CreateLeaveParams } from '../api/leaves'
import { useAuthStore } from '../store/auth'

export function useLeaves() {
  const employeeId = useAuthStore((s) => s.employeeId)
  return useQuery({
    queryKey: ['leaves', employeeId],
    queryFn: () => getLeaves(employeeId!),
    enabled: !!employeeId,
  })
}

export function useLeaveTypes() {
  return useQuery({
    queryKey: ['leave_types'],
    queryFn: getLeaveTypes,
    staleTime: 1000 * 60 * 60,
  })
}

export function useAllowanceSummary() {
  const employeeId = useAuthStore((s) => s.employeeId)
  return useQuery<AllowanceSummary[]>({
    queryKey: ['allowance_summary', employeeId],
    queryFn: async () => {
      const [stats, policies] = await Promise.all([
        getAllowanceStats(employeeId!),
        getAllowancePolicies(),
      ])
      const policyMap = Object.fromEntries(policies.map((p) => [p.id, p.name]))
      return stats
        .filter((s) => parseFloat(s.total) > 0)
        .map((s) => {
          const policy = policies.find((p) => p.id === s.allowance_id)
          return {
            allowance_id: s.allowance_id,
            name: policy?.name ?? `Kontingent ${s.allowance_id}`,
            unit: (policy?.allowance_type === 'hours' ? 'hours' : 'days') as 'days' | 'hours',
            available: parseFloat(s.available_days) || 0,
            used: parseFloat(s.used_days) || 0,
            total: parseFloat(s.total) || 0,
          }
        })
    },
    enabled: !!employeeId,
    staleTime: 1000 * 60 * 60 * 2,
    gcTime: 1000 * 60 * 60 * 4,
  })
}

export function useCreateLeave() {
  const queryClient = useQueryClient()
  const employeeId = useAuthStore((s) => s.employeeId)
  return useMutation({
    mutationFn: (params: Omit<CreateLeaveParams, 'employee_id'>) =>
      createLeave({ ...params, employee_id: employeeId! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leaves'] }),
  })
}
