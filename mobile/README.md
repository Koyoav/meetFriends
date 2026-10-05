# KeepClose Mobile

Expo (React Native + TypeScript) app for iOS and Android. See
[`../DESIGN.md`](../DESIGN.md) for the product plan; this talks to the
backend in [`../backend`](../backend).

## Setup

```
npm install
cp .env.example .env   # point EXPO_PUBLIC_API_URL at your backend
npm start
```

- iOS simulator: `npm run ios`
- Android emulator: `npm run android` (use `http://10.0.2.2:8000` for the API URL)
- Web: `npm run web`

## Structure

- `src/api/` — thin fetch client (`client.ts`) with access-token refresh, plus
  one module per backend resource (`auth.ts` so far).
- `src/auth/` — token storage (`expo-secure-store`, falling back to
  `AsyncStorage` on web) and an `AuthProvider`/`useAuth()` context.
- `src/navigation/` — root navigator: an auth stack (login/signup) shown when
  signed out, an app stack shown when signed in.
- `src/screens/` — one screen per file.

## Status

Phase 1 (per `DESIGN.md`): login/signup are wired up end-to-end against
`/auth`. Friend list, add/edit friend, log-a-gathering, reminders, and
birthdays screens are next.
