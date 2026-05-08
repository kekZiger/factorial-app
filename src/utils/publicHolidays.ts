/** Lokales Datum als YYYY-MM-DD ohne UTC-Konvertierung */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Bundesweite Feiertage für ein Jahr als { date → name } Map */
export function getPublicHolidayMap(start: string, end: string): Record<string, string> {
  const startYear = parseInt(start.slice(0, 4))
  const endYear = parseInt(end.slice(0, 4))
  const map: Record<string, string> = {}

  for (let year = startYear; year <= endYear; year++) {
    const easter = easterSunday(year)
    const holidays: [string, string][] = [
      [`${year}-01-01`, 'Neujahr'],
      [toDateStr(addDays(easter, -2)), 'Karfreitag'],
      [toDateStr(addDays(easter, 1)), 'Ostermontag'],
      [`${year}-05-01`, 'Tag der Arbeit'],
      [toDateStr(addDays(easter, 39)), 'Christi Himmelfahrt'],
      [toDateStr(addDays(easter, 50)), 'Pfingstmontag'],
      [`${year}-10-03`, 'Tag der deutschen Einheit'],
      [`${year}-12-25`, '1. Weihnachtstag'],
      [`${year}-12-26`, '2. Weihnachtstag'],
    ]
    for (const [date, name] of holidays) {
      if (date >= start && date <= end) map[date] = name
    }
  }

  return map
}
