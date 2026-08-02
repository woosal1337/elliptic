import * as React from "react";
import { cn } from "../lib/cn";

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode;
  /**
   * Only for a line that says something the title does not — a count, a filter,
   * a state. "Organization configuration." under "Settings" is not that.
   */
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * The title row of a product page.
 *
 * Deliberately plain: a workspace tool is somewhere people are working, not a
 * landing page, so there is no eyebrow and no standing tagline. What earns the
 * space is the page's name and the controls that act on it.
 */
export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, actions, children, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="font-display text-h4 font-semibold tracking-[-0.01em] text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="text-caption text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
);
PageHeader.displayName = "PageHeader";
