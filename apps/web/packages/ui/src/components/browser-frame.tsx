import * as React from "react";
import { cn } from "../lib/cn";

export interface BrowserFrameProps extends React.HTMLAttributes<HTMLDivElement> {
  url?: string;
  hideDots?: boolean;
  bodyClassName?: string;
}

export const BrowserFrame = React.forwardRef<HTMLDivElement, BrowserFrameProps>(
  ({ className, url = "app.elliptic.com", hideDots = false, bodyClassName, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-surface shadow-lg",
        className
      )}
      {...props}
    >
      <div className="flex h-10 items-center gap-3 border-b border-border bg-muted/60 px-4">
        {hideDots ? null : (
          <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-border-strong" />
            <span className="size-2.5 rounded-full bg-border-strong" />
            <span className="size-2.5 rounded-full bg-border-strong" />
          </div>
        )}
        <div className="mx-auto flex h-6 w-full max-w-xs items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-3 text-muted-foreground">
            <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M8 11V8a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="truncate text-caption text-muted-foreground">{url}</span>
        </div>
      </div>
      <div className={cn("bg-background", bodyClassName)}>{children}</div>
    </div>
  )
);
BrowserFrame.displayName = "BrowserFrame";
