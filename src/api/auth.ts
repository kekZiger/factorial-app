import axios from 'axios'
import { FACTORIAL_CONFIG } from '../config'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

// Tauscht den Authorization Code (nach OAuth-Login) gegen Access + Refresh Token
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await axios.post(FACTORIAL_CONFIG.tokenEndpoint, {
    grant_type: 'authorization_code',
    client_id: FACTORIAL_CONFIG.clientId,
    client_secret: FACTORIAL_CONFIG.clientSecret,
    code,
    redirect_uri: redirectUri,
  })
  return response.data
}

// Lädt die employee_id des eingeloggten Nutzers
export async function fetchCurrentEmployeeId(accessToken: string): Promise<number> {
  const response = await axios.get(
    'https://api.factorialhr.com/api/2026-04-01/resources/api_public/credentials',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  // Die API gibt ein Array zurück — wir nehmen den ersten Eintrag
  const data = response.data?.data ?? response.data
  const entry = Array.isArray(data) ? data[0] : data
  const employeeId = entry?.employee_id ?? entry?.id
  if (!employeeId) throw new Error('employee_id nicht gefunden in API-Antwort')
  return employeeId
}
