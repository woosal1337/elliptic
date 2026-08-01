import * as Crypto from "expo-crypto"
import * as WebBrowser from "expo-web-browser"

import { api } from "@/services/api"
import type { AuthTokens, User } from "@/services/api/types"

/**
 * Social sign-in from the app (COS-209).
 *
 * The provider redirects back to the API, which finishes the exchange and deep
 * links into the app with a short-lived handoff code — never the tokens
 * themselves, since another app could claim the `companyos://` scheme. The code
 * is bound to a verifier this device generates, so only the app that started
 * the flow can redeem it.
 */

export type SocialProvider = "google" | "github"

/** Where the API sends the browser when the round-trip is done. */
const REDIRECT_URL = "companyos://auth/callback"

function randomVerifier(): string {
  const bytes = Crypto.getRandomBytes(32)
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  })
  // The API compares against base64url without padding.
  return digest.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/** A handoff code is a JWT: three dot-separated segments. */
export function looksLikeHandoffCode(code: string): boolean {
  return code.split(".").length === 3
}

export function parseQuery(url: string): Record<string, string> {
  const query = url.split("?")[1]
  if (!query) return {}
  return Object.fromEntries(
    query
      .split("&")
      .filter(Boolean)
      .map((pair) => {
        const [key, value = ""] = pair.split("=")
        return [decodeURIComponent(key), decodeURIComponent(value)]
      }),
  )
}

export type SocialResult =
  | { user: User; tokens: AuthTokens }
  | { error: string }
  | { cancelled: true }

export async function signInWithProvider(provider: SocialProvider): Promise<SocialResult> {
  const verifier = randomVerifier()
  const authUrl = await api.oauthAuthorizationUrl(provider, await challengeFor(verifier))
  if (!authUrl) return { error: "Sign-in is unavailable right now." }

  // The session is shared with Safari on purpose: most people are already
  // signed into Google there, which turns this into a single tap. iOS asks for
  // consent before sharing, and an ephemeral session would mean retyping a
  // Google password on a phone keyboard every time.
  const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URL)
  if (result.type !== "success") return { cancelled: true }

  // React Native's URL doesn't reliably expose searchParams, so read the query
  // off the redirect directly.
  const params = parseQuery(result.url)
  if (params.error) return { error: "That sign-in didn't go through." }
  if (!params.code) return { error: "That sign-in didn't go through." }

  // The redirect should carry *our* handoff code. Anything else means the
  // browser handed back the provider's callback instead of the app's, which is
  // worth naming rather than letting the API reject an opaque string.
  if (!looksLikeHandoffCode(params.code)) {
    // eslint-disable-next-line no-console
    console.warn(
      `[oauth] unexpected callback: scheme=${result.url.split(":")[0]} params=${Object.keys(params).join(",")} codeSegments=${params.code.split(".").length}`,
    )
    return { error: "That sign-in didn't go through." }
  }

  return api.exchangeOAuthCode(params.code, verifier)
}
