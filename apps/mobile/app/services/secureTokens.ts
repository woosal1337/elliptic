import * as SecureStore from "expo-secure-store"

import { loadString, remove, trim } from "@/utils/storage"

/**
 * Auth tokens live in the Keychain, not in the plaintext MMKV instance (E3).
 *
 * SecureStore is async, but the API client refreshes on a 401 from a synchronous
 * callback, so the values are also mirrored in memory for the lifetime of the
 * process. `hydrate()` fills that mirror at startup (and migrates tokens written
 * by builds before this change).
 */

const ACCESS_KEY = "auth.accessToken"
const REFRESH_KEY = "auth.refreshToken"

// Tokens are for this device only and must not travel to a restored backup.
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

export interface AuthTokenPair {
  access?: string
  refresh?: string
}

let mirror: AuthTokenPair = {}

/** The current tokens, readable synchronously (empty until `hydrate` resolves). */
export function currentTokens(): AuthTokenPair {
  return mirror
}

async function write(key: string, value?: string): Promise<void> {
  try {
    if (value) await SecureStore.setItemAsync(key, value, OPTIONS)
    else await SecureStore.deleteItemAsync(key, OPTIONS)
  } catch {
    // A Keychain write can fail on a locked device; the in-memory mirror still
    // carries the session, so the user isn't signed out mid-use.
  }
}

/** Move any tokens left in plaintext MMKV by an older build into the Keychain. */
async function migrateLegacyTokens(): Promise<void> {
  const legacyAccess = loadString(ACCESS_KEY)
  const legacyRefresh = loadString(REFRESH_KEY)
  if (!legacyAccess && !legacyRefresh) return
  await Promise.all([
    legacyAccess ? write(ACCESS_KEY, legacyAccess) : Promise.resolve(),
    legacyRefresh ? write(REFRESH_KEY, legacyRefresh) : Promise.resolve(),
  ])
  remove(ACCESS_KEY)
  remove(REFRESH_KEY)
}

/** Load tokens into the in-memory mirror. Call once, before rendering the app. */
export async function hydrateTokens(): Promise<AuthTokenPair> {
  await migrateLegacyTokens()
  // Deleting an MMKV key leaves its bytes in the file; compact so no plaintext
  // token survives the move to the Keychain.
  trim()
  try {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_KEY, OPTIONS),
      SecureStore.getItemAsync(REFRESH_KEY, OPTIONS),
    ])
    mirror = { access: access ?? undefined, refresh: refresh ?? undefined }
  } catch {
    mirror = {}
  }
  return mirror
}

/**
 * Persist (or clear, when a value is undefined) both tokens. The mirror updates
 * synchronously; the returned promise resolves once the Keychain agrees.
 */
export function setTokens(next: AuthTokenPair): Promise<void> {
  mirror = next
  return Promise.all([write(ACCESS_KEY, next.access), write(REFRESH_KEY, next.refresh)]).then(
    () => undefined,
  )
}
