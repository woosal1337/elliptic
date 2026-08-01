import * as React from "react";
import { cn } from "../lib/cn";

export interface LogoMarkProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  accent?: boolean;
}

export const LogoMark = React.forwardRef<HTMLImageElement, LogoMarkProps>(
  ({ className, accent: _accent, alt = "Elliptic", ...props }, ref) => (
    <img
      ref={ref}
      src="/logo.png"
      alt={alt}
      draggable={false}
      className={cn("size-6 shrink-0 select-none", className)}
      {...props}
    />
  )
);
LogoMark.displayName = "LogoMark";

export interface LogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  markOnly?: boolean;
  accent?: boolean;
  size?: "sm" | "md" | "lg";
}

const markSize = {
  sm: "size-5",
  md: "size-6",
  lg: "size-7",
} as const;

const wordSize = {
  sm: "text-[0.9375rem]",
  md: "text-body",
  lg: "text-h4",
} as const;

export const Logo = React.forwardRef<HTMLSpanElement, LogoProps>(
  ({ className, markOnly = false, accent = false, size = "md", ...props }, ref) => (
    <span
      ref={ref}
      className={cn("inline-flex items-center gap-2 font-semibold text-foreground", className)}
      {...props}
    >
      <LogoMark accent={accent} className={markSize[size]} />
      {markOnly ? null : (
        <span className={cn("tracking-[-0.02em]", wordSize[size])}>
          Company<span className="text-muted-foreground">OS</span>
        </span>
      )}
    </span>
  )
);
Logo.displayName = "Logo";
