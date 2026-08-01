"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label, toast } from "@companyos/ui";
import { Lock, Mail } from "lucide-react";
import { useLogin, useResendVerification } from "@/hooks/use-auth-queries";
import { ApiError, api } from "@/lib/api";
import { OAuthSignIn } from "@/components/auth/oauth-sign-in";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").pipe(z.email("Enter a valid email")),
  password: z.string().min(1, "Password is required"),
  code: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const resend = useResendVerification();
  const [twoFactor, setTwoFactor] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: searchParams.get("email") ?? "", password: "", code: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(
      { email: values.email, password: values.password, code: values.code || undefined },
      {
      onSuccess: (result) => {
        if (result.two_factor_required) {
          setTwoFactor(true);
          return;
        }
        const next = searchParams.get("next");
        const allowed =
          next &&
          (next.startsWith("/app") ||
            next.startsWith("/authorize") ||
            next.startsWith("/invite/"));
        router.replace(allowed ? next : "/app");
      },
      onError: (error) => {
        const status = error instanceof ApiError ? error.status : 0;
        const notVerified =
          status === 403 || error.message.toLowerCase().includes("not verified");
        if (!notVerified) return;
        resend.mutate({ email: values.email });
        const next = searchParams.get("next");
        const params = new URLSearchParams({ email: values.email });
        if (next) params.set("next", next);
        router.replace(`/verify-email?${params.toString()}`);
      },
    });
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h3 text-foreground">Welcome back</h1>
        <p className="text-body text-muted-foreground">Sign in to your Elliptic account to continue.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            iconLeft={<Mail />}
            aria-invalid={form.formState.errors.email ? true : undefined}
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <p className="text-caption text-danger">{form.formState.errors.email.message}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            iconLeft={<Lock />}
            aria-invalid={form.formState.errors.password ? true : undefined}
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-caption text-danger">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        {twoFactor ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="code">Two-factor code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code from your authenticator"
              autoFocus
              {...form.register("code")}
            />
            <p className="text-caption text-muted-foreground">
              Enter the current code from your authenticator app.
            </p>
          </div>
        ) : null}
        <Button type="submit" size="lg" loading={login.isPending} className="mt-1 w-full">
          {twoFactor ? "Verify" : "Sign in"}
        </Button>
      </form>

      <OAuthSignIn />
      <SsoSignIn />

      <p className="text-center text-small text-muted-foreground">
        No account yet?{" "}
        <Link href="/signup" className="font-medium text-accent transition-colors hover:text-foreground">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}


function SsoSignIn() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);

  const start = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    try {
      const result = await api.get<{ authorization_url: string }>(
        `/api/v1/auth/sso/start?domain=${encodeURIComponent(domain.trim())}`
      );
      window.location.assign(result.authorization_url);
    } catch {
      toast.error("No SSO is configured for that domain");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-5">
      <span className="text-caption text-muted-foreground">Single sign-on</span>
      <div className="flex items-center gap-2">
        <Input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="your-company.com"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void start();
            }
          }}
        />
        <Button type="button" variant="outline" loading={loading} onClick={() => void start()}>
          Continue with SSO
        </Button>
      </div>
    </div>
  );
}



