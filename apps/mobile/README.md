# CompanyOS Mobile

The CompanyOS iOS/Android app — React Native + Expo, scaffolded from
[Ignite](https://github.com/infinitered/ignite) and stripped to our own foundation.

## Stack
- Expo (CNG) + React Native, TypeScript (strict)
- React Navigation (native stack + bottom tabs)
- apisauce API client against `api-company.chele.bi` (native **token** auth — Bearer access/refresh)
- MMKV for session storage, themed component library (`app/components`, `app/theme`)

## Structure
```
app/
  components/   reusable UI (Button, Text, Card, TextField, Screen, …)
  context/      AuthContext (token login/logout)
  navigators/   AppNavigator (auth gate) + MainNavigator (bottom tabs)
  screens/      Login, Home, Tasks, Profile
  services/api/ CompanyOS API client (login, me, orgs, …)
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

## Status
Foundation is in place: token auth + navigation shell + first screens (Login → tabs;
Home lists your workspaces from the live API). Feature screens (tasks, intake, notes,
comments, AI chat, push, offline) map to board tasks COS-191/201/203/211/217/222/232/234/244.

> One leftover: Ignite's demo i18n strings remain in `app/i18n/*` (unused); trim when convenient.
