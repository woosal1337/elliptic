"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Skeleton } from "@elliptic/ui";
import { AlertTriangle, ArrowRight, Mail } from "lucide-react";
import { useAcceptInvite, useInvitePreview, useMe } from "@/hooks/use-auth-queries";
import { setLastOrgId } from "@/lib/storage";

const ROLE_LABEL: Record<string, string> = {
  owner: "an owner",
  admin: "an admin",
  member: "a member",
};

const TERMINAL_COPY: Record<string, { title: string; body: string }> = {
  expired: {
    title: "This invite has expired",
    body: "Invitations are valid for a limited time. Ask an admin to send you a new one.",
  },
  revoked: {
    title: "This invite was revoked",
    body: "This invitation is no longer valid. Ask an admin to send you a new one.",
  },
  accepted: {
    title: "This invite was already used",
    body: "It has already been accepted. Sign in to access the organization.",
  },
};

function Notice({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <span className="grid size-11 place-items-center rounded-lg border border-border bg-muted text-muted-foreground">
          <AlertTriangle className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h3 text-foreground">{title}</h1>
          <p className="text-body text-muted-foreground">{body}</p>
        </div>
      </div>
      {children}
      <p className="text-center text-small text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-accent transition-colors hover:text-foreground"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const accept = useAcceptInvite();
  const me = useMe();
  const preview = useInvitePreview(params.token);

  const data = preview.data;
  const acceptable = data?.acceptable ?? false;
  const emailMatches =
    !!me.data && !!data && me.data.email.toLowerCase() === data.email.toLowerCase();

  const acceptInvite = () =>
    accept.mutate(params.token, {
      onSuccess: (org) => {
        setLastOrgId(org.id);
        router.replace(`/app/${org.id}/projects`);
      },
    });

  const autoAccepted = useRef(false);
  useEffect(() => {
    if (autoAccepted.current) return;
    if (acceptable && emailMatches && !accept.isPending && !accept.isError) {
      autoAccepted.current = true;
      acceptInvite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptable, emailMatches]);

  if (preview.isPending || me.isPending) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Skeleton className="size-11 rounded-lg" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-5 w-full" />
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    );
  }

  if (preview.isError || !data) {
    return (
      <Notice
        title="This invite link is invalid"
        body="The link may be mistyped or no longer exist. Check the link your admin sent, or ask for a new invitation."
      />
    );
  }

  if (!acceptable) {
    const copy = TERMINAL_COPY[data.status] ?? {
      title: "This invite isn't valid",
      body: "Ask an admin to send you a new invitation.",
    };
    return <Notice title={copy.title} body={copy.body} />;
  }

  const role = ROLE_LABEL[data.role] ?? "a member";
  const nextParam = `?next=${encodeURIComponent(`/invite/${params.token}`)}&email=${encodeURIComponent(data.email)}`;

  if (me.data && !emailMatches) {
    return (
      <Notice
        title={`Join ${data.org_name}`}
        body={`This invite is for ${data.email}, but you're signed in as ${me.data.email}. Sign in with the invited address to accept it.`}
      >
        <Button asChild size="lg" className="w-full">
          <Link href={`/login${nextParam}`}>
            Sign in as {data.email}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </Notice>
    );
  }

  if (me.data && emailMatches) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <span className="grid size-11 place-items-center rounded-lg border border-accent-subtle bg-accent-muted text-accent">
            <Mail className="size-5" />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-h3 text-foreground">Join {data.org_name}</h1>
            <p className="text-body text-muted-foreground">
              You&apos;ve been invited to join{" "}
              <span className="text-foreground">{data.org_name}</span> as {role}.
            </p>
          </div>
        </div>

        {accept.isError ? (
          <>
            <div className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-muted px-3.5 py-3 text-small text-danger">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                This invite could not be accepted — you may already be a member. Try opening the
                organization directly.
              </span>
            </div>
            <Button asChild size="lg" className="w-full">
              <Link href={`/app/${data.org_id}/projects`}>
                Go to {data.org_name}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        ) : (
          <Button loading disabled size="lg" className="w-full">
            Joining {data.org_name}…
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <span className="grid size-11 place-items-center rounded-lg border border-accent-subtle bg-accent-muted text-accent">
          <Mail className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-h3 text-foreground">Join {data.org_name}</h1>
          <p className="text-body text-muted-foreground">
            You&apos;ve been invited to join{" "}
            <span className="text-foreground">{data.org_name}</span> as {role}. Continue with{" "}
            <span className="text-foreground">{data.email}</span> to accept.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button asChild size="lg" className="w-full">
          <Link href={`/signup${nextParam}`}>
            Create your account
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="w-full">
          <Link href={`/login${nextParam}`}>I already have an account</Link>
        </Button>
      </div>

      <p className="text-center text-small text-muted-foreground">
        You&apos;ll join the organization right after signing in.
      </p>
    </div>
  );
}
