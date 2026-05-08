import { apiClient } from './client'
import { Leave, LeaveType } from '../types'

const BASE = '/api/2026-04-01/resources/timeoff'

export async function getLeaves(
  employeeId: number,
  startOn?: string,
  endOn?: string
): Promise<Leave[]> {
  const all: Leave[] = []
  let page = 1
  while (true) {
    const response = await apiClient.get(`${BASE}/leaves`, {
      params: {
        'employee_ids[]': employeeId,
        ...(startOn && { start_on: startOn }),
        ...(endOn && { end_on: endOn }),
        per_page: 100,
        page,
      },
    })
    const data: Leave[] = response.data?.data ?? response.data
    if (!Array.isArray(data) || data.length === 0) break
    all.push(...data)
    if (data.length < 100) break
    page++
  }
  return all
}

export async function getLeaveTypes(): Promise<LeaveType[]> {
  const response = await apiClient.get(`${BASE}/leave_types`)
  const data = response.data?.data ?? response.data
  return data
}

export interface CreateLeaveParams {
  employee_id: number
  start_on: string
  finish_on?: string
  leave_type_id?: number
  description?: string
  half_day?: 'beggining_of_day' | 'end_of_day'
}

export interface LeaveAllowance {
  id: number
  employee_id: number
  leave_type_id: number
  year: number
  [key: string]: unknown
}

export interface AllowancePolicy {
  id: number
  name: string
  leave_type_ids: number[]
  allowance_type: string   // "days" | "hours"
}

export interface AllowanceStat {
  allowance_id: number
  employee_id: number
  year: number
  available_days: string
  used_days: string
  total: string
}

export interface AllowanceSummary {
  allowance_id: number
  name: string
  unit: 'days' | 'hours'
  available: number
  used: number
  total: number
}

export async function getAllowancePolicies(): Promise<AllowancePolicy[]> {
  const response = await apiClient.get(`${BASE}/allowances`)
  const data = response.data?.data ?? response.data
  return Array.isArray(data) ? data : []
}

export async function getAllowanceStats(employeeId: number): Promise<AllowanceStat[]> {
  const today = new Date().toISOString().split('T')[0]
  const response = await apiClient.get(`${BASE}/allowance_stats`, {
    params: { 'employee_ids[]': employeeId, reference_date: today },
  })
  const data = response.data?.data ?? response.data
  return Array.isArray(data) ? data : []
}

export async function createLeave(params: CreateLeaveParams): Promise<Leave> {
  const response = await apiClient.post(`${BASE}/leaves`, params)
  return response.data
}
