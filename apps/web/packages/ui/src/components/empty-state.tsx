import * as React from "react";
import { cn } from "../lib/cn";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    { className, icon, illustration, title, description, action, secondaryAction, ...props },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        "flex animate-rise-in flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-14 text-center",
        className
      )}
      {...props}
    >
      {illustration ? (
        <div className="mb-4 [&_svg]:size-28 [&_svg]:opacity-80">{illustration}</div>
      ) : icon ? (
        <div className="mb-3 flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground shadow-xs [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="text-small font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-small text-muted-foreground">{description}</p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  )
);
EmptyState.displayName = "EmptyState";
