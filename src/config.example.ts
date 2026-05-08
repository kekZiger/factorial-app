// Kopiere diese Datei zu src/config.ts und trage deine Zugangsdaten ein.
// Die echte config.ts ist in .gitignore und wird nicht ins Repository eingecheckt.
//
// Factorial > Einstellungen > Integrationen > API > OAuth2-Anwendungen

export const FACTORIAL_CONFIG = {
  clientId: 'DEINE_CLIENT_ID',
  clientSecret: 'DEIN_CLIENT_SECRET',
  authorizationEndpoint: 'https://api.factorialhr.com/oauth/authorize',
  tokenEndpoint: 'https://api.factorialhr.com/oauth/token',
  scopes: ['time_tracking', 'time_off', 'employees', 'contracts', 'company_holidays'],
} as const

/** Tägliche Sollarbeitszeit in Stunden (Fallback falls kein Vertrag hinterlegt) */
export const DAILY_TARGET_HOURS = 8
