/**
 * Shared helpers for the social sign-in round-trip (Google / GitHub).
 *
 * The provider redirect leaves our origin and comes back to the callback page,
 * so the intended post-login destination can't ride along in React state. We
 * stash it in sessionStorage (survives the same-tab navigation to the provider
 * and back) and read it out again on the callback.
 */

/** sessionStorage key holding the post-login destination across the OAuth hop. */
export const OAUTH_NEXT_KEY = "companyos.oauth.next";

/** Sign-in providers the instance can be configured to offer. */
export type OAuthProvider = "google" | "github";

export const OAUTH_PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

export function isOAuthProvider(value: string): value is OAuthProvider {
  return value === "google" || value === "github";
}

/**
 * Constrain the post-login redirect to internal app deep-links, never an
 * external URL — the value originates from a query string, so an unchecked
 * redirect would be an open-redirect. Mirrors the allowlist the login form
 * applies on password sign-in.
 */
export function safeOAuthNext(value: string | null | undefined): string {
  if (
    value &&
    (value.startsWith("/app") || value.startsWith("/authorize") || value.startsWith("/invite/"))
  ) {
    return value;
  }
  return "/app";
}
