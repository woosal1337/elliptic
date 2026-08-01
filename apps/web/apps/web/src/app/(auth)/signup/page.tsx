"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Label } from "@companyos/ui";
import { Lock, Mail, User } from "lucide-react";
import { useSignup } from "@/hooks/use-auth-queries";
import { OAuthSignIn } from "@/components/auth/oauth-sign-in";

const signupSchema = z.object({
  full_name: z.string().min(2, "Enter your full name"),
  email: z.string().min(1, "Email is required").pipe(z.email("Enter a valid email")),
  password: z.string().min(8, "At least 8 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signup = useSignup();

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { full_name: "", email: searchParams.get("email") ?? "", password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    signup.mutate(values, {
      onSuccess: (result) => {
        const next = searchParams.get("next");
        if (result.verificationRequired) {
          const params = new URLSearchParams({ email: values.email });
          if (next) params.set("next", next);
          router.replace(`/verify-email?${params.toString()}`);
          return;
        }
        const allowed = next && next.startsWith("/invite/");
        router.replace(allowed ? next : "/app");
      },
    });
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h3 text-foreground">Create your account</h1>
        <p className="text-body text-muted-foreground">Set up Elliptic for you and your team in minutes.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            iconLeft={<User />}
            aria-invalid={form.formState.errors.full_name ? true : undefined}
            {...form.register("full_name")}
          />
          {form.formState.errors.full_name ? (
            <p className="text-caption text-danger">{form.formState.errors.full_name.message}</p>
          ) : null}
        </div>
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
            autoComplete="new-password"
            placeholder="At least 8 characters"
            iconLeft={<Lock />}
            aria-invalid={form.formState.errors.password ? true : undefined}
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-caption text-danger">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <Button type="submit" size="lg" loading={signup.isPending} className="mt-1 w-full">
          Create account
        </Button>
      </form>

      <OAuthSignIn />

      <p className="text-center text-small text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent transition-colors hover:text-foreground">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
