"use client";

import { useState } from "react";
import { Button, toast } from "@companyos/ui";
import { api } from "@/lib/api";
import { usePublicProviders } from "@/hooks/use-auth-provider-queries";
import { OAUTH_NEXT_KEY, type OAuthProvider } from "@/lib/oauth";

type Provider = OAuthProvider;

/** Google's 4-colour "G" mark. The Button sizes any child svg to 16px; the
 *  hard-coded fills keep it in colour regardless of the button's text colour. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** GitHub mark in a single colour, inheriting the button's text colour. */
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

/**
 * One-click sign-in / sign-up buttons for the configured social providers.
 * Renders nothing until at least one provider is enabled on the instance
 * (gated by GET /auth/providers). Both login and signup share this — the same
 * OAuth start endpoint both authenticates a returning user and JIT-provisions a
 * new one, so the wording ("Continue with …") suits either screen. Sizing
 * (size="lg", full width) mirrors the primary email/password submit button so
 * the buttons line up; the outline variant marks them as the secondary path.
 */
export function OAuthSignIn() {
  const providers = usePublicProviders();
  const [loading, setLoading] = useState<Provider | null>(null);

  const start = async (provider: Provider) => {
    setLoading(provider);
    try {
      // Carry the intended destination across the round-trip to the provider so
      // the callback can return the user to where they were headed.
      const next = new URLSearchParams(window.location.search).get("next");
      try {
        if (next) window.sessionStorage.setItem(OAUTH_NEXT_KEY, next);
        else window.sessionStorage.removeItem(OAUTH_NEXT_KEY);
      } catch {
        // sessionStorage may be unavailable (private mode); the callback
        // falls back to /app.
      }
      const result = await api.get<{ authorization_url: string }>(
        `/api/v1/auth/oauth/${provider}/start`
      );
      window.location.assign(result.authorization_url);
    } catch {
      toast.error(`${provider} sign-in is unavailable`);
      setLoading(null);
    }
  };

  if (!providers.data?.google && !providers.data?.github) return null;

  return (
    <div className="flex flex-col gap-2">
      {providers.data?.google ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          iconLeft={<GoogleIcon />}
          loading={loading === "google"}
          onClick={() => void start("google")}
        >
          Continue with Google
        </Button>
      ) : null}
      {providers.data?.github ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full"
          iconLeft={<GitHubIcon />}
          loading={loading === "github"}
          onClick={() => void start("github")}
        >
          Continue with GitHub
        </Button>
      ) : null}
    </div>
  );
}
