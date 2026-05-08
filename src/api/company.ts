import { apiClient } from './client'

export interface CompanyHoliday {
  id: number
  name: string
  date: string               // "YYYY-MM-DD"
  location_id: number | null
  half_day: boolean | null
}

export async function getCompanyHolidays(): Promise<CompanyHoliday[]> {
  const response = await apiClient.get('/api/2026-04-01/resources/holidays/company_holidays')
  const data = response.data?.data ?? response.data
  const list = Array.isArray(data) ? data : []
  // Factorial verwendet "summary" statt "name"
  return list.map((h: any) => ({
    id: h.id,
    name: h.summary ?? h.name ?? '',
    date: h.date,
    location_id: h.location_id ?? null,
    half_day: h.half_day ?? null,
  }))
}

export interface ContractVersion {
  id: number
  employee_id: number
  starts_on?: string | null
  working_week_hours?: number | null
  weekly_hours?: number | null
}

export async function getContractVersions(employeeId: number): Promise<ContractVersion[]> {
  const response = await apiClient.get('/api/2026-04-01/resources/contracts/contract_versions', {
    params: { 'employee_ids[]': employeeId },
  })
  const data = response.data?.data ?? response.data
  return Array.isArray(data) ? data : []
}

export interface EmployeeSummary {
  id: number
  location_id: number | null
}

export async function getEmployeeSummary(employeeId: number): Promise<EmployeeSummary | null> {
  const response = await apiClient.get('/api/2026-04-01/resources/employees/employees', {
    params: { 'employee_ids[]': employeeId },
  })
  const data = response.data?.data ?? response.data
  const list = Array.isArray(data) ? data : [data]
  return list.find((e: any) => e.id === employeeId) ?? list[0] ?? null
}
