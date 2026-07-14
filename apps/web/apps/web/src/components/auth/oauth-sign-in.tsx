"use client";

import { useState } from "react";
import { Button, toast } from "@companyos/ui";
import { api } from "@/lib/api";
import { usePublicProviders } from "@/hooks/use-auth-provider-queries";

type Provider = "google" | "github";

/**
 * One-click sign-in / sign-up buttons for the configured social providers.
 * Renders nothing until at least one provider is enabled on the instance
 * (gated by GET /auth/providers). Both login and signup share this — the same
 * OAuth start endpoint both authenticates a returning user and JIT-provisions a
 * new one, so the wording ("Continue with …") suits either screen.
 */
export function OAuthSignIn() {
  const providers = usePublicProviders();
  const [loading, setLoading] = useState<Provider | null>(null);

  const start = async (provider: Provider) => {
    setLoading(provider);
    try {
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
          loading={loading === "github"}
          onClick={() => void start("github")}
        >
          Continue with GitHub
        </Button>
      ) : null}
    </div>
  );
}
