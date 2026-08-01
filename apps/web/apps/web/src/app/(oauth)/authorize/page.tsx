"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
} from "@companyos/ui";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import {
  useConsentContext,
  useConsentDecision,
  type ConsentContext,
  type ConsentScope,
} from "@/hooks/use-oauth-queries";

type Outcome =
  | { kind: "allowed"; redirectTo: string; clientName: string; orgName: string }
  | { kind: "denied"; redirectTo: string; clientName: string };

function StatusCard({
  icon,
  tone,
  title,
  children,
  action,
}: {
  icon: React.ReactNode;
  tone: "neutral" | "success" | "danger";
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const ring =
    tone === "success"
      ? "border-success/30 bg-success-muted text-success"
      : tone === "danger"
        ? "border-danger/30 bg-danger-muted text-danger"
        : "border-border bg-canvas text-muted-foreground";
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <span className={`flex size-12 items-center justify-center rounded-full border ${ring}`}>
          {icon}
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-h3 font-semibold text-foreground">{title}</h1>
          {children ? (
            <p className="text-small leading-relaxed text-muted-foreground">{children}</p>
          ) : null}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function ResultView({ outcome }: { outcome: Outcome }) {
  useEffect(() => {
    const timer = setTimeout(() => window.location.assign(outcome.redirectTo), 1500);
    return () => clearTimeout(timer);
  }, [outcome.redirectTo]);

  if (outcome.kind === "allowed") {
    return (
      <StatusCard
        tone="success"
        icon={<CheckCircle2 className="size-6" aria-hidden="true" />}
        title="Connected"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.assign(outcome.redirectTo)}
          >
            Return to {outcome.clientName}
          </Button>
        }
      >
        {outcome.clientName} can now act on your{" "}
        <strong className="text-foreground">{outcome.orgName}</strong> workspace. Returning you to{" "}
        {outcome.clientName}…
      </StatusCard>
    );
  }
  return (
    <StatusCard
      tone="danger"
      icon={<ShieldX className="size-6" aria-hidden="true" />}
      title="Access declined"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.assign(outcome.redirectTo)}
        >
          Return to {outcome.clientName}
        </Button>
      }
    >
      {outcome.clientName} was not granted access to your Elliptic data. You can safely close this
      window.
    </StatusCard>
  );
}

const ALL_ORGS = "__all__";

