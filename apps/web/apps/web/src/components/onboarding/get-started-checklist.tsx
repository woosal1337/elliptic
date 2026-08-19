"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Circle, Rocket, X } from "lucide-react";
import { IconButton } from "@elliptic/ui";
import { useOnboarding } from "@/hooks/use-onboarding-queries";
import { useTranslation } from "@/lib/i18n/i18n-provider";

const STEP_LINK: Record<string, string> = {
  create_project: "/projects",
  create_task: "/projects",
  invite_member: "/settings?tab=members",
  write_note: "/browse",
  connect_ai: "/settings?tab=ai",
};

const DISMISS_KEY = "cos:onboarding-dismissed";

export function GetStartedChecklist({ orgId }: { orgId: string }) {
  const onboarding = useOnboarding(orgId);
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  });

  if (dismissed || !onboarding.data || onboarding.data.complete) return null;

  const { steps, completed, total } = onboarding.data;
  const pct = Math.round((completed / total) * 100);

  const dismiss = () => {
    if (typeof window !== "undefined") window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-accent-muted text-accent">
            <Rocket className="size-4" />
          </span>
          <div className="flex flex-col">
            <h2 className="text-small font-semibold text-foreground">{t("home.getStarted")}</h2>
            <p className="text-caption text-muted-foreground">
              {completed} of {total} done
            </p>
          </div>
        </div>
        <IconButton aria-label="Dismiss checklist" variant="ghost" size="sm" onClick={dismiss}>
          <X className="size-4" />
        </IconButton>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="flex flex-col gap-1">
        {steps.map((step) => (
          <li key={step.key}>
            <Link
              href={`/app/${orgId}${STEP_LINK[step.key] ?? ""}`}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-small transition-colors hover:bg-muted/60"
            >
              {step.done ? (
                <Check className="size-4 shrink-0 text-success" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground" />
              )}
              <span className={step.done ? "text-muted-foreground line-through" : "text-foreground"}>
                {step.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
