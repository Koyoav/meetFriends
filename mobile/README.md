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

## Building a standalone app (no Expo Go)

For anyone to install KeepClose like a normal app, two things need to exist:

1. **A real backend URL.** `EXPO_PUBLIC_API_URL` gets baked into the build at
   build time, so it must point at a backend reachable from the installer's
   phone over the internet — not `localhost` or a LAN IP on one machine.
   Deploying `../backend` (it already reads `DATABASE_URL`/`JWT_SECRET_KEY`
   from the environment, see its Dockerfile) to a host like Railway or
   Fly.io gives a stable `https://...` URL for this.
2. **A standalone build**, via [EAS Build](https://docs.expo.dev/build/introduction/)
   (free tier, run from an Expo account):
   ```
   npx eas-cli build -p android --profile preview --non-interactive
   ```
   This produces a downloadable `.apk` — anyone with an Android phone can
   install it directly (enable "install from unknown sources" when
   prompted) without Expo Go. `eas.json` defines the `preview` (APK) and
   `production` (Play Store `.aab`) profiles. Set
   `EXPO_PUBLIC_API_URL` as an EAS build-time env var (or in `eas.json`'s
   `build.preview.env`) so it points at the hosted backend from (1).

   An iOS build needs a paid Apple Developer account ($99/yr) and ad-hoc
   device registration, so it's out of scope until that's needed.

## Status

Phase 1 (per `DESIGN.md`): login/signup are wired up end-to-end against
`/auth`. Friend list, add/edit friend, log-a-gathering, reminders, and
birthdays screens are next.
