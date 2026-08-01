# Elliptic Mobile

The Elliptic iOS/Android app — React Native + Expo, scaffolded from
[Ignite](https://github.com/infinitered/ignite) and stripped to our own foundation.

## Stack
- Expo (CNG) + React Native, TypeScript (strict)
- React Navigation (native stack + bottom tabs)
- apisauce API client against `api.elliptic.sh` (native **token** auth — Bearer access/refresh)
- Auth tokens in the Keychain (expo-secure-store); MMKV for cached lists and preferences
- TanStack Query (MMKV-persisted) for list data, themed component library (`app/components`, `app/theme`)

## Structure
```
app/
  components/   reusable UI (Button, Text, Card, TextField, Screen, …)
  context/      AuthContext (token login/logout)
  navigators/   AppNavigator (auth gate) + MainNavigator (bottom tabs)
  screens/      Login, Home, Tasks, Profile
  services/api/ Elliptic API client (login, me, orgs, …)
  theme/        colors, spacing, typography tokens
  config/       API_URL per environment
```

## Run (this Ubuntu box: Android + web; iOS later on macOS)
```bash
npm install
npm run start            # Expo dev server
npm run android          # Android emulator/device
npm run web              # web preview
# iOS (on a Mac): npm run ios
```
Point at a local API for development: edit `app/config/config.dev.ts` → `API_URL`.

## Signing in

Email + password, plus **Continue with Google / GitHub** for whichever providers
the instance has configured (`GET /auth/providers` decides what the screen
offers, same as web).

The social flow is native, not the web one: the app opens the provider in an
in-app browser, the **API** completes the exchange and deep links back into
`companyos://auth/callback` with a short-lived handoff code, and the app trades
that code — plus a verifier only it holds — for tokens. Tokens never travel in
the redirect, so another app claiming the scheme gains nothing.

That means each provider needs one extra authorized redirect URI, pointing at
the API rather than the web app:

```
https://<api-host>/api/v1/auth/oauth/google/native/callback
```

`NATIVE_APP_SCHEME` (API side) defaults to `companyos` and only needs setting if
the app's URL scheme changes.

## Status
Foundation is in place: token auth + navigation shell + first screens (Login → tabs;
Home lists your workspaces from the live API). Feature screens (tasks, intake, notes,
comments, AI chat, push, offline) map to board tasks COS-191/201/203/211/217/222/232/234/244.

> One leftover: Ignite's demo i18n strings remain in `app/i18n/*` (unused); trim when convenient.
