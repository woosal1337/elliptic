"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label } from "@elliptic/ui";
import { KeyRound } from "lucide-react";
import { useResendVerification, useVerifyEmail } from "@/hooks/use-auth-queries";
import { errorMessage } from "@/lib/api";

const RESEND_COOLDOWN_SECONDS = 30;

const verifySchema = z.object({
  code: z
    .string()
    .min(1, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "Enter the 6-digit code"),
});

type VerifyValues = z.infer<typeof verifySchema>;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verify = useVerifyEmail();
  const resend = useResendVerification();

  const email = searchParams.get("email") ?? "";
  const next = searchParams.get("next");

  const [cooldown, setCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<VerifyValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { code: "" },
  });

  const { ref: codeFieldRef, ...codeField } = form.register("code");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const onSubmit = form.handleSubmit((values) => {
    verify.mutate(
      { email, code: values.code },
      {
        onSuccess: () => {
          const allowed = next && (next.startsWith("/invite/") || next.startsWith("/app"));
          router.replace(allowed ? next : "/app");
        },
      },
    );
  });

  const onResend = () => {
    if (cooldown > 0 || !email) return;
    resend.mutate(
      { email },
      {
        onSuccess: () => setCooldown(RESEND_COOLDOWN_SECONDS),
      },
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h3 text-foreground">Verify your email</h1>
        <p className="text-body text-muted-foreground">
          {email ? `We sent a 6-digit code to ${email}.` : "Enter the 6-digit code we emailed you."}
        </p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Verification code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            iconLeft={<KeyRound />}
            aria-invalid={form.formState.errors.code ? true : undefined}
            {...codeField}
            ref={(element) => {
              codeFieldRef(element);
              inputRef.current = element;
            }}
            onChange={(event) => {
              event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
              if (verify.isError) verify.reset();
              void codeField.onChange(event);
            }}
          />
          {form.formState.errors.code ? (
            <p className="text-caption text-danger">{form.formState.errors.code.message}</p>
          ) : verify.isError ? (
            <p className="text-caption text-danger">{errorMessage(verify.error)}</p>
          ) : null}
        </div>
        <Button type="submit" size="lg" loading={verify.isPending} className="mt-1 w-full">
          Verify
        </Button>
      </form>
      <div className="flex flex-col gap-4">
        <p className="text-center text-small text-muted-foreground">
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0 || resend.isPending || !email}
            className="font-medium text-accent transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-accent"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
        </p>
        <p className="text-center text-small text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-accent transition-colors hover:text-foreground"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
