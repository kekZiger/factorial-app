# Factorial Companion App

Eine React Native (Expo) App für die [Factorial HR](https://factorialhr.com) API. Ermöglicht Zeiterfassung, Stundenübersicht und Abwesenheitsverwaltung direkt vom Smartphone.

> **Hinweis:** Diese App und der zugehörige Code wurden mit Unterstützung von [Claude](https://claude.ai) (Anthropic) entwickelt.

---

## Features

- **Stempeluhr** — Ein-/Ausstempeln, Pause starten/beenden, Standort wählen (Büro, Homeoffice, Dienstreise)
- **Stundenübersicht** — Wöchentliche und monatliche Ansicht, Soll/Ist-Vergleich, Feiertage, Abwesenheiten
- **Abwesenheiten** — Urlaubsanträge stellen, Halbtage, offene Abwesenheiten (Krankheit), Kontingent-Übersicht
- **Benachrichtigungen** — Pause-Erinnerung nach konfigurierbarer Arbeitszeit, dauerhafte Status-Notification
- **Einstellungen** — Notification-Präferenzen, Abmelden

---

## Voraussetzungen

- [Node.js](https://nodejs.org) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- Ein Factorial HR Konto mit Admin-Zugang zum Erstellen einer OAuth2-App

---

## Setup

### 1. Repository klonen

```bash
git clone <repo-url>
cd factorial-app
npm install --legacy-peer-deps
```

### 2. Factorial OAuth2-App erstellen

1. Factorial öffnen → **Einstellungen → Integrationen → API → OAuth2-Anwendungen**
2. Neue App anlegen
3. Redirect URI eintragen: `factorialapp://oauth/callback` (für die App) und `exp://localhost:8081/--/oauth/callback` (für Expo Go)
4. Scopes aktivieren: `time_tracking`, `time_off`, `employees`, `contracts`, `company_holidays`
5. Client ID und Client Secret notieren

### 3. Konfiguration

```bash
cp src/config.example.ts src/config.ts
```

`src/config.ts` öffnen und `clientId` sowie `clientSecret` eintragen:

```typescript
export const FACTORIAL_CONFIG = {
  clientId: 'DEINE_CLIENT_ID',
  clientSecret: 'DEIN_CLIENT_SECRET',
  // ...
}
```

> `src/config.ts` ist in `.gitignore` eingetragen und wird **nicht** ins Repository eingecheckt.

### 4. App starten

```bash
npx expo start
```

---

## Build (Android APK)

Die App wird über [EAS Build](https://docs.expo.dev/build/introduction/) gebaut:

```bash
npm install -g eas-cli
eas login
eas build --profile preview --platform android
```

Der Build läuft in der Cloud. Nach Abschluss erhältst du einen Download-Link für eine APK, die direkt auf Android-Geräten installiert werden kann.

---

## Projektstruktur

```
app/
  (auth)/         # Login-Screen
  (tabs)/         # Haupt-Tabs: Stempel, Stunden, Abwesenheit, Einstellungen
src/
  api/            # Factorial API Aufrufe
  hooks/          # React Query Hooks
  store/          # Zustand Stores (Auth, Settings)
  types/          # TypeScript Interfaces
  utils/          # Hilfsfunktionen (Notifications, Datum)
  config.ts       # OAuth-Konfiguration (nicht im Repo)
  config.example.ts  # Vorlage für config.ts
```

---

## Technologien

- [Expo SDK 54](https://docs.expo.dev/) / React Native 0.81
- [Expo Router](https://expo.github.io/router/) — Dateibasiertes Routing
- [TanStack Query](https://tanstack.com/query) — Datenfetching & Caching
- [Zustand](https://zustand-demo.pmnd.rs/) — State Management
- [react-native-calendars](https://github.com/wix/react-native-calendars) — Kalender-Komponente
- [expo-notifications](https://docs.expo.dev/push-notifications/overview/) — Lokale Benachrichtigungen
