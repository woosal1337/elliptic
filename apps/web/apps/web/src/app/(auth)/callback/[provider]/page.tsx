"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button, Spinner } from "@companyos/ui";
import { ShieldX } from "lucide-react";
import { api, errorMessage } from "@/lib/api";
import { OAUTH_NEXT_KEY, OAUTH_PROVIDER_LABELS, isOAuthProvider, safeOAuthNext } from "@/lib/oauth";

/**
 * Landing page for the Google / GitHub redirect (`GOOGLE_REDIRECT_URI` points
 * here). The provider sends the browser back with `?code&state`; we hand those
 * to the backend callback, which verifies the state, JIT-provisions the user,
 * and sets the session cookies on this origin. Then we forward to the app.
 *
 * The exchange runs exactly once — the authorization code is single-use, so a
 * second call (React strict-mode double effect, a refresh) would fail. A ref
 * guard makes that safe.
 */
function CallbackInner() {
  const params = useParams<{ provider: string }>();
  const search = useSearchParams();
  const provider = String(params.provider ?? "");
  const label = isOAuthProvider(provider) ? OAUTH_PROVIDER_LABELS[provider] : "your provider";
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const oauthError = search.get("error");
    const code = search.get("code");
    const state = search.get("state");

    if (!isOAuthProvider(provider)) {
      setError("That sign-in provider isn't supported.");
      return;
    }
    if (oauthError) {
      setError(
        oauthError === "access_denied"
          ? `You declined the ${label} sign-in request.`
          : `${label} sign-in didn't complete. Please try again.`,
      );
      return;
    }
    if (!code || !state) {
      setError("This sign-in link is missing information. Start again from the sign-in page.");
      return;
    }

    void (async () => {
      try {
        await api.get(
          `/api/v1/auth/oauth/${provider}/callback?code=${encodeURIComponent(code)}` +
            `&state=${encodeURIComponent(state)}`,
        );
        let next = "/app";
        try {
          next = safeOAuthNext(window.sessionStorage.getItem(OAUTH_NEXT_KEY));
          window.sessionStorage.removeItem(OAUTH_NEXT_KEY);
        } catch {
          // sessionStorage may be unavailable (private mode); fall back to /app.
        }
        // Full navigation so the middleware re-runs with the fresh session cookie.
        window.location.assign(next);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    })();
  }, [provider, label, search]);

  if (error) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-12 items-center justify-center rounded-full border border-danger/30 bg-danger-muted text-danger">
            <ShieldX className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-h3 text-foreground">Couldn&apos;t sign you in</h1>
            <p className="text-body text-muted-foreground">{error}</p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <Spinner />
      <p className="text-body text-muted-foreground">Completing your {label} sign-in…</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