function ConsentView({
  context,
  onDecided,
}: {
  context: ConsentContext;
  onDecided: (outcome: Outcome) => void;
}) {
  const decision = useConsentDecision();
  const [orgId, setOrgId] = useState(context.orgs[0]?.id ?? "");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(context.scopes.filter((s) => s.baseline).map((s) => s.scope)),
  );
  const [root, setRoot] = useState(false);

  const allScopeKeys = useMemo(() => context.scopes.map((s) => s.scope), [context.scopes]);
  const effectiveSelected = useMemo(
    () => (root ? new Set(allScopeKeys) : selected),
    [root, allScopeKeys, selected],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, ConsentScope[]>();
    for (const scope of context.scopes) {
      const list = map.get(scope.domain) ?? [];
      list.push(scope);
      map.set(scope.domain, list);
    }
    return Array.from(map.entries());
  }, [context.scopes]);

  function toggle(scope: ConsentScope, checked: boolean) {
    if (scope.baseline || root) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(scope.scope);
      else next.delete(scope.scope);
      return next;
    });
  }

  function submit(kind: "allow" | "deny") {
    const allOrgs = orgId === ALL_ORGS;
    decision.mutate(
      {
        request_id: context.request_id,
        decision: kind,
        org_id: allOrgs ? undefined : orgId,
        all_orgs: allOrgs,
        scopes: Array.from(effectiveSelected),
      },
      {
        onSuccess: (result) => {
          const orgName = allOrgs
            ? "all your organizations"
            : (context.orgs.find((o) => o.id === orgId)?.name ?? "your");
          onDecided(
            kind === "allow"
              ? {
                  kind: "allowed",
                  redirectTo: result.redirect_to,
                  clientName: context.client_name,
                  orgName,
                }
              : {
                  kind: "denied",
                  redirectTo: result.redirect_to,
                  clientName: context.client_name,
                },
          );
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <CardTitle className="font-display text-h3">
          {context.client_name} wants to connect to your Elliptic brain
        </CardTitle>
        {context.client_unverified ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-muted px-3 py-2 text-caption text-muted-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              This app self-registered and has not been verified by Elliptic. Only continue if you
              started this connection.
            </span>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-small font-medium text-foreground">Workspace</span>
          <Select value={orgId} onValueChange={setOrgId}>
            <SelectTrigger aria-label="Workspace">
              <SelectValue placeholder="Choose a workspace" />
            </SelectTrigger>
            <SelectContent>
              {context.can_grant_all_orgs ? (
                <SelectItem value={ALL_ORGS}>All my organizations</SelectItem>
              ) : null}
              {context.orgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-caption text-muted-foreground">
            {orgId === ALL_ORGS
              ? "The AI will get access to every organization you belong to, and can create new ones."
              : "The AI will get access to everything you can reach in this workspace."}
          </p>
        </div>

        <label
          htmlFor="root-admin"
          className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-small transition-colors ${
            root
              ? "border-warning/40 bg-warning-muted"
              : "border-border bg-canvas hover:border-border-strong"
          }`}
        >
          <Checkbox
            id="root-admin"
            checked={root}
            onCheckedChange={(value) => setRoot(value === true)}
          />
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="size-4 text-warning" aria-hidden="true" />
              Root / Admin — full access
            </span>
            <span className="text-caption text-muted-foreground">
              Grants every permission below and selects them all. While this is on, the individual
              permissions lock and can&apos;t be unchecked.
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-3">
          <span className="text-small font-medium text-foreground">
            {context.client_name} will be able to:
          </span>
          {grouped.map(([domain, scopes]) => (
            <div key={domain} className="flex flex-col gap-2">
              {scopes.map((scope) => (
                <label
                  key={scope.scope}
                  htmlFor={scope.scope}
                  className={`flex items-start gap-3 text-small ${
                    root ? "opacity-70" : ""
                  }`}
                >
                  <Checkbox
                    id={scope.scope}
                    checked={effectiveSelected.has(scope.scope)}
                    disabled={scope.baseline || root}
                    onCheckedChange={(value) => toggle(scope, value === true)}
                  />
                  <span className="flex flex-col">
                    <span className="text-foreground">
                      {scope.domain} — {scope.label}
                    </span>
                    {scope.baseline ? (
                      <span className="text-caption text-muted-foreground">Always on</span>
                    ) : scope.elevated ? (
                      <span className="text-caption text-warning">Elevated</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => submit("deny")}
            disabled={decision.isPending}
          >
            Decline
          </Button>
          <Button
            className="flex-1"
            onClick={() => submit("allow")}
            loading={decision.isPending}
            disabled={!orgId}
          >
            Allow access
          </Button>
        </div>
        {decision.isError ? (
          <p className="text-center text-caption text-danger">
            Something went wrong saving your choice. Please try again.
          </p>
        ) : null}
        <p className="flex items-center justify-center gap-1.5 text-caption text-muted-foreground">
          <Lock className="size-3" aria-hidden="true" /> Elliptic will never share your password
          with {context.client_name}.
        </p>
      </CardContent>
    </Card>
  );
}

function AuthorizeInner() {
  const params = useSearchParams();
  const requestId = params.get("request_id") ?? "";
  const query = useConsentContext(requestId);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  if (outcome) return <ResultView outcome={outcome} />;

  if (!requestId) {
    return (
      <StatusCard
        tone="neutral"
        icon={<AlertCircle className="size-6 text-muted-foreground" aria-hidden="true" />}
        title="Nothing to authorize"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/app">Go to Elliptic</Link>
          </Button>
        }
      >
        This page opens automatically when an app asks to connect to your Elliptic brain. There is
        no pending request to review.
      </StatusCard>
    );
  }
  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <StatusCard
        tone="neutral"
        icon={<Clock className="size-6 text-muted-foreground" aria-hidden="true" />}
        title="Request expired"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/app">Go to Elliptic</Link>
          </Button>
        }
      >
        This authorization request is invalid or has expired. Start the connection again from your
        app.
      </StatusCard>
    );
  }
  return <ConsentView context={query.data} onDecided={setOutcome} />;
}

export default function AuthorizePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      }
    >
      <AuthorizeInner />
    </Suspense>
  );
}
