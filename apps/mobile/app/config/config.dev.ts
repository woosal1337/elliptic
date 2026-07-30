/**
 * These are configuration settings for the dev environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
export default {
  // Dev builds hit production unless EXPO_PUBLIC_API_URL points elsewhere
  // (e.g. a local `docker compose up api` on http://localhost:8000/api/v1).
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://api-company.chele.bi/api/v1",
}
